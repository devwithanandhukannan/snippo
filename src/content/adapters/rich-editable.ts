/**
 * Rich Editable Adapter: Handles contenteditable editors (WhatsApp Web, Gmail, Notion, Slack, etc.).
 * Uses Universal DOM Range + Selection.modify + execCommand for seamless integration with
 * Lexical, Draft.js, Slate, ProseMirror, and native contenteditable.
 */

import { CaretCoordinates, ExpansionUndoContext, ResolvedText } from '../../core/types';

export class RichEditableAdapter {
  /**
   * Retrieves tail text before caret across any rich text editor structure.
   */
  public static getTail(element: HTMLElement, maxLen = 32): string {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return '';

    const range = sel.getRangeAt(0);

    // Strategy 1: Direct text node inspection if caret is in a TEXT_NODE
    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startContainer.textContent) {
      const text = range.startContainer.textContent;
      const offset = range.startOffset;
      const start = Math.max(0, offset - maxLen);
      const tail = text.slice(start, offset);
      if (tail) return tail;
    }

    // Strategy 2: Universal DOM Range extraction (handles Lexical, WhatsApp Web, Slack, etc.)
    try {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      const text = preCaretRange.toString();
      if (text) {
        return text.slice(Math.max(0, text.length - maxLen));
      }
    } catch {
      // Fallback
    }

    // Strategy 3: Element innerText / textContent fallback
    try {
      const full = (element.innerText || element.textContent || '').replace(/\r?\n$/, '');
      if (full) {
        return full.slice(Math.max(0, full.length - maxLen));
      }
    } catch {
      // Fallback
    }

    return '';
  }

  /**
   * Replaces trigger in contenteditable with rich text editor framework compatibility.
   */
  public static replaceTrigger(
    element: HTMLElement,
    triggerLength: number,
    resolved: ResolvedText,
    snippetId: string,
    originalTrigger: string
  ): ExpansionUndoContext | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const replacement = resolved.text;
    let replacedSuccessfully = false;

    // Strategy 1: Selection.modify backward selection (the gold standard for Lexical / WhatsApp Web / Draft.js)
    try {
      sel.collapseToEnd();
      for (let i = 0; i < triggerLength; i++) {
        (sel as any).modify?.('extend', 'backward', 'character');
      }

      // Check if selected text matches trigger or length
      const selected = sel.toString();
      if (selected.length === triggerLength || selected === originalTrigger) {
        replacedSuccessfully = document.execCommand('insertText', false, replacement);
      }
    } catch {
      replacedSuccessfully = false;
    }

    // Strategy 2: Direct DOM Range replacement fallback if execCommand was not supported
    if (!replacedSuccessfully && sel.rangeCount > 0) {
      try {
        const range = sel.getRangeAt(0);
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const node = range.startContainer;
          const offset = range.startOffset;
          const start = Math.max(0, offset - triggerLength);

          const replaceRange = document.createRange();
          replaceRange.setStart(node, start);
          replaceRange.setEnd(node, offset);

          sel.removeAllRanges();
          sel.addRange(replaceRange);

          try {
            replacedSuccessfully = document.execCommand('insertText', false, replacement);
          } catch {
            replacedSuccessfully = false;
          }

          if (!replacedSuccessfully) {
            replaceRange.deleteContents();
            const textNode = document.createTextNode(replacement);
            replaceRange.insertNode(textNode);

            const newRange = document.createRange();
            newRange.setStartAfter(textNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            replacedSuccessfully = true;

            // Only dispatch synthetic event if native execCommand failed
            try {
              element.dispatchEvent(
                new InputEvent('input', {
                  bubbles: true,
                  cancelable: true,
                  inputType: 'insertReplacementText',
                  data: replacement,
                })
              );
            } catch {
              element.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }
      } catch {
        // Fallback
      }
    }

    // Handle cursor positioning if requested
    if (resolved.cursorOffset !== undefined) {
      try {
        const curSel = window.getSelection();
        if (curSel && curSel.rangeCount > 0) {
          // Adjust cursor backward if cursorOffset is less than replacement length
          const offsetFromEnd = replacement.length - resolved.cursorOffset;
          for (let i = 0; i < offsetFromEnd; i++) {
            (curSel as any).modify?.('move', 'backward', 'character');
          }
        }
      } catch {
        // Ignore cursor reposition failure
      }
    }

    return {
      id: 'undo-' + Date.now(),
      snippetId,
      trigger: originalTrigger,
      expandedText: replacement,
      timestamp: Date.now(),
      editorType: 'rich-editable',
      restoreData: {
        startOffset: 0,
        endOffset: replacement.length,
        originalTriggerText: originalTrigger,
      },
    };
  }

  public static undo(element: HTMLElement, context: ExpansionUndoContext): void {
    // Attempt standard browser undo first
    try {
      if (document.execCommand('undo')) return;
    } catch {
      // Fallback
    }

    // Fallback: replace expandedText with originalTrigger
    const sel = window.getSelection();
    if (!sel) return;

    try {
      sel.collapseToEnd();
      for (let i = 0; i < context.expandedText.length; i++) {
        (sel as any).modify?.('extend', 'backward', 'character');
      }
      document.execCommand('insertText', false, context.restoreData.originalTriggerText);
    } catch {
      // Fallback
    }
  }

  public static getCaretCoordinates(element: HTMLElement): CaretCoordinates | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    try {
      const range = sel.getRangeAt(0).cloneRange();
      range.collapse(true);
      const rect = range.getBoundingClientRect();
      if (rect.width !== 0 || rect.height !== 0) {
        return {
          x: rect.left,
          y: rect.top,
          height: rect.height || 20,
        };
      }
    } catch {
      // Fallback
    }

    const elRect = element.getBoundingClientRect();
    return {
      x: elRect.left + 16,
      y: elRect.top + 8,
      height: 20,
    };
  }
}
