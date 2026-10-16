/**
 * In-Line Suggestion Menu (Slash Command Palette):
 * Appears right near caret when user starts typing a trigger prefix (e.g. /, ;, :).
 * Isolated via Shadow DOM.
 */

import { CaretCoordinates, Snippet } from '../core/types';

export class InLinePalette {
  private static hostElement: HTMLElement | null = null;
  private static shadowRoot: ShadowRoot | null = null;
  private static activeIndex = 0;
  private static currentSnippets: Snippet[] = [];
  private static onSelectCallback: ((snippet: Snippet) => void) | null = null;
  private static isVisible = false;

  private static ensureContainer(): void {
    if (this.hostElement && document.body.contains(this.hostElement)) return;

    this.hostElement = document.createElement('div');
    this.hostElement.id = 'snippo-palette-host';
    this.hostElement.style.cssText =
      'position: fixed; z-index: 2147483646; top: 0; left: 0; pointer-events: none; width: 0; height: 0; overflow: visible;';

    this.shadowRoot = this.hostElement.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      }
      .snippo-palette {
        position: fixed;
        width: 290px;
        background: rgba(24, 24, 27, 0.94);
        -webkit-backdrop-filter: blur(20px) saturate(190%);
        backdrop-filter: blur(20px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2);
        color: #FFFFFF;
        overflow: hidden;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(4px) scale(0.98);
        transition: opacity 120ms ease, transform 120ms ease;
        user-select: none;
      }
      .snippo-palette.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .palette-header {
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.04);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }
      .palette-list {
        list-style: none;
        margin: 0;
        padding: 4px;
        max-height: 220px;
        overflow-y: auto;
      }
      .palette-item {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 7px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 80ms ease;
      }
      .palette-item.active {
        background: rgba(91, 91, 214, 0.35);
        border: 1px solid rgba(109, 99, 230, 0.4);
      }
      .item-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .item-trigger {
        font-size: 12px;
        font-weight: 700;
        color: #3DDC97;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      .item-folder {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.08);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .item-desc {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.85);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .palette-footer {
        padding: 4px 10px;
        background: rgba(0, 0, 0, 0.2);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.4);
      }
      .kbd {
        background: rgba(255, 255, 255, 0.12);
        padding: 1px 4px;
        border-radius: 3px;
        color: rgba(255, 255, 255, 0.7);
      }
    `;

    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.hostElement);
  }

  public static show(
    matches: Snippet[],
    coords: CaretCoordinates | null,
    onSelect: (snippet: Snippet) => void
  ): void {
    if (!matches || matches.length === 0) {
      this.dismiss();
      return;
    }

    this.ensureContainer();
    if (!this.shadowRoot) return;

    this.currentSnippets = matches.slice(0, 5);
    this.activeIndex = 0;
    this.onSelectCallback = onSelect;
    this.isVisible = true;

    // Calculate position relative to caret
    let top = 100;
    let left = 100;

    if (coords && coords.x > 0 && coords.y > 0) {
      top = coords.y + (coords.height || 20) + 6;
      left = Math.min(window.innerWidth - 310, Math.max(12, coords.x - 20));

      // Flip above if near bottom
      if (top + 220 > window.innerHeight) {
        top = Math.max(12, coords.y - 230);
      }
    }

    let existing = this.shadowRoot.querySelector('.snippo-palette') as HTMLElement;
    if (!existing) {
      existing = document.createElement('div');
      existing.className = 'snippo-palette';
      this.shadowRoot.appendChild(existing);
    }

    existing.style.top = `${top}px`;
    existing.style.left = `${left}px`;

    this.renderItems(existing);

    requestAnimationFrame(() => {
      existing.classList.add('visible');
    });
  }

  private static renderItems(container: HTMLElement): void {
    const listHtml = this.currentSnippets
      .map((snip, idx) => {
        const isActive = idx === this.activeIndex;
        const preview = snip.description || snip.body.replace(/\n/g, ' ').slice(0, 45);
        return `
        <li class="palette-item ${isActive ? 'active' : ''}" data-index="${idx}">
          <div class="item-top">
            <span class="item-trigger">${this.escapeHtml(snip.trigger)}</span>
            <span class="item-folder">${this.escapeHtml(snip.folder || 'Snippet')}</span>
          </div>
          <span class="item-desc">${this.escapeHtml(preview)}</span>
        </li>
      `;
      })
      .join('');

    container.innerHTML = `
      <div class="palette-header">
        <span>Snippo Suggestions</span>
        <span>${this.currentSnippets.length} matches</span>
      </div>
      <ul class="palette-list">
        ${listHtml}
      </ul>
      <div class="palette-footer">
        <span><span class="kbd">↑↓</span> Navigate</span>
        <span><span class="kbd">↵</span> Select</span>
        <span><span class="kbd">Esc</span> Close</span>
      </div>
    `;

    // Click handler on items
    container.querySelectorAll('.palette-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const idx = Number(item.getAttribute('data-index') || '0');
        this.select(idx);
      });
    });
  }

  public static handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.isVisible || this.currentSnippets.length === 0) return false;

    if (e.key === 'ArrowDown') {
      e.stopPropagation();
      e.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % this.currentSnippets.length;
      this.updateActiveItem();
      return true;
    }

    if (e.key === 'ArrowUp') {
      e.stopPropagation();
      e.preventDefault();
      this.activeIndex =
        (this.activeIndex - 1 + this.currentSnippets.length) % this.currentSnippets.length;
      this.updateActiveItem();
      return true;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.stopPropagation();
      e.preventDefault();
      this.select(this.activeIndex);
      return true;
    }

    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      this.dismiss();
      return true;
    }

    return false;
  }

  private static updateActiveItem(): void {
    if (!this.shadowRoot) return;
    const items = this.shadowRoot.querySelectorAll('.palette-item');
    items.forEach((item, idx) => {
      if (idx === this.activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  private static select(index: number): void {
    const selected = this.currentSnippets[index];
    if (selected && this.onSelectCallback) {
      const cb = this.onSelectCallback;
      this.onSelectCallback = null;
      cb(selected);
    }
    this.dismiss();
  }

  public static dismiss(): void {
    this.isVisible = false;
    this.currentSnippets = [];
    if (!this.shadowRoot) return;
    const palette = this.shadowRoot.querySelector('.snippo-palette');
    if (palette) {
      palette.classList.remove('visible');
      setTimeout(() => {
        palette.remove();
      }, 150);
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
