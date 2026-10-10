/**
 * Background Service Worker: Stateless, event-driven Manifest V3 worker.
 * Handles install/migrations, messaging routing, context menus, and keyboard shortcuts.
 */

import { SnippetStore } from '../data/store';
import { TemplateResolver } from '../core/resolver';

// 1. Install & Update Lifecycle
chrome.runtime.onInstalled.addListener(async (details) => {
  await SnippetStore.init();

  // Create context menus
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'snippo-open-manager',
      title: 'Open Snippo Workspace',
      contexts: ['action'],
    });

    chrome.contextMenus.create({
      id: 'snippo-create-from-selection',
      title: 'Save selection as Snippet...',
      contexts: ['selection'],
    });
  });

  if (details.reason === 'install') {
    // Open onboarding page on first install
    const onboardingUrl = chrome.runtime.getURL('ui/onboarding/index.html');
    chrome.tabs.create({ url: onboardingUrl });
  }

  // Inject content script into already open tabs so users don't need to manually reload pages
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ['content/entry.js'],
          })
          .catch(() => {});
      }
    }
  } catch {
    // Ignore injection errors on system tabs
  }
});

// 2. Context Menu Handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'snippo-open-manager') {
    openManagerPage();
  } else if (info.menuItemId === 'snippo-create-from-selection' && info.selectionText) {
    const text = encodeURIComponent(info.selectionText);
    const managerUrl = chrome.runtime.getURL(`ui/manager/index.html?prefill=${text}`);
    chrome.tabs.create({ url: managerUrl });
  }
});

// 3. Keyboard Commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-manager') {
    openManagerPage();
  }
});

// 4. Omnibox Address Bar Integration (type 's' + Space in URL bar)
chrome.omnibox.setDefaultSuggestion({
  description: 'Snippo: Type a trigger (e.g. <match>omw</match> or <match>date</match>) to expand',
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const query = text.trim().toLowerCase();
  const snippets = await SnippetStore.getAllSnippets();
  const matched = snippets.filter((s) => {
    const cleanTrig = s.trigger.replace(/^[\/;!]/, '').toLowerCase();
    const fullTrig = s.trigger.toLowerCase();
    return cleanTrig.includes(query) || fullTrig.includes(query) || (s.description && s.description.toLowerCase().includes(query));
  });

  const suggestions = matched.slice(0, 5).map((s) => {
    const cleanBody = s.body.replace(/\n/g, ' ').slice(0, 60);
    return {
      content: s.trigger,
      description: `<match>${escapeXml(s.trigger)}</match> → <url>${escapeXml(cleanBody)}</url> <dim>(${escapeXml(s.folder || 'Snippet')})</dim>`,
    };
  });

  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const snippets = await SnippetStore.getAllSnippets();
  const query = text.trim().toLowerCase();
  const snip = snippets.find(
    (s) =>
      s.trigger.toLowerCase() === query ||
      s.trigger.toLowerCase() === ('/' + query) ||
      s.trigger.replace(/^[\/;!]/, '').toLowerCase() === query
  );

  const rawBody = snip ? snip.body : text;
  const resolved = TemplateResolver.resolve(rawBody);
  const finalText = resolved.text;

  // If the expansion is a web URL, navigate directly!
  if (finalText.startsWith('http://') || finalText.startsWith('https://')) {
    if (disposition === 'currentTab') {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        await chrome.tabs.update(activeTab.id, { url: finalText });
      }
    } else {
      await chrome.tabs.create({ url: finalText, active: disposition === 'newForegroundTab' });
    }
  } else {
    // If it's text, copy it to the clipboard using active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      chrome.scripting
        .executeScript({
          target: { tabId: activeTab.id },
          func: (txt: string) => {
            navigator.clipboard.writeText(txt).catch(() => {});
          },
          args: [finalText],
        })
        .catch(() => {
          // Fallback: search Google with the expanded text if on an unscriptable page
          if (activeTab.id) {
            chrome.tabs.update(activeTab.id, {
              url: `https://www.google.com/search?q=${encodeURIComponent(finalText)}`,
            });
          }
        });
    }
  }
});

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// 4. Runtime Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Must return true to keep the async message channel open
  (async () => {
    try {
      const type = message?.type;
      const payload = message?.payload;

      switch (type) {
        case 'GET_TRIGGER_INDEX': {
          const index = await SnippetStore.getTriggerIndex();
          sendResponse({ success: true, data: index });
          break;
        }

        case 'EXPAND_TRIGGER': {
          const { snippetId } = payload || {};
          const snippet = await SnippetStore.getSnippetById(snippetId);
          if (snippet) {
            await SnippetStore.recordUsage(snippetId);
            sendResponse({ success: true, data: snippet });
          } else {
            sendResponse({ success: false, error: 'Snippet not found' });
          }
          break;
        }

        case 'GET_SNIPPET': {
          const { id } = payload || {};
          const snippet = await SnippetStore.getSnippetById(id);
          sendResponse({ success: true, data: snippet });
          break;
        }

        case 'GET_ALL_SNIPPETS': {
          const list = await SnippetStore.getAllSnippets();
          sendResponse({ success: true, data: list });
          break;
        }

        case 'GET_SETTINGS': {
          const settings = await SnippetStore.getSettings();
          sendResponse({ success: true, data: settings });
          break;
        }

        case 'TOGGLE_SITE_EXCLUSION': {
          const { domain } = payload || {};
          const newState = await SnippetStore.toggleDomainExclusion(domain);
          // Broadcast to tabs so content scripts instantly react
          broadcastUpdate('SETTINGS_UPDATED');
          sendResponse({ success: true, data: { isExcluded: newState } });
          break;
        }

        case 'CHECK_SITE_EXCLUSION': {
          const { domain } = payload || {};
          const isExcluded = await SnippetStore.isDomainExcluded(domain);
          sendResponse({ success: true, data: { isExcluded } });
          break;
        }

        case 'OPEN_MANAGER': {
          openManagerPage(payload?.snippetId);
          sendResponse({ success: true });
          break;
        }

        case 'SNIPPETS_UPDATED': {
          broadcastUpdate('SNIPPETS_UPDATED');
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type: ' + type });
          break;
      }
    } catch (err: any) {
      sendResponse({ success: false, error: err?.message || 'Worker processing error' });
    }
  })();

  return true; // Keeps async response channel open
});

/**
 * Opens or focuses the Manager workspace tab.
 */
async function openManagerPage(snippetId?: string): Promise<void> {
  const managerUrl = chrome.runtime.getURL('ui/manager/index.html');
  const targetUrl = snippetId ? `${managerUrl}#${snippetId}` : managerUrl;

  const tabs = await chrome.tabs.query({ url: managerUrl + '*' });
  if (tabs.length > 0 && tabs[0].id) {
    await chrome.tabs.update(tabs[0].id, { active: true, url: targetUrl });
    if (tabs[0].windowId) {
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: targetUrl });
  }
}

/**
 * Broadcasts events to all active tabs.
 */
async function broadcastUpdate(type: string): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type }).catch(() => {
          // Tab may not have content script
        });
      }
    }
  } catch {
    // Ignore query failure
  }
}
