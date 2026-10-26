/**
 * In-Page Feedback Chip: Apple-style frosted pill floating near caret.
 * Shows expansion confirmation with quick Undo button.
 * Uses Shadow DOM to isolate styles completely from host page.
 */

import { CaretCoordinates } from '../core/types';

export class InPageChip {
  private static hostElement: HTMLElement | null = null;
  private static shadowRoot: ShadowRoot | null = null;
  private static dismissTimer: any = null;
  private static onUndoCallback: (() => void) | null = null;

  /**
   * Initializes the shadow host on document body.
   */
  private static ensureContainer(): void {
    if (this.hostElement && document.body.contains(this.hostElement)) return;

    this.hostElement = document.createElement('div');
    this.hostElement.id = 'snippo-chip-host';
    this.hostElement.style.cssText =
      'position: fixed; z-index: 2147483647; top: 0; left: 0; pointer-events: none; width: 0; height: 0; overflow: visible;';

    this.shadowRoot = this.hostElement.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      }
      .snippo-chip {
        position: fixed;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 12px;
        background: rgba(28, 28, 30, 0.88);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        backdrop-filter: blur(20px) saturate(180%);
        color: #FFFFFF;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.15);
        font-size: 12px;
        font-weight: 500;
        line-height: 1.2;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(6px) scale(0.96);
        transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
        white-space: nowrap;
      }
      .snippo-chip.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .snippo-chip.visible:hover {
        opacity: 0.35;
      }
      .snippo-chip.visible:hover .chip-undo-btn,
      .snippo-chip.visible .chip-undo-btn:hover {
        opacity: 1;
      }
      .chip-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(24, 114, 222, 0.24);
        color: #3296FD;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 6px;
        letter-spacing: 0.2px;
      }
      .chip-text {
        color: rgba(255, 255, 255, 0.9);
      }
      .chip-undo-btn {
        background: rgba(255, 255, 255, 0.14);
        border: none;
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 9999px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        transition: background 120ms ease, transform 80ms ease;
      }
      .chip-undo-btn:hover {
        background: rgba(255, 255, 255, 0.24);
      }
      .chip-undo-btn:active {
        transform: scale(0.95);
      }
      .chip-kbd {
        font-size: 9px;
        opacity: 0.6;
        text-transform: uppercase;
      }
    `;

    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.hostElement);
  }

  /**
   * Shows the in-page pill near the caret or in a fallback viewport corner.
   * Ensures the chip never occludes the input field content.
   */
  public static show(
    trigger: string,
    coords: CaretCoordinates | null,
    onUndo: () => void,
    durationMs = 1800,
    targetElement?: HTMLElement | null
  ): void {
    this.ensureContainer();
    if (!this.shadowRoot) return;

    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    this.onUndoCallback = onUndo;

    // Remove existing chip element
    const existing = this.shadowRoot.querySelector('.snippo-chip');
    if (existing) existing.remove();

    const chip = document.createElement('div');
    chip.className = 'snippo-chip';

    // Position calculation
    const CHIP_HEIGHT = 28;
    const GAP = 8;
    let top = window.innerHeight - 56;
    let left = window.innerWidth - 220;

    const elRect =
      targetElement && typeof targetElement.getBoundingClientRect === 'function'
        ? targetElement.getBoundingClientRect()
        : null;

    if (elRect && elRect.width > 0 && elRect.height > 0) {
      const hasSpaceAbove = elRect.top >= CHIP_HEIGHT + GAP + 6;
      const hasSpaceBelow = window.innerHeight - elRect.bottom >= CHIP_HEIGHT + GAP + 6;

      if (hasSpaceAbove) {
        top = elRect.top - CHIP_HEIGHT - GAP;
      } else if (hasSpaceBelow) {
        // Automatically flip below the element when near top of viewport (e.g. Amazon search)
        top = elRect.bottom + GAP;
      } else {
        top = window.innerHeight - 56;
      }

      // Horizontal alignment: position near caret if known, or right-aligned within element bounds
      if (coords && coords.x > 0) {
        left = Math.min(window.innerWidth - 220, Math.max(12, coords.x - 20));
      } else {
        left = Math.min(window.innerWidth - 220, Math.max(12, elRect.left + 16));
      }

      // Hard Collision Prevention: The chip [top, top + CHIP_HEIGHT] must NEVER overlap [elRect.top, elRect.bottom]
      const chipTop = top;
      const chipBottom = top + CHIP_HEIGHT;
      const collidesWithElement = !(chipBottom < elRect.top || chipTop > elRect.bottom);
      if (collidesWithElement) {
        if (hasSpaceBelow) {
          top = elRect.bottom + GAP;
        } else if (hasSpaceAbove) {
          top = elRect.top - CHIP_HEIGHT - GAP;
        } else {
          top = window.innerHeight - 56;
          left = window.innerWidth - 220;
        }
      }
    } else if (coords && coords.x > 0 && coords.y > 0) {
      const coordsHeight = coords.height || 24;
      const approxTop = coords.y;
      const approxBottom = coords.y + coordsHeight;

      if (approxTop >= CHIP_HEIGHT + GAP + 6) {
        top = approxTop - CHIP_HEIGHT - GAP;
      } else if (window.innerHeight - approxBottom >= CHIP_HEIGHT + GAP + 6) {
        top = approxBottom + GAP;
      } else {
        top = window.innerHeight - 56;
      }

      left = Math.min(window.innerWidth - 220, Math.max(12, coords.x - 20));
    }

    chip.style.top = `${top}px`;
    chip.style.left = `${left}px`;

    chip.innerHTML = `
      <span class="chip-badge">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      </span>
      <span class="chip-text">${this.escapeHtml(trigger)}</span>
      <button class="chip-undo-btn" id="snippo-undo-action">
        Undo <span class="chip-kbd">Esc</span>
      </button>
    `;

    const undoBtn = chip.querySelector('#snippo-undo-action');
    undoBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.triggerUndo();
    });

    this.shadowRoot.appendChild(chip);

    // Trigger enter animation on next frame
    requestAnimationFrame(() => {
      chip.classList.add('visible');
    });

    // Schedule dismiss
    this.dismissTimer = setTimeout(() => {
      this.dismiss();
    }, durationMs);
  }

  public static triggerUndo(): void {
    if (this.onUndoCallback) {
      const cb = this.onUndoCallback;
      this.onUndoCallback = null;
      cb();
    }
    this.dismiss();
  }

  public static dismiss(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    if (!this.shadowRoot) return;

    const chip = this.shadowRoot.querySelector('.snippo-chip');
    if (chip) {
      chip.classList.remove('visible');
      setTimeout(() => {
        chip.remove();
      }, 200);
    }
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
