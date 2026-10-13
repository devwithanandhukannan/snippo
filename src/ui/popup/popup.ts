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

    const settings = await SnippetStore.getSettings();
    const isGloballyDisabled = settings.enabled === false;
    let isPaused = isGloballyDisabled;

    if (this.currentHostname) {
      const isExcluded = await SnippetStore.isDomainExcluded(this.currentHostname);
      isPaused = isGloballyDisabled || isExcluded;
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

      card.innerHTML = `
        <div class="snippet-card-top">
          <span class="badge-trigger">${this.escapeHtml(snip.trigger)}</span>
          <div class="snippet-meta">
            <span class="badge-folder">${this.escapeHtml(snip.folder || 'General')}</span>
            ${snip.usageCount ? `<span class="badge-count">${snip.usageCount}×</span>` : ''}
          </div>
        </div>
        <div class="snippet-card-body">${this.escapeHtml(snip.body.replace(/\n/g, ' '))}</div>
      `;

      card.addEventListener('click', () => {
        this.openManager(snip.id);
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

      if (isPaused) {
        // Paused: disable globally and exclude domain if present
        if (this.currentHostname) {
          const isExcluded = await SnippetStore.isDomainExcluded(this.currentHostname);
          if (!isExcluded) {
            await SnippetStore.toggleDomainExclusion(this.currentHostname);
          }
        }
        await SnippetStore.updateSettings({ enabled: false });
      } else {
        // Active: enable globally and remove exclusion if present
        await SnippetStore.updateSettings({ enabled: true });
        if (this.currentHostname) {
          const isExcluded = await SnippetStore.isDomainExcluded(this.currentHostname);
          if (isExcluded) {
            await SnippetStore.toggleDomainExclusion(this.currentHostname);
          }
        }
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
