/**
 * Content Script Entry: Single capture-phase listener, ultra-lightweight.
 * Performance budget: < 1ms per keystroke.
 * Memory budget: < 2MB idle memory.
 */

import { TriggerMatcher } from '../core/matcher';
import { TemplateResolver } from '../core/resolver';
import { ExpansionUndoContext, Settings, Snippet, TriggerIndex } from '../core/types';
import { PlainInputAdapter } from './adapters/plain-input';
import { RichEditableAdapter } from './adapters/rich-editable';
import { InPageChip } from './chip';
import { EditorDetector } from './detector';
import { ExpansionUndoManager } from './undo';

class VerbatimContentScript {
  private matcher: TriggerMatcher = new TriggerMatcher();
  private settings: Settings | null = null;
  private isExcluded = false;
  private isInitialized = false;
  private isExpanding = false;
  private lastExpandedAt = 0;

  public async init(): Promise<void> {
    try {
      if (this.isInitialized) return;
      this.isInitialized = true;

      // Check context validity
      if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
        return;
      }

      await this.syncState();
      this.attachListeners();
      this.listenForBroadcasts();
    } catch {
      // Gracefully handle extension context invalidated or initial disconnect
    }
  }

  private async syncState(): Promise<void> {
    if (!chrome.runtime?.id) return;

    try {
      const response: any = await this.sendMessagePromise('GET_SETTINGS');
      if (response?.data) {
        this.settings = response.data;
        const host = window.location.hostname.toLowerCase();
        this.isExcluded = (this.settings?.excludedDomains || []).some(
          (d) => host === d.toLowerCase() || host.endsWith('.' + d.toLowerCase())
        );
      }

      const isPaused = this.isExcluded || this.settings?.enabled === false;
      if (isPaused) {
        this.matcher.updateIndex({}); // Clear triggers completely so nothing can expand
        return;
      }

      const indexRes: any = await this.sendMessagePromise('GET_TRIGGER_INDEX');
      if (indexRes?.data) {
        this.matcher.updateIndex(indexRes.data as TriggerIndex);
      }
    } catch {
      // Ignore background sync errors
    }
  }

  private attachListeners(): void {
    // Single capture-phase listeners on document
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('input', this.handleInput, true);
  }

  private listenForBroadcasts(): void {
    if (typeof chrome === 'undefined') return;

    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.type === 'SNIPPETS_UPDATED' || message?.type === 'SETTINGS_UPDATED') {
          this.syncState();
        }
        return false;
      });
    }

    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes['verbatim_settings_v1'] || changes['verbatim_trigger_index_v1'])) {
          this.syncState();
        }
      });
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.isExcluded || this.settings?.enabled === false) return;

    // 1. Esc key checks undo first (only for trusted user keystrokes)
    if (e.key === 'Escape' && e.isTrusted && ExpansionUndoManager.canUndo()) {
      e.stopPropagation();
      e.preventDefault();
      ExpansionUndoManager.undo();
      InPageChip.dismiss();
      return;
    }
  };

  private handleInput = async (e: Event): Promise<void> => {
    if (this.isExcluded || this.settings?.enabled === false) return;
    if (this.isExpanding || Date.now() - this.lastExpandedAt < 400) return;
    if (typeof chrome === 'undefined' || !chrome.runtime?.id) return;

    // Quick gate check: skip composition events (e.g. CJK IME in progress)
    if ((e as InputEvent).isComposing) return;

    const { element, type } = EditorDetector.detectCurrentEditor(e.target as Element);
    if (!element || type === 'unsupported') return;

    // Fast tail retrieval (< 0.05ms)
    let tail = '';
    try {
      if (type === 'plain-input') {
        tail = PlainInputAdapter.getTail(element as HTMLInputElement | HTMLTextAreaElement);
      } else if (type === 'rich-editable') {
        tail = RichEditableAdapter.getTail(element);
      }
    } catch {
      return;
    }

    if (!tail) return;

    // Core matcher lookup (< 0.01ms)
    const match = this.matcher.matchTail(tail);
    if (!match) return;

    // Trigger matched! Lock expansion to prevent duplicate executions
    this.isExpanding = true;
    try {
      const snipRes: any = await this.sendMessagePromise('EXPAND_TRIGGER', {
        snippetId: match.snippetId,
      });

      if (!snipRes?.data) return;
      const snippet: Snippet = snipRes.data;

      // Resolve variables ({date}, {time}, {cursor}, etc.)
      const resolved = TemplateResolver.resolve(snippet.body);

      let undoCtx: ExpansionUndoContext | null = null;
      let coords = null;

      if (type === 'plain-input') {
        const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
        undoCtx = PlainInputAdapter.replaceTrigger(
          inputEl,
          match.tailLength,
          resolved,
          snippet.id,
          match.matchedTrigger
        );
        coords = PlainInputAdapter.getCaretCoordinates(inputEl);
      } else if (type === 'rich-editable') {
        undoCtx = RichEditableAdapter.replaceTrigger(
          element,
          match.tailLength,
          resolved,
          snippet.id,
          match.matchedTrigger
        );
        coords = RichEditableAdapter.getCaretCoordinates(element);
      }

      if (undoCtx) {
        ExpansionUndoManager.record(undoCtx, element);

        if (this.settings?.showChip !== false) {
          InPageChip.show(
            snippet.trigger,
            coords,
            () => ExpansionUndoManager.undo(),
            this.settings?.chipDurationMs || 1800
          );
        }
      }
    } catch {
      // Catch disconnected port gracefully
    } finally {
      this.lastExpandedAt = Date.now();
      setTimeout(() => {
        this.isExpanding = false;
      }, 150);
    }
  };

  private sendMessagePromise(type: string, payload?: any): Promise<any> {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type, payload }, (res) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false });
          } else {
            resolve(res);
          }
        });
      } catch {
        resolve({ success: false });
      }
    });
  }
}

// Boot content script
const verbatim = new VerbatimContentScript();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => verbatim.init(), { once: true });
} else {
  verbatim.init();
}
