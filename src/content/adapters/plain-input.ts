/**
 * Plain Input Adapter: Handles standard HTMLInputElement and HTMLTextAreaElement.
 * Dispatches standard InputEvent and Change events for React/Vue/Angular compatibility.
 */

import { CaretCoordinates, ExpansionUndoContext, ResolvedText } from '../../core/types';

export class PlainInputAdapter {
  /**
   * Identifies input elements that throw DOMException (InvalidStateError)
   * on selectionStart, selectionEnd, setSelectionRange, or setRangeText
   * according to the WHATWG HTML standard.
   */
  public static isRestrictedInput(element: HTMLInputElement | HTMLTextAreaElement): boolean {
    if (typeof HTMLInputElement === 'undefined' || !(element instanceof HTMLInputElement)) {
      return false;
    }
    const type = (element.type || '').toLowerCase();
    return ['email', 'number', 'date', 'datetime-local', 'time', 'month', 'week', 'color', 'range'].includes(type);
  }

  /**
   * Safely gets selectionEnd without crashing on email/number inputs.
   * Never mutates input.type (modifying type resets cursor to position 0).
   */
  public static getSelectionEndSafe(element: HTMLInputElement | HTMLTextAreaElement): number {
    if (!this.isRestrictedInput(element)) {
      try {
        const end = element.selectionEnd;
        if (typeof end === 'number') {
          return end;
        }
      } catch {
        // Fall through
      }
    }

    try {
      return (element.value || '').length;
    } catch {
      return 0;
    }
  }

  public static getTail(element: HTMLInputElement | HTMLTextAreaElement, maxLen = 32): string {
    try {
      const val = element.value || '';
      const end = this.getSelectionEndSafe(element);
      const safeEnd = Math.min(Math.max(0, end), val.length);
      const start = Math.max(0, safeEnd - maxLen);
      return val.slice(start, safeEnd);
    } catch {
      return '';
    }
  }

  public static insertTextDirectly(element: HTMLInputElement | HTMLTextAreaElement, text: string): boolean {
    if (typeof document !== 'undefined' && document.activeElement !== element) {
      try {
        element.focus();
      } catch {}
    }
    const isRestricted = this.isRestrictedInput(element);
    let inserted = false;
    if (!isRestricted) {
      try {
        inserted = document.execCommand('insertText', false, text);
      } catch {
        inserted = false;
      }
    }
    if (!inserted) {
      const end = this.getSelectionEndSafe(element);
      const start = end;
      if (!isRestricted && typeof element.setRangeText === 'function') {
        try {
          element.setRangeText(text, start, end, 'end');
          inserted = true;
        } catch {}
      }
      if (!inserted) {
        element.value = element.value.slice(0, start) + text + element.value.slice(end);
        inserted = true;
      }
      try {
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } catch {}
    }
    return inserted;
  }

  public static replaceTrigger(
    element: HTMLInputElement | HTMLTextAreaElement,
    triggerLength: number,
    resolved: ResolvedText,
    snippetId: string,
    originalTrigger: string
  ): ExpansionUndoContext {
    const isRestricted = this.isRestrictedInput(element);
    const end = this.getSelectionEndSafe(element);
    const start = Math.max(0, end - triggerLength);

    const oldValue = element.value || '';
    const replacement = resolved.text;

    if (typeof document !== 'undefined' && document.activeElement !== element) {
      try {
        element.focus();
      } catch {}
    }

    let replaced = false;

    // Strategy 1: Native execCommand('insertText') for full framework & undo compatibility
    // (Only if element supports selection; restricted types like email throw InvalidStateError)
    if (!isRestricted) {
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
    }

    // Strategy 2: Programmatic value setting fallback (React / Vue / plain HTML / email inputs)
    if (!replaced || element.value === oldValue) {
      let rangeApplied = false;
      if (!isRestricted && typeof element.setRangeText === 'function') {
        try {
          element.setRangeText(replacement, start, end, 'end');
          rangeApplied = true;
        } catch {
          rangeApplied = false;
        }
      }
      if (!rangeApplied) {
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
        try {
          tracker.setValue(oldValue);
        } catch {}
      }

      if (nativeValueSetter) {
        try {
          nativeValueSetter.call(element, element.value);
        } catch {}
      }

      const targetPos =
        resolved.cursorOffset !== undefined
          ? start + resolved.cursorOffset
          : start + replacement.length;
      if (!isRestricted && typeof element.setSelectionRange === 'function') {
        try {
          element.setSelectionRange(targetPos, targetPos);
        } catch {}
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
      if (
        !isRestricted &&
        resolved.cursorOffset !== undefined &&
        typeof element.setSelectionRange === 'function'
      ) {
        const targetPos = start + resolved.cursorOffset;
        try {
          element.setSelectionRange(targetPos, targetPos);
        } catch {}
      }
    }

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
    const isRestricted = this.isRestrictedInput(element);

    try {
      if (typeof document !== 'undefined' && document.activeElement !== element) {
        try {
          element.focus();
        } catch {}
      }

      let undone = false;
      if (!isRestricted) {
        try {
          if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
            undone = document.execCommand('undo');
          }
        } catch {
          undone = false;
        }
      }

      if (!undone) {
        let rangeApplied = false;
        if (!isRestricted && typeof element.setRangeText === 'function') {
          try {
            element.setRangeText(originalTriggerText, startOffset, endOffset, 'end');
            rangeApplied = true;
          } catch {
            rangeApplied = false;
          }
        }
        if (!rangeApplied) {
          element.value =
            element.value.slice(0, startOffset) +
            originalTriggerText +
            element.value.slice(endOffset);
        }

        if (!isRestricted && typeof element.setSelectionRange === 'function') {
          try {
            element.setSelectionRange(
              startOffset + originalTriggerText.length,
              startOffset + originalTriggerText.length
            );
          } catch {}
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
          try {
            tracker.setValue(context.expandedText);
          } catch {}
        }

        if (nativeValueSetter) {
          try {
            nativeValueSetter.call(element, element.value);
          } catch {}
        }

        try {
          if (typeof Event !== 'undefined') {
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } catch {}
      }
    } catch {}
  }

  public static getCaretCoordinates(
    element: HTMLInputElement | HTMLTextAreaElement
  ): CaretCoordinates | null {
    try {
      if (typeof element.getBoundingClientRect !== 'function') return null;
      const rect = element.getBoundingClientRect();
      const style =
        typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
          ? window.getComputedStyle(element)
          : null;
      const paddingLeft = style ? parseFloat(style.paddingLeft) || 12 : 12;

      let caretX = rect.left + paddingLeft;

      try {
        const val = element.value || '';
        const end = this.getSelectionEndSafe(element);
        const textBeforeCaret = val.slice(0, Math.min(end, val.length));

        if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext ? canvas.getContext('2d') : null;
          if (ctx && style) {
            ctx.font = `${style.fontWeight || '400'} ${style.fontSize || '14px'} ${
              style.fontFamily || 'sans-serif'
            }`;
            const textWidth = ctx.measureText(textBeforeCaret).width;
            const scrollLeft = element.scrollLeft || 0;
            caretX = rect.left + paddingLeft + textWidth - scrollLeft;
          }
        }
      } catch {}

      const safeX = Math.min(
        Math.max(rect.left + paddingLeft, caretX),
        rect.right ? rect.right - 10 : caretX
      );

      return {
        x: safeX,
        y: rect.top,
        height: rect.height || 24,
      };
    } catch {
      return null;
    }
  }
}
