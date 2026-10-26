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
    const isInput =
      (typeof HTMLInputElement !== 'undefined' && el instanceof HTMLInputElement) ||
      (el as any)?.tagName?.toLowerCase() === 'input';

    if (isInput) {
      const type = ((el as any).type || '').toLowerCase();
      if (
        type === 'password' ||
        type === 'hidden' ||
        type === 'file' ||
        type === 'checkbox' ||
        type === 'radio' ||
        type === 'button' ||
        type === 'submit' ||
        type === 'reset' ||
        type === 'image'
      ) {
        return true;
      }

      // Check autocomplete attributes for sensitive financial data
      const auto = ((el as any).autocomplete || '').toLowerCase();
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
    // 1. Direct check on event target if provided (handles search inputs, comboboxes, recipient fields, etc.)
    const directEl = target as HTMLElement | null;
    if (directEl && !this.isSkipListElement(directEl)) {
      const isInput =
        (typeof HTMLInputElement !== 'undefined' && directEl instanceof HTMLInputElement) ||
        directEl.tagName?.toLowerCase() === 'input';
      const isTextArea =
        (typeof HTMLTextAreaElement !== 'undefined' && directEl instanceof HTMLTextAreaElement) ||
        directEl.tagName?.toLowerCase() === 'textarea';

      if (isInput || isTextArea) {
        return { element: directEl, type: 'plain-input' };
      }

      // Check if target is inside an input/textarea
      const parentInput = directEl.closest?.('input:not([type="hidden"]), textarea') as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (parentInput && !this.isSkipListElement(parentInput)) {
        return { element: parentInput, type: 'plain-input' };
      }

      // Check if directEl is or is inside an element with role="textbox" or [g_editable="true"] (Gmail body, Notion, Slack)
      const textboxEl = (directEl.getAttribute?.('role') === 'textbox'
        ? directEl
        : directEl.closest?.('[role="textbox"], [g_editable="true"]')) as HTMLElement | null;
      if (textboxEl && !this.isSkipListElement(textboxEl)) {
        return { element: textboxEl, type: 'rich-editable' };
      }

      // If directEl is inside a contenteditable or is contenteditable, resolve root editable element
      const editableAncestor = (directEl.closest?.('[contenteditable]:not([contenteditable="false"])') ||
        directEl.closest?.('[contenteditable="true"]')) as HTMLElement | null;
      if (editableAncestor && !this.isSkipListElement(editableAncestor)) {
        return { element: editableAncestor, type: 'rich-editable' };
      }

      if (
        directEl.isContentEditable ||
        directEl.getAttribute?.('contenteditable') === 'true' ||
        directEl.getAttribute?.('contenteditable') === ''
      ) {
        return { element: directEl, type: 'rich-editable' };
      }

      // Check if directEl is a combobox container (e.g. Gmail "To" recipient row, search combobox)
      const innerInput = directEl.querySelector?.(
        'input:not([type="hidden"]):not([type="password"]), textarea'
      ) as HTMLInputElement | HTMLTextAreaElement | null;
      if (innerInput && !this.isSkipListElement(innerInput)) {
        return { element: innerInput, type: 'plain-input' };
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
    const isActiveInput =
      (typeof HTMLInputElement !== 'undefined' && active instanceof HTMLInputElement) ||
      active.tagName?.toLowerCase() === 'input';
    const isActiveTextArea =
      (typeof HTMLTextAreaElement !== 'undefined' && active instanceof HTMLTextAreaElement) ||
      active.tagName?.toLowerCase() === 'textarea';

    if (isActiveInput || isActiveTextArea) {
      return { element: active, type: 'plain-input' };
    }

    // Check role="textbox" or [g_editable="true"] on active element
    if (
      active.getAttribute?.('role') === 'textbox' ||
      active.getAttribute?.('g_editable') === 'true'
    ) {
      return { element: active, type: 'rich-editable' };
    }

    const activeTextbox = active.closest?.(
      '[role="textbox"], [g_editable="true"]'
    ) as HTMLElement | null;
    if (activeTextbox && !this.isSkipListElement(activeTextbox)) {
      return { element: activeTextbox, type: 'rich-editable' };
    }

    // Contenteditable elements (WhatsApp Web, Gmail, Notion, Slack, Medium, etc.)
    if (
      active.isContentEditable ||
      active.getAttribute?.('contenteditable') === 'true' ||
      active.getAttribute?.('contenteditable') === ''
    ) {
      return { element: active, type: 'rich-editable' };
    }

    // Check if active element is a child inside a contenteditable parent
    const editableAncestor = (active.closest?.('[contenteditable]:not([contenteditable="false"])') ||
      active.closest?.('[contenteditable="true"]')) as HTMLElement | null;
    if (editableAncestor) {
      return { element: editableAncestor, type: 'rich-editable' };
    }

    // If active element is a container containing an input
    const activeInnerInput = active.querySelector?.(
      'input:not([type="hidden"]):not([type="password"]), textarea'
    ) as HTMLInputElement | HTMLTextAreaElement | null;
    if (activeInnerInput && !this.isSkipListElement(activeInnerInput)) {
      return { element: activeInnerInput, type: 'plain-input' };
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
          : (targetNode?.closest?.('[contenteditable]:not([contenteditable="false"])') ||
             targetNode?.closest?.('[contenteditable="true"]') ||
             targetNode?.closest?.('[role="textbox"], [g_editable="true"]'))) as HTMLElement | null;

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
