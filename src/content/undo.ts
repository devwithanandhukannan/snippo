/**
 * Expansion Undo Manager: Tracks the last text expansion and restores previous state.
 * Forgiving principle: Every expansion can be undone instantly on Escape.
 */

import { ExpansionUndoContext } from '../core/types';
import { PlainInputAdapter } from './adapters/plain-input';
import { RichEditableAdapter } from './adapters/rich-editable';

export class ExpansionUndoManager {
  private static lastContext: ExpansionUndoContext | null = null;
  private static targetElementRef: WeakRef<HTMLElement> | null = null;
  private static undoTimeout: any = null;

  public static record(context: ExpansionUndoContext, element: HTMLElement): void {
    if (this.undoTimeout) {
      clearTimeout(this.undoTimeout);
    }

    this.lastContext = context;
    this.targetElementRef = new WeakRef(element);

    // Keep undo available for 6 seconds
    this.undoTimeout = setTimeout(() => {
      this.clear();
    }, 6000);
  }

  public static canUndo(): boolean {
    return !!(this.lastContext && this.targetElementRef?.deref());
  }

  public static undo(): boolean {
    if (!this.lastContext || !this.targetElementRef) return false;

    const el = this.targetElementRef.deref();
    if (!el) {
      this.clear();
      return false;
    }

    try {
      if (this.lastContext.editorType === 'plain-input') {
        PlainInputAdapter.undo(
          el as HTMLInputElement | HTMLTextAreaElement,
          this.lastContext
        );
      } else if (this.lastContext.editorType === 'rich-editable') {
        RichEditableAdapter.undo(el, this.lastContext);
      }

      this.clear();
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  public static clear(): void {
    if (this.undoTimeout) {
      clearTimeout(this.undoTimeout);
      this.undoTimeout = null;
    }
    this.lastContext = null;
    this.targetElementRef = null;
  }
}
