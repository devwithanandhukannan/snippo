/**
 * Content Script Entry: Single capture-phase listener, ultra-lightweight.
 * Performance budget: < 1ms per keystroke.
 * Features:
 *  - Inline suggestion palette (Notion/Slack style)
 *  - Quick Launcher (Raycast/Spotlight Alt+Shift+K)
 *  - Dynamic fill-in variables popup
 *  - Robust clipboard paste simulation for WhatsApp Web & rich editors
 */

import { TriggerMatcher } from '../core/matcher';
import { TemplateResolver } from '../core/resolver';
import { CaretCoordinates, EditorType, ExpansionUndoContext, Settings, Snippet, TriggerIndex } from '../core/types';
import { PlainInputAdapter } from './adapters/plain-input';
import { RichEditableAdapter } from './adapters/rich-editable';
import { InPageChip } from './chip';
import { EditorDetector } from './detector';
import { FillInDialog } from './fill-in';
import { QuickLauncher } from './launcher';
import { InLinePalette } from './palette';
import { ExpansionUndoManager } from './undo';

class VerbatimContentScript {
  private matcher: TriggerMatcher = new TriggerMatcher();
  private settings: Settings | null = null;
  private allSnippets: Snippet[] = [];
  private isExcluded = false;
  private isInitialized = false;
  private isExpanding = false;
  private lastExpandedAt = 0;
  private lastActiveElement: HTMLElement | null = null;

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
        this.matcher.updateIndex({});
        this.allSnippets = [];
        return;
      }

      const [indexRes, allRes]: any = await Promise.all([
        this.sendMessagePromise('GET_TRIGGER_INDEX'),
        this.sendMessagePromise('GET_ALL_SNIPPETS'),
      ]);

      if (indexRes?.data) {
        this.matcher.updateIndex(indexRes.data as TriggerIndex);
      }
      if (allRes?.data) {
        this.allSnippets = allRes.data as Snippet[];
      }
    } catch {
      // Ignore background sync errors
    }
  }

  private attachListeners(): void {
    // Single capture-phase listeners on document
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('input', this.handleInput, true);
    document.addEventListener('focusin', this.handleFocusIn, true);
  }

  private handleFocusIn = (e: FocusEvent): void => {
    const target = e.target as HTMLElement;
    if (target && !EditorDetector.isSkipListElement(target)) {
      this.lastActiveElement = target;
    }
  };

  private listenForBroadcasts(): void {
    if (typeof chrome === 'undefined') return;

    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.type === 'SNIPPETS_UPDATED' || message?.type === 'SETTINGS_UPDATED') {
          this.syncState();
        } else if (message?.type === 'OPEN_LAUNCHER') {
          this.openQuickLauncher();
        } else if (message?.type === 'INSERT_SNIPPET' && message.payload?.snippet) {
          this.insertSnippetFromExternal(message.payload.snippet);
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

    // 1. Quick Launcher Shortcut: Alt + Shift + K (or Alt + Shift + Space)
    if (e.altKey && e.shiftKey && (e.key === 'K' || e.code === 'KeyK' || e.key === ' ' || e.code === 'Space')) {
      e.stopPropagation();
      e.preventDefault();
      this.openQuickLauncher();
      return;
    }

    // 2. Delegate to InLinePalette if open
    if (InLinePalette.isOpen()) {
      const handled = InLinePalette.handleKeyDown(e);
      if (handled) return;
    }

    // 3. Esc key checks undo first (only for trusted user keystrokes)
    if (e.key === 'Escape' && e.isTrusted) {
      if (InLinePalette.isOpen()) {
        InLinePalette.dismiss();
        return;
      }
      if (ExpansionUndoManager.canUndo()) {
        e.stopPropagation();
        e.preventDefault();
        ExpansionUndoManager.undo();
        InPageChip.dismiss();
        return;
      }
    }
  };

  private handleInput = async (e: Event): Promise<void> => {
    if (this.isExcluded || this.settings?.enabled === false) return;
    if (this.isExpanding || Date.now() - this.lastExpandedAt < 400) return;
    if (typeof chrome === 'undefined' || !chrome.runtime?.id) return;

    // Quick gate check: skip composition events (e.g. CJK IME in progress)
    if ((e as InputEvent).isComposing) return;

    const { element, type } = EditorDetector.detectCurrentEditor(e.target as Element);
    if (!element || type === 'unsupported') {
      InLinePalette.dismiss();
      return;
    }

    this.lastActiveElement = element;

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

    if (!tail) {
      InLinePalette.dismiss();
      return;
    }

    // Core matcher lookup for exact trigger match (< 0.01ms)
    const match = this.matcher.matchTail(tail);
    if (match) {
      InLinePalette.dismiss();
      this.expandTrigger(match.snippetId, match.tailLength, match.matchedTrigger, element, type);
      return;
    }

    // Check for inline suggestion palette matching (e.g. user typed / or ; or : and is typing)
    this.checkInLinePalette(tail, element, type);
  };

  /**
   * Shows inline autocomplete dropdown when user types a trigger prefix.
   */
  private checkInLinePalette(tail: string, element: HTMLElement, type: EditorType): void {
    if (this.allSnippets.length === 0) {
      InLinePalette.dismiss();
      return;
    }

    // Find trigger token at caret end (e.g. "/em" or ";o" or ":date" or ",,sig")
    const match = tail.match(/(?:^|\s)([/;:!]|,,)([a-zA-Z0-9_\-]*)$/);
    if (!match) {
      InLinePalette.dismiss();
      return;
    }

    const fullTyped = match[1] + match[2];
    const prefix = match[1];
    const query = match[2].toLowerCase();

    // Find matching snippets
    const matches = this.allSnippets.filter((s) => {
      if (s.enabled === false) return false;
      const trigLower = s.trigger.toLowerCase();
      return (
        trigLower.startsWith(fullTyped.toLowerCase()) ||
        trigLower.replace(/^[/;:!]|,,/, '').startsWith(query) ||
        (s.description && s.description.toLowerCase().includes(query))
      );
    });

    if (matches.length === 0) {
      InLinePalette.dismiss();
      return;
    }

    // Get caret coordinates
    let coords: CaretCoordinates | null = null;
    if (type === 'plain-input') {
      coords = PlainInputAdapter.getCaretCoordinates(element as HTMLInputElement | HTMLTextAreaElement);
    } else if (type === 'rich-editable') {
      coords = RichEditableAdapter.getCaretCoordinates(element);
    }

    InLinePalette.show(matches, coords, (snippet) => {
      this.expandTrigger(snippet.id, fullTyped.length, fullTyped, element, type);
    });
  }

  /**
   * Expands a snippet with dynamic fill-in dialog support.
   */
  private async expandTrigger(
    snippetId: string,
    tailLength: number,
    originalTrigger: string,
    element: HTMLElement,
    type: EditorType
  ): Promise<void> {
    if (this.isExpanding) return;
    this.isExpanding = true;

    try {
      const snipRes: any = await this.sendMessagePromise('EXPAND_TRIGGER', { snippetId });
      if (!snipRes?.data) return;
      const snippet: Snippet = snipRes.data;

      // Check if template has fill-in variables (e.g. {name}, {phone}, {fill:Customer})
      const fillFields = TemplateResolver.getFillInVariables(snippet.body);

      let coords: CaretCoordinates | null = null;
      if (type === 'plain-input') {
        coords = PlainInputAdapter.getCaretCoordinates(element as HTMLInputElement | HTMLTextAreaElement);
      } else if (type === 'rich-editable') {
        coords = RichEditableAdapter.getCaretCoordinates(element);
      }

      if (fillFields.length > 0) {
        // Open interactive fill-in modal
        FillInDialog.show(snippet, fillFields, coords, (fillValues) => {
          this.executeExpansion(snippet, tailLength, originalTrigger, element, type, fillValues);
        });
      } else {
        this.executeExpansion(snippet, tailLength, originalTrigger, element, type);
      }
    } catch {
      // Gracefully handle disconnect
    } finally {
      this.lastExpandedAt = Date.now();
      setTimeout(() => {
        this.isExpanding = false;
      }, 150);
    }
  }

  /**
   * Executes the text replacement and records undo.
   */
  private executeExpansion(
    snippet: Snippet,
    tailLength: number,
    originalTrigger: string,
    element: HTMLElement,
    type: EditorType,
    fillValues?: Record<string, string>
  ): void {
    const resolved = TemplateResolver.resolve(snippet.body, { fillValues });
    let undoCtx: ExpansionUndoContext | null = null;
    let coords: CaretCoordinates | null = null;

    if (type === 'plain-input') {
      const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
      undoCtx = PlainInputAdapter.replaceTrigger(
        inputEl,
        tailLength,
        resolved,
        snippet.id,
        originalTrigger
      );
      coords = PlainInputAdapter.getCaretCoordinates(inputEl);
    } else if (type === 'rich-editable') {
      undoCtx = RichEditableAdapter.replaceTrigger(
        element,
        tailLength,
        resolved,
        snippet.id,
        originalTrigger
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
  }

  /**
   * Opens Raycast/Alfred-style quick launcher.
   */
  private openQuickLauncher(): void {
    const active = EditorDetector.detectCurrentEditor();
    if (active.element) {
      this.lastActiveElement = active.element;
    }

    QuickLauncher.show(this.allSnippets, (snippet) => {
      this.insertSnippetFromExternal(snippet);
    });
  }

  /**
   * Inserts snippet from QuickLauncher or Context Menu.
   */
  private insertSnippetFromExternal(snippet: Snippet): void {
    const target = this.lastActiveElement || (EditorDetector.detectCurrentEditor().element);
    if (!target) return;

    const fillFields = TemplateResolver.getFillInVariables(snippet.body);
    if (fillFields.length > 0) {
      FillInDialog.show(snippet, fillFields, null, (fillValues) => {
        const resolved = TemplateResolver.resolve(snippet.body, { fillValues });
        this.injectTextIntoElement(target, resolved.text);
      });
    } else {
      const resolved = TemplateResolver.resolve(snippet.body);
      this.injectTextIntoElement(target, resolved.text);
    }
  }

  private injectTextIntoElement(element: HTMLElement, text: string): void {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      PlainInputAdapter.insertTextDirectly(element, text);
    } else {
      RichEditableAdapter.insertTextDirectly(element, text);
    }
  }

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
