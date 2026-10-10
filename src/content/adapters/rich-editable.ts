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

    const originalRange = sel.getRangeAt(0).cloneRange();
    const replacement = resolved.text;
    let replacedSuccessfully = false;

    // Strategy 1: Accurate Text Node Range (Primary for WhatsApp Web / Lexical / React)
    try {
      let textNode: Node | null = null;
      let caretOffset = 0;

      if (originalRange.endContainer.nodeType === Node.TEXT_NODE) {
        textNode = originalRange.endContainer;
        caretOffset = originalRange.endOffset;
      } else if (originalRange.endContainer.nodeType === Node.ELEMENT_NODE) {
        const container = originalRange.endContainer as HTMLElement;
        const child =
          container.childNodes[originalRange.endOffset - 1] ||
          container.childNodes[originalRange.endOffset];
        if (child) {
          if (child.nodeType === Node.TEXT_NODE) {
            textNode = child;
            caretOffset = child.textContent?.length || 0;
          } else {
            const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);
            let last: Node | null = null;
            while (walker.nextNode()) last = walker.currentNode;
            if (last) {
              textNode = last;
              caretOffset = last.textContent?.length || 0;
            }
          }
        }
      }

      if (textNode && textNode.textContent) {
        const textContent = textNode.textContent;
        const beforeCaret = textContent.slice(0, caretOffset);
        const cleanBefore = beforeCaret.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

        if (cleanBefore.toLowerCase().endsWith(originalTrigger.toLowerCase())) {
          let charsToMatch = triggerLength;
          let rawStartIndex = caretOffset;
          for (let i = caretOffset - 1; i >= 0; i--) {
            const c = textContent[i];
            if (c === '\u200B' || c === '\u200C' || c === '\u200D' || c === '\uFEFF') continue;
            charsToMatch--;
            if (charsToMatch === 0) {
              rawStartIndex = i;
              break;
            }
          }

          const triggerRange = document.createRange();
          triggerRange.setStart(textNode, rawStartIndex);
          triggerRange.setEnd(textNode, caretOffset);

          sel.removeAllRanges();
          sel.addRange(triggerRange);

          if (document.activeElement !== element && !element.contains(document.activeElement)) {
            element.focus();
          }

          replacedSuccessfully = document.execCommand('insertText', false, replacement);
        }
      }
    } catch {
      replacedSuccessfully = false;
    }

    // Strategy 2: Multi-Node DOM Range (Handles triggers split across spans)
    if (!replacedSuccessfully) {
      try {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const nodes: { node: Node; len: number }[] = [];
        let activeIndex = -1;
        let endContainerOffset = originalRange.endOffset;

        while (walker.nextNode()) {
          const n = walker.currentNode;
          const len = n.textContent?.length || 0;
          nodes.push({ node: n, len });
          if (n === originalRange.endContainer) {
            activeIndex = nodes.length - 1;
          }
        }

        if (activeIndex === -1 && nodes.length > 0) {
          activeIndex = nodes.length - 1;
          endContainerOffset = nodes[activeIndex].len;
        }

        if (activeIndex >= 0) {
          let needed = triggerLength;
          let currIdx = activeIndex;
          let currOffset = endContainerOffset;
          let startNode: Node | null = null;
          let startOffset = 0;

          while (currIdx >= 0 && needed > 0) {
            const item = nodes[currIdx];
            const avail = currOffset;
            if (avail >= needed) {
              startNode = item.node;
              startOffset = avail - needed;
              needed = 0;
              break;
            } else {
              needed -= avail;
              currIdx--;
              if (currIdx >= 0) {
                currOffset = nodes[currIdx].len;
              }
            }
          }

          if (startNode && needed === 0) {
            const multiRange = document.createRange();
            multiRange.setStart(startNode, startOffset);
            multiRange.setEnd(nodes[activeIndex].node, endContainerOffset);

            sel.removeAllRanges();
            sel.addRange(multiRange);

            if (document.activeElement !== element && !element.contains(document.activeElement)) {
              element.focus();
            }

            replacedSuccessfully = document.execCommand('insertText', false, replacement);
          }
        }
      } catch {
        replacedSuccessfully = false;
      }
    }

    // Strategy 3: Selection.modify backward extension (fallback for native contenteditable)
    if (!replacedSuccessfully) {
      try {
        sel.removeAllRanges();
        sel.addRange(originalRange);
        sel.collapse(originalRange.endContainer, originalRange.endOffset);

        for (let i = 0; i < triggerLength; i++) {
          (sel as any).modify?.('extend', 'backward', 'character');
        }

        const selected = sel.toString().replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
        if (
          selected.toLowerCase().endsWith(originalTrigger.toLowerCase()) ||
          selected.length === triggerLength
        ) {
          replacedSuccessfully = document.execCommand('insertText', false, replacement);
        }
      } catch {
        replacedSuccessfully = false;
      }
    }

    // Notify framework via input event
    if (replacedSuccessfully) {
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
    } else {
      // If replacement failed, do not return fake undo context
      return null;
    }

    // Handle cursor positioning if requested
    if (resolved.cursorOffset !== undefined) {
      try {
        const curSel = window.getSelection();
        if (curSel && curSel.rangeCount > 0) {
          const offsetFromEnd = replacement.length - resolved.cursorOffset;
          for (let i = 0; i < offsetFromEnd; i++) {
            (curSel as any).modify?.('move', 'backward', 'character');
          }
        }
      } catch {}
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
