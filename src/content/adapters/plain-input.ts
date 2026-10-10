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

    const replacement = resolved.text;

    // Use setRangeText to update value cleanly
    if (typeof element.setRangeText === 'function') {
      element.setRangeText(replacement, start, end, 'end');
    } else {
      element.value = element.value.slice(0, start) + replacement + element.value.slice(end);
      element.selectionStart = element.selectionEnd = start + replacement.length;
    }

    // Adjust cursor position if cursorOffset is specified
    if (resolved.cursorOffset !== undefined) {
      const targetPos = start + resolved.cursorOffset;
      element.setSelectionRange(targetPos, targetPos);
    }

    // Trigger synthetic input and change events for reactive frameworks
    try {
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertReplacementText',
        data: replacement,
      });
      element.dispatchEvent(inputEvent);
    } catch {
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));

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
    if (typeof element.setRangeText === 'function') {
      element.setRangeText(originalTriggerText, startOffset, endOffset, 'end');
    } else {
      element.value =
        element.value.slice(0, startOffset) +
        originalTriggerText +
        element.value.slice(endOffset);
      element.selectionStart = element.selectionEnd = startOffset + originalTriggerText.length;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
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
