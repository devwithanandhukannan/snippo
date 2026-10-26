/**
 * Popup Controller: Fast search, tab site pause toggle, and snippet launcher.
 * Budget: Open to interactive in < 100ms.
 */

import { Snippet } from '../../core/types';
import { SnippetStore } from '../../data/store';
import { TriggerMatcher } from '../../core/matcher';
import { TemplateResolver } from '../../core/resolver';

class PopupController {
  private snippets: Snippet[] = [];
  private currentHostname = '';
  private matcher: TriggerMatcher = new TriggerMatcher();

  public async init(): Promise<void> {
    await SnippetStore.init();
    // Auto-heal: Ensure global enabled is true so snippets are never blocked
    const settings = await SnippetStore.getSettings();
    if (settings.enabled === false) {
      await SnippetStore.updateSettings({ enabled: true });
    }
    await this.resolveCurrentTab();
    await this.loadData();
    this.bindEvents();
  }

  private async resolveCurrentTab(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
          const url = new URL(tab.url);
          // Only track hostname for standard web pages (exclude chrome-extension://, chrome://, etc.)
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            this.currentHostname = url.hostname;
          }
        }
      } catch {
        // Fallback or restricted url (chrome://)
      }
    }

    const siteStatusEl = document.getElementById('site-status-text');
    const toggleEl = document.getElementById('site-toggle') as HTMLInputElement;

    let isPaused = false;
    if (this.currentHostname) {
      isPaused = await SnippetStore.isDomainExcluded(this.currentHostname);
    } else {
      const settings = await SnippetStore.getSettings();
      isPaused = settings.enabled === false;
    }

    if (toggleEl) toggleEl.checked = !isPaused;
    if (siteStatusEl) {
      siteStatusEl.textContent = isPaused ? 'Paused' : 'Active';
      siteStatusEl.title = isPaused
        ? (this.currentHostname ? `Paused on ${this.currentHostname}` : 'Paused')
        : (this.currentHostname ? `Active on ${this.currentHostname}` : 'Active');
    }
  }

  private async loadData(): Promise<void> {
    this.snippets = await SnippetStore.getAllSnippets();
    const index = await SnippetStore.getTriggerIndex();
    this.matcher.updateIndex(index);
    this.renderList(this.snippets);
  }

  private renderList(list: Snippet[]): void {
    const container = document.getElementById('snippets-list');
    const countBadge = document.getElementById('snippet-count-badge');
    const emptyState = document.getElementById('empty-state');

    if (!container) return;
    if (countBadge) countBadge.textContent = String(list.length);

    // Clear previous items except empty state
    container.querySelectorAll('.snippet-card').forEach((el) => el.remove());

    if (list.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    list.slice(0, 30).forEach((snip) => {
      const card = document.createElement('div');
      card.className = 'snippet-card';
      card.setAttribute('data-id', snip.id);
      card.setAttribute('title', 'Click to insert into active tab or copy');

      card.innerHTML = `
        <div class="snippet-card-top">
          <span class="badge-trigger">${this.escapeHtml(snip.trigger)}</span>
          <div class="snippet-meta">
            <span class="badge-folder">${this.escapeHtml(snip.folder || 'General')}</span>
            ${snip.usageCount ? `<span class="badge-count">${snip.usageCount}×</span>` : ''}
            <button class="btn-card-edit" title="Edit snippet in Workspace" data-edit-id="${snip.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="snippet-card-body">${this.escapeHtml(snip.body.replace(/\n/g, ' '))}</div>
      `;

      // Edit button handler
      const editBtn = card.querySelector('.btn-card-edit');
      editBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openManager(snip.id);
      });

      // Card click inserts into active tab or copies to clipboard
      card.addEventListener('click', async () => {
        const resolved = TemplateResolver.resolve(snip.body);
        let inserted = false;

        // Try inserting into active tab
        if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
              await chrome.tabs.sendMessage(tab.id, {
                type: 'INSERT_SNIPPET',
                payload: { snippet: snip },
              });
              inserted = true;
            }
          } catch {}
        }

        // Copy to clipboard fallback / companion
        try {
          await navigator.clipboard.writeText(resolved.text);
        } catch {}

        await SnippetStore.recordUsage(snip.id);

        // Visual feedback
        const triggerBadge = card.querySelector('.badge-trigger');
        if (triggerBadge) {
          const oldText = triggerBadge.textContent;
          triggerBadge.textContent = inserted ? '✓ Inserted' : '✓ Copied';
          setTimeout(() => {
            triggerBadge.textContent = oldText;
            window.close();
          }, 400);
        } else {
          window.close();
        }
      });

      container.appendChild(card);
    });
  }

  private bindEvents(): void {
    // Search input
    const searchInput = document.getElementById('popup-search') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      if (!query) {
        this.renderList(this.snippets);
        return;
      }
      const filtered = this.snippets.filter(
        (s) =>
          s.trigger.toLowerCase().includes(query) ||
          s.body.toLowerCase().includes(query) ||
          (s.description && s.description.toLowerCase().includes(query)) ||
          (s.folder && s.folder.toLowerCase().includes(query))
      );
      this.renderList(filtered);
    });

    // Site toggle
    const toggle = document.getElementById('site-toggle') as HTMLInputElement;
    toggle?.addEventListener('change', async () => {
      const isPaused = !toggle.checked;
      const statusEl = document.getElementById('site-status-text');

      if (this.currentHostname) {
        // Only toggle exclusion for the specific site! Never disable globally!
        const isExcluded = await SnippetStore.isDomainExcluded(this.currentHostname);
        if (isPaused && !isExcluded) {
          await SnippetStore.toggleDomainExclusion(this.currentHostname);
        } else if (!isPaused && isExcluded) {
          await SnippetStore.toggleDomainExclusion(this.currentHostname);
        }
        await SnippetStore.updateSettings({ enabled: true });
      } else {
        await SnippetStore.updateSettings({ enabled: !isPaused });
      }

      if (statusEl) {
        statusEl.textContent = isPaused ? 'Paused' : 'Active';
        if (this.currentHostname) {
          statusEl.title = isPaused
            ? `Paused on ${this.currentHostname}`
            : `Active on ${this.currentHostname}`;
        }
      }

      // Broadcast update to worker and all active tabs
      try {
        if (typeof chrome !== 'undefined') {
          chrome.runtime?.sendMessage?.({ type: 'SETTINGS_UPDATED' }).catch?.(() => {});
          if (chrome.tabs?.query) {
            const tabs = await chrome.tabs.query({});
            for (const t of tabs) {
              if (t.id) {
                chrome.tabs.sendMessage(t.id, { type: 'SETTINGS_UPDATED' }).catch(() => {});
              }
            }
          }
        }
      } catch {
        // Ignore communication errors
      }
    });

    // Open Manager on brand logo/title click
    document.querySelector('.brand-group')?.addEventListener('click', () => {
      this.openManager();
    });

    // New Snippet
    document.getElementById('btn-quick-new')?.addEventListener('click', () => {
      this.openManager('new');
    });

    // Open Manager
    document.getElementById('btn-open-manager')?.addEventListener('click', () => {
      this.openManager();
    });
  }

  private openManager(target?: string): void {
    const url = chrome.runtime.getURL(
      target ? `ui/manager/index.html#${target}` : 'ui/manager/index.html'
    );
    chrome.tabs.create({ url });
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (m) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return map[m];
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupController();
  popup.init();
});
