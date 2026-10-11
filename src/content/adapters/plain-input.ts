/**
 * Plain Input Adapter: Handles standard HTMLInputElement and HTMLTextAreaElement.
 * Dispatches standard InputEvent and Change events for React/Vue/Angular compatibility.
 */

import { CaretCoordinates, ExpansionUndoContext, ResolvedText } from '../../core/types';

export class PlainInputAdapter {
  public static getTail(element: HTMLInputElement | HTMLTextAreaElement, maxLen = 32): string {
    const end = element.selectionEnd ?? element.value.length;
    const start = Math.max(0, end - maxLen);
    return element.value.slice(start, end);
  }

  public static replaceTrigger(
    element: HTMLInputElement | HTMLTextAreaElement,
    triggerLength: number,
    resolved: ResolvedText,
    snippetId: string,
    originalTrigger: string
  ): ExpansionUndoContext {
    const end = element.selectionEnd ?? element.value.length;
    const start = Math.max(0, end - triggerLength);

    const oldValue = element.value;
    const replacement = resolved.text;

    if (typeof document !== 'undefined' && document.activeElement !== element) {
      try {
        element.focus();
      } catch {}
    }

    let replaced = false;

    // Strategy 1: Native execCommand('insertText') for full framework & undo compatibility
    try {
      if (
        typeof document !== 'undefined' &&
        typeof element.setSelectionRange === 'function' &&
        typeof document.execCommand === 'function'
      ) {
        element.setSelectionRange(start, end);
        replaced = document.execCommand('insertText', false, replacement);
      }
    } catch {
      replaced = false;
    }

    // Strategy 2: Programmatic value setting fallback (React / Vue / plain HTML)
    if (!replaced || element.value === oldValue) {
      if (typeof element.setRangeText === 'function') {
        element.setRangeText(replacement, start, end, 'end');
      } else {
        element.value = element.value.slice(0, start) + replacement + element.value.slice(end);
      }

      const isTextArea =
        typeof HTMLTextAreaElement !== 'undefined'
          ? element instanceof HTMLTextAreaElement
          : (element as any)?.tagName?.toUpperCase() === 'TEXTAREA';

      const proto = isTextArea
        ? typeof HTMLTextAreaElement !== 'undefined'
          ? HTMLTextAreaElement.prototype
          : Object.getPrototypeOf(element)
        : typeof HTMLInputElement !== 'undefined'
        ? HTMLInputElement.prototype
        : Object.getPrototypeOf(element);

      const nativeValueSetter = proto
        ? Object.getOwnPropertyDescriptor(proto, 'value')?.set
        : undefined;

      // Sync React internal value tracker if present
      const tracker = (element as any)._valueTracker;
      if (tracker) {
        tracker.setValue(oldValue);
      }

      if (nativeValueSetter) {
        nativeValueSetter.call(element, element.value);
      }

      const targetPos =
        resolved.cursorOffset !== undefined
          ? start + resolved.cursorOffset
          : start + replacement.length;
      if (typeof element.setSelectionRange === 'function') {
        element.setSelectionRange(targetPos, targetPos);
      }

      // Trigger synthetic input and change events for reactive frameworks
      try {
        if (typeof InputEvent !== 'undefined') {
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertReplacementText',
            data: replacement,
          });
          element.dispatchEvent(inputEvent);
        } else if (typeof Event !== 'undefined') {
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch {
        try {
          element.dispatchEvent(new Event('input', { bubbles: true }));
        } catch {}
      }

      try {
        if (typeof Event !== 'undefined') {
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch {}
    } else {
      // execCommand succeeded - handle custom cursor offset if specified
      if (resolved.cursorOffset !== undefined && typeof element.setSelectionRange === 'function') {
        const targetPos = start + resolved.cursorOffset;
        element.setSelectionRange(targetPos, targetPos);
      }
    }

    // Note: Never dispatch synthetic 'Escape' key events! Firing Escape causes
    // search bars (like Pinterest) to clear the query or close search dropdowns.

    return {
      id: 'undo-' + Date.now(),
      snippetId,
      trigger: originalTrigger,
      expandedText: replacement,
      timestamp: Date.now(),
      editorType: 'plain-input',
      restoreData: {
        startOffset: start,
        endOffset: start + replacement.length,
        originalTriggerText: originalTrigger,
      },
    };
  }

  public static undo(
    element: HTMLInputElement | HTMLTextAreaElement,
    context: ExpansionUndoContext
  ): void {
    const { startOffset, endOffset, originalTriggerText } = context.restoreData;

    if (typeof document !== 'undefined' && document.activeElement !== element) {
      try {
        element.focus();
      } catch {}
    }

    let undone = false;
    try {
      if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
        undone = document.execCommand('undo');
      }
    } catch {
      undone = false;
    }

    if (!undone) {
      if (typeof element.setRangeText === 'function') {
        element.setRangeText(originalTriggerText, startOffset, endOffset, 'end');
      } else {
        element.value =
          element.value.slice(0, startOffset) +
          originalTriggerText +
          element.value.slice(endOffset);
        if (typeof element.setSelectionRange === 'function') {
          element.setSelectionRange(
            startOffset + originalTriggerText.length,
            startOffset + originalTriggerText.length
          );
        }
      }

      const isTextArea =
        typeof HTMLTextAreaElement !== 'undefined'
          ? element instanceof HTMLTextAreaElement
          : (element as any)?.tagName?.toUpperCase() === 'TEXTAREA';

      const proto = isTextArea
        ? typeof HTMLTextAreaElement !== 'undefined'
          ? HTMLTextAreaElement.prototype
          : Object.getPrototypeOf(element)
        : typeof HTMLInputElement !== 'undefined'
        ? HTMLInputElement.prototype
        : Object.getPrototypeOf(element);

      const nativeValueSetter = proto
        ? Object.getOwnPropertyDescriptor(proto, 'value')?.set
        : undefined;

      const tracker = (element as any)._valueTracker;
      if (tracker) {
        tracker.setValue(context.expandedText);
      }

      if (nativeValueSetter) {
        nativeValueSetter.call(element, element.value);
      }

      try {
        if (typeof Event !== 'undefined') {
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch {}
    }
  }

  public static getCaretCoordinates(
    element: HTMLInputElement | HTMLTextAreaElement
  ): CaretCoordinates | null {
    const rect = element.getBoundingClientRect();
    // Approximate caret position for standard input/textarea
    return {
      x: rect.left + 16,
      y: rect.top - 8,
      height: 24,
    };
  }
}
