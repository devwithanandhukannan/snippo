/**
 * Quick Launcher: Raycast/Alfred-style floating command palette.
 * Allows instant search and insertion of all snippets across any webpage.
 * Isolated via Shadow DOM.
 */

import { Snippet } from '../core/types';

export class QuickLauncher {
  private static hostElement: HTMLElement | null = null;
  private static shadowRoot: ShadowRoot | null = null;
  private static allSnippets: Snippet[] = [];
  private static filteredSnippets: Snippet[] = [];
  private static activeIndex = 0;
  private static onSelectCallback: ((snippet: Snippet) => void) | null = null;
  private static isVisible = false;

  private static ensureContainer(): void {
    if (this.hostElement && document.body.contains(this.hostElement)) return;

    this.hostElement = document.createElement('div');
    this.hostElement.id = 'snippo-launcher-host';
    this.hostElement.style.cssText =
      'position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: auto; display: flex; align-items: center; justify-content: center;';

    this.shadowRoot = this.hostElement.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      }
      .launcher-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 14vh;
        animation: fadeIn 140ms ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .launcher-card {
        width: 560px;
        max-width: 92vw;
        background: #18181B;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
        color: #FFFFFF;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: slideDown 180ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes slideDown {
        from { transform: translateY(-16px) scale(0.97); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      .search-header {
        display: flex;
        align-items: center;
        padding: 14px 18px;
        gap: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.02);
      }
      .search-icon {
        color: rgba(255, 255, 255, 0.5);
        display: flex;
        align-items: center;
      }
      .launcher-input {
        flex: 1;
        background: transparent;
        border: none;
        color: #FFFFFF;
        font-size: 16px;
        outline: none;
      }
      .launcher-input::placeholder {
        color: rgba(255, 255, 255, 0.35);
      }
      .launcher-badge {
        background: rgba(109, 99, 230, 0.25);
        color: #A79BF8;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 6px;
      }
      .results-list {
        list-style: none;
        margin: 0;
        padding: 8px;
        max-height: 330px;
        overflow-y: auto;
      }
      .result-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-radius: 10px;
        cursor: pointer;
        transition: background 80ms ease;
      }
      .result-item.active {
        background: rgba(91, 91, 214, 0.35);
        border: 1px solid rgba(109, 99, 230, 0.3);
      }
      .item-main {
        display: flex;
        flex-direction: column;
        gap: 3px;
        overflow: hidden;
      }
      .item-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .item-trigger {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
        font-weight: 700;
        color: #3DDC97;
      }
      .item-desc {
        font-size: 13px;
        font-weight: 500;
        color: #F4F4F5;
      }
      .item-preview {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .item-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .item-folder {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.08);
        padding: 2px 8px;
        border-radius: 5px;
      }
      .empty-notice {
        padding: 32px 16px;
        text-align: center;
        color: rgba(255, 255, 255, 0.4);
        font-size: 13px;
      }
      .launcher-footer {
        padding: 8px 18px;
        background: rgba(0, 0, 0, 0.25);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.45);
      }
      .kbd {
        background: rgba(255, 255, 255, 0.12);
        padding: 2px 5px;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 10px;
      }
    `;

    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.hostElement);
  }

  public static show(
    snippets: Snippet[],
    onSelect: (snippet: Snippet) => void
  ): void {
    this.ensureContainer();
    if (!this.shadowRoot) return;

    this.allSnippets = snippets.filter((s) => s.enabled !== false);
    this.filteredSnippets = [...this.allSnippets];
    this.activeIndex = 0;
    this.onSelectCallback = onSelect;
    this.isVisible = true;

    // Remove existing dialog
    const existing = this.shadowRoot.querySelector('.launcher-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'launcher-backdrop';

    backdrop.innerHTML = `
      <div class="launcher-card" role="dialog" aria-modal="true">
        <div class="search-header">
          <span class="search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input type="text" class="launcher-input" id="launcher-search" placeholder="Type a snippet or trigger..." autocomplete="off">
          <span class="launcher-badge">Quick Launcher</span>
        </div>

        <ul class="results-list" id="launcher-results">
        </ul>

        <div class="launcher-footer">
          <span><span class="kbd">↑↓</span> Navigate</span>
          <span><span class="kbd">↵</span> Insert into chat</span>
          <span><span class="kbd">Esc</span> Close</span>
        </div>
      </div>
    `;

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.dismiss();
      }
    });

    const searchInput = backdrop.querySelector('#launcher-search') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      if (!q) {
        this.filteredSnippets = [...this.allSnippets];
      } else {
        this.filteredSnippets = this.allSnippets.filter(
          (s) =>
            s.trigger.toLowerCase().includes(q) ||
            s.body.toLowerCase().includes(q) ||
            (s.description && s.description.toLowerCase().includes(q)) ||
            (s.folder && s.folder.toLowerCase().includes(q))
        );
      }
      this.activeIndex = 0;
      this.renderResults(backdrop);
    });

    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.stopPropagation();
        e.preventDefault();
        if (this.filteredSnippets.length > 0) {
          this.activeIndex = (this.activeIndex + 1) % this.filteredSnippets.length;
          this.updateActiveItem(backdrop);
        }
      } else if (e.key === 'ArrowUp') {
        e.stopPropagation();
        e.preventDefault();
        if (this.filteredSnippets.length > 0) {
          this.activeIndex =
            (this.activeIndex - 1 + this.filteredSnippets.length) % this.filteredSnippets.length;
          this.updateActiveItem(backdrop);
        }
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        e.preventDefault();
        if (this.filteredSnippets[this.activeIndex]) {
          this.select(this.filteredSnippets[this.activeIndex]);
        }
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        this.dismiss();
      }
    });

    this.shadowRoot.appendChild(backdrop);
    this.renderResults(backdrop);

    requestAnimationFrame(() => {
      searchInput?.focus();
    });
  }

  private static renderResults(container: HTMLElement): void {
    const list = container.querySelector('#launcher-results');
    if (!list) return;

    if (this.filteredSnippets.length === 0) {
      list.innerHTML = `<div class="empty-notice">No matching snippets found.</div>`;
      return;
    }

    list.innerHTML = this.filteredSnippets
      .map((snip, idx) => {
        const isActive = idx === this.activeIndex;
        const preview = snip.body.replace(/\n/g, ' ').slice(0, 50);
        return `
        <li class="result-item ${isActive ? 'active' : ''}" data-index="${idx}">
          <div class="item-main">
            <div class="item-title-row">
              <span class="item-trigger">${this.escapeHtml(snip.trigger)}</span>
              ${snip.description ? `<span class="item-desc">${this.escapeHtml(snip.description)}</span>` : ''}
            </div>
            <span class="item-preview">${this.escapeHtml(preview)}</span>
          </div>
          <div class="item-meta">
            <span class="item-folder">${this.escapeHtml(snip.folder || 'Snippet')}</span>
          </div>
        </li>
      `;
      })
      .join('');

    list.querySelectorAll('.result-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(item.getAttribute('data-index') || '0');
        if (this.filteredSnippets[idx]) {
          this.select(this.filteredSnippets[idx]);
        }
      });
    });
  }

  private static updateActiveItem(container: HTMLElement): void {
    const items = container.querySelectorAll('.result-item');
    items.forEach((item, idx) => {
      if (idx === this.activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  private static select(snippet: Snippet): void {
    if (this.onSelectCallback) {
      const cb = this.onSelectCallback;
      this.onSelectCallback = null;
      cb(snippet);
    }
    this.dismiss();
  }

  public static dismiss(): void {
    this.isVisible = false;
    if (!this.shadowRoot) return;
    const dialog = this.shadowRoot.querySelector('.launcher-backdrop');
    if (dialog) dialog.remove();
    if (this.hostElement && document.body.contains(this.hostElement)) {
      this.hostElement.remove();
      this.hostElement = null;
      this.shadowRoot = null;
    }
  }

  public static isOpen(): boolean {
    return this.isVisible;
  }

  private static escapeHtml(str: string): string {
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
