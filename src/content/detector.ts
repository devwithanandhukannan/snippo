/**
 * Editor Detector: Identifies current active editor type and enforces strict privacy skip list.
 * Skip list: password fields, credit card/payment fields, ignored elements.
 */

import { EditorType } from '../core/types';
import { ShadowDomAdapter } from './adapters/shadow-dom';

export class EditorDetector {
  /**
   * Checks if an element is on the privacy/security skip list.
   * Never inspects keystrokes in password or payment inputs.
   */
  public static isSkipListElement(el: Element | null): boolean {
    if (!el) return true;

    // Check input types
    if (el instanceof HTMLInputElement) {
      const type = (el.type || '').toLowerCase();
      if (type === 'password' || type === 'hidden' || type === 'file') {
        return true;
      }

      // Check autocomplete attributes for sensitive financial data
      const auto = (el.autocomplete || '').toLowerCase();
      if (
        auto.includes('cc-') ||
        auto.includes('credit-card') ||
        auto.includes('cvc') ||
        auto.includes('current-password') ||
        auto.includes('new-password') ||
        auto.includes('one-time-code')
      ) {
        return true;
      }
    }

    // Check data attributes or aria
    if (
      el.getAttribute('data-snippo-ignore') === 'true' ||
      el.getAttribute('data-verbatim-ignore') === 'true' ||
      el.getAttribute('data-1p-ignore') === 'true'
    ) {
      return true;
    }

    // Check disabled / readonly
    if ((el as any).readOnly || (el as any).disabled) {
      return true;
    }

    return false;
  }

  /**
   * Resolves the active editor element and its classification.
   */
  public static detectCurrentEditor(target?: Element | null): {
    element: HTMLElement | null;
    type: EditorType;
  } {
    // 1. Direct check on event target if provided (handles search inputs, comboboxes, etc.)
    const directEl = target as HTMLElement | null;
    if (directEl && !this.isSkipListElement(directEl)) {
      if (directEl instanceof HTMLInputElement || directEl instanceof HTMLTextAreaElement) {
        return { element: directEl, type: 'plain-input' };
      }
      if (directEl.isContentEditable || directEl.getAttribute('contenteditable') === 'true') {
        return { element: directEl, type: 'rich-editable' };
      }
      const editableAncestor = directEl.closest?.('[contenteditable="true"]') as HTMLElement | null;
      if (editableAncestor && !this.isSkipListElement(editableAncestor)) {
        return { element: editableAncestor, type: 'rich-editable' };
      }
    }

    const active = ShadowDomAdapter.getDeepActiveElement() as HTMLElement | null;

    if (!active || this.isSkipListElement(active)) {
      return { element: null, type: 'unsupported' };
    }

    // Detect Google Docs canvas editor
    if (
      document.location.hostname.includes('docs.google.com') &&
      (active.classList.contains('kix-canvas-tile-content') ||
        active.classList.contains('docs-texteventtarget-iframe'))
    ) {
      return { element: active, type: 'fallback' };
    }

    // Standard input or textarea
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      return { element: active, type: 'plain-input' };
    }

    // Contenteditable elements (WhatsApp Web, Gmail, Notion, Slack, Medium, etc.)
    if (active.isContentEditable || active.getAttribute('contenteditable') === 'true') {
      return { element: active, type: 'rich-editable' };
    }

    // Check if active element is a child inside a contenteditable parent
    const editableAncestor = active.closest?.('[contenteditable="true"]') as HTMLElement | null;
    if (editableAncestor) {
      return { element: editableAncestor, type: 'rich-editable' };
    }

    // Selection fallback: if active is body or container, check where the selection caret actually is
    try {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const targetNode =
          sel.anchorNode.nodeType === Node.ELEMENT_NODE
            ? (sel.anchorNode as HTMLElement)
            : sel.anchorNode.parentElement;
        const selEditable = (targetNode?.isContentEditable
          ? targetNode
          : targetNode?.closest?.('[contenteditable="true"]')) as HTMLElement | null;

        if (selEditable && !this.isSkipListElement(selEditable)) {
          return { element: selEditable, type: 'rich-editable' };
        }
      }
    } catch {
      // Fallback
    }

    return { element: null, type: 'unsupported' };
  }
}
