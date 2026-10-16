/**
 * Dynamic Fill-In Dialog: Prompts user to fill in template fields
 * (e.g. {name}, {phone}, {fill:Field}) before expanding.
 * Isolated completely via Shadow DOM.
 */

import { CaretCoordinates, Snippet } from '../core/types';

export class FillInDialog {
  private static hostElement: HTMLElement | null = null;
  private static shadowRoot: ShadowRoot | null = null;
  private static onSubmitCallback: ((values: Record<string, string>) => void) | null = null;
  private static onCancelCallback: (() => void) | null = null;

  private static ensureContainer(): void {
    if (this.hostElement && document.body.contains(this.hostElement)) return;

    this.hostElement = document.createElement('div');
    this.hostElement.id = 'snippo-fillin-host';
    this.hostElement.style.cssText =
      'position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: auto; display: flex; align-items: center; justify-content: center;';

    this.shadowRoot = this.hostElement.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      }
      .fillin-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 150ms ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .fillin-dialog {
        background: #1C1C1E;
        color: #FFFFFF;
        width: 380px;
        max-width: 90vw;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        animation: scaleUp 180ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes scaleUp {
        from { transform: scale(0.94) translateY(8px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
      .fillin-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .fillin-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fillin-badge {
        background: rgba(109, 99, 230, 0.28);
        color: #3DDC97;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
      }
      .fillin-title {
        font-size: 14px;
        font-weight: 600;
        color: #F5F5F7;
        margin: 0;
      }
      .fillin-close {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
      }
      .fillin-close:hover {
        color: #FFFFFF;
        background: rgba(255, 255, 255, 0.1);
      }
      .fillin-fields {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .field-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .field-label {
        font-size: 11px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.7);
        text-transform: capitalize;
      }
      .field-input {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: #FFFFFF;
        font-size: 13px;
        padding: 8px 12px;
        outline: none;
        transition: border-color 140ms ease, box-shadow 140ms ease;
      }
      .field-input:focus {
        border-color: #6D63E6;
        box-shadow: 0 0 0 3px rgba(109, 99, 230, 0.3);
      }
      .fillin-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
      }
      .btn-cancel {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.8);
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
      }
      .btn-cancel:hover {
        background: rgba(255, 255, 255, 0.16);
      }
      .btn-submit {
        background: #5B5BD6;
        border: none;
        color: #FFFFFF;
        padding: 6px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .btn-submit:hover {
        background: #6D63E6;
      }
      .kbd-hint {
        font-size: 10px;
        opacity: 0.6;
      }
    `;

    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.hostElement);
  }

  public static show(
    snippet: Snippet,
    fields: string[],
    coords: CaretCoordinates | null,
    onSubmit: (values: Record<string, string>) => void,
    onCancel?: () => void
  ): void {
    this.ensureContainer();
    if (!this.shadowRoot) return;

    this.onSubmitCallback = onSubmit;
    this.onCancelCallback = onCancel || null;

    // Remove existing dialog
    const existing = this.shadowRoot.querySelector('.fillin-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'fillin-backdrop';

    const fieldsHtml = fields
      .map(
        (f, idx) => `
        <div class="field-group">
          <label class="field-label" for="fillin-input-${idx}">${this.escapeHtml(f)}</label>
          <input type="text" id="fillin-input-${idx}" class="field-input" data-field="${this.escapeHtml(f)}" placeholder="Enter ${this.escapeHtml(f)}..." autocomplete="off">
        </div>
      `
      )
      .join('');

    backdrop.innerHTML = `
      <div class="fillin-dialog" role="dialog" aria-modal="true">
        <div class="fillin-header">
          <div class="fillin-title-group">
            <span class="fillin-badge">${this.escapeHtml(snippet.trigger)}</span>
            <h3 class="fillin-title">Fill in details</h3>
          </div>
          <button class="fillin-close" id="btn-fillin-close" title="Cancel (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="fillin-form" class="fillin-fields">
          ${fieldsHtml}
          <div class="fillin-actions">
            <button type="button" class="btn-cancel" id="btn-fillin-cancel">Cancel <span class="kbd-hint">Esc</span></button>
            <button type="submit" class="btn-submit" id="btn-fillin-submit">Insert <span class="kbd-hint">↵</span></button>
          </div>
        </form>
      </div>
    `;

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.cancel();
      }
    });

    const form = backdrop.querySelector('#fillin-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit(backdrop);
    });

    backdrop.querySelector('#btn-fillin-close')?.addEventListener('click', () => this.cancel());
    backdrop.querySelector('#btn-fillin-cancel')?.addEventListener('click', () => this.cancel());

    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        this.cancel();
      }
    });

    this.shadowRoot.appendChild(backdrop);

    // Focus first input
    requestAnimationFrame(() => {
      const firstInput = backdrop.querySelector('.field-input') as HTMLInputElement;
      firstInput?.focus();
    });
  }

  private static submit(container: HTMLElement): void {
    const values: Record<string, string> = {};
    const inputs = container.querySelectorAll('.field-input') as NodeListOf<HTMLInputElement>;
    inputs.forEach((inp) => {
      const field = inp.getAttribute('data-field') || '';
      values[field] = inp.value.trim();
    });

    if (this.onSubmitCallback) {
      const cb = this.onSubmitCallback;
      this.onSubmitCallback = null;
      cb(values);
    }
    this.dismiss();
  }

  private static cancel(): void {
    if (this.onCancelCallback) {
      const cb = this.onCancelCallback;
      this.onCancelCallback = null;
      cb();
    }
    this.dismiss();
  }

  public static dismiss(): void {
    if (!this.shadowRoot) return;
    const dialog = this.shadowRoot.querySelector('.fillin-backdrop');
    if (dialog) dialog.remove();
    if (this.hostElement && document.body.contains(this.hostElement)) {
      this.hostElement.remove();
      this.hostElement = null;
      this.shadowRoot = null;
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
