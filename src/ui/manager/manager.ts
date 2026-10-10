/**
 * Verbatim Manager Workspace Controller
 * Implements Fitts's Law, Hick's Law, Jakob's Law, Miller's Law, Loss Aversion, and Error Prevention.
 */

import { ConflictDetector } from '../../core/conflicts';
import { TriggerMatcher } from '../../core/matcher';
import { TemplateResolver } from '../../core/resolver';
import { Settings, Snippet } from '../../core/types';
import { BackupManager } from '../../data/import-export';
import { SnippetStore } from '../../data/store';

class ManagerWorkspace {
  private snippets: Snippet[] = [];
  private settings!: Settings;
  private selectedSnippetId: string | null = null;
  private activeFolder = 'All';
  private searchQuery = '';
  private deletedSnippetStack: Snippet[] = [];
  private undoTimer: any = null;
  private undoSecondsRemaining = 8;
  private testMatcher = new TriggerMatcher();

  public async init(): Promise<void> {
    await SnippetStore.init();
    this.settings = await SnippetStore.getSettings();
    this.snippets = await SnippetStore.getAllSnippets();

    this.renderVariablesToolbar();
    this.setupEventListeners();
    this.setupLivePractice();
    this.renderFolders();
    this.renderSnippetList();
    this.renderSettings();

    // Check URL hash for target snippet
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get('prefill');

    if (hash === 'new' || prefill) {
      this.createNewSnippet(prefill ? decodeURIComponent(prefill) : undefined);
    } else if (hash && this.snippets.some((s) => s.id === hash)) {
      this.selectSnippet(hash);
    } else if (this.snippets.length > 0) {
      this.selectSnippet(this.snippets[0].id);
    } else {
      this.createNewSnippet();
    }
  }

  // --- Renderers ---

  private renderFolders(): void {
    const nav = document.getElementById('sidebar-folders-nav');
    if (!nav) return;

    // Discover unique folders
    const folderSet = new Set<string>();
    this.snippets.forEach((s) => {
      if (s.folder) folderSet.add(s.folder);
    });

    const folders = ['All', ...Array.from(folderSet)];
    nav.innerHTML = '';

    folders.forEach((f) => {
      const tab = document.createElement('button');
      tab.className = `folder-tab ${this.activeFolder === f ? 'active' : ''}`;
      tab.textContent = f;
      tab.addEventListener('click', () => {
        this.activeFolder = f;
        this.renderFolders();
        this.renderSnippetList();
      });
      nav.appendChild(tab);
    });

    // Update folder datalist for input autocompletion
    const datalist = document.getElementById('folder-datalist');
    if (datalist) {
      datalist.innerHTML = '';
      folders.filter((f) => f !== 'All').forEach((f) => {
        const opt = document.createElement('option');
        opt.value = f;
        datalist.appendChild(opt);
      });
    }
  }

  private renderSnippetList(): void {
    const listEl = document.getElementById('sidebar-snippet-list');
    const statsLabel = document.getElementById('total-stats-label');
    if (!listEl) return;

    listEl.innerHTML = '';

    let filtered = this.snippets;

    // Filter by folder
    if (this.activeFolder !== 'All') {
      filtered = filtered.filter((s) => s.folder === this.activeFolder);
    }

    // Filter by search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.trigger.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }

    if (statsLabel) {
      statsLabel.textContent = `${this.snippets.length} snippet${this.snippets.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-tertiary); font-size: 13px;">
          No snippets found
        </div>
      `;
      return;
    }

    filtered.forEach((snippet) => {
      const item = document.createElement('div');
      item.className = `list-item-snippet ${snippet.id === this.selectedSnippetId ? 'active' : ''}`;
      item.setAttribute('data-id', snippet.id);

      item.innerHTML = `
        <div class="list-item-top">
          <span class="badge-trigger">${this.escapeHtml(snippet.trigger)}</span>
          <span class="badge-count">${snippet.usageCount || 0}×</span>
        </div>
        <div class="list-item-title">${this.escapeHtml(snippet.description || snippet.trigger)}</div>
        <div class="list-item-body">${this.escapeHtml(snippet.body.replace(/\n/g, ' '))}</div>
      `;

      item.addEventListener('click', () => {
        this.selectSnippet(snippet.id);
      });

      listEl.appendChild(item);
    });
  }

  private renderVariablesToolbar(): void {
    const toolbar = document.getElementById('variables-toolbar');
    if (!toolbar) return;

    toolbar.innerHTML = '';
    const vars = TemplateResolver.getAvailableVariables();

    vars.forEach((v) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'pill-variable';
      pill.title = `Preview: ${v.preview}`;
      pill.innerHTML = `<span>+</span> <span>${v.tag}</span>`;

      pill.addEventListener('click', () => {
        this.insertTagIntoBody(v.tag);
      });

      toolbar.appendChild(pill);
    });
  }

  private selectSnippet(id: string): void {
    this.selectedSnippetId = id;
    this.showEditorView();

    const snippet = this.snippets.find((s) => s.id === id);
    if (!snippet) return;

    // Update sidebar active selection
    document.querySelectorAll('.list-item-snippet').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-id') === id);
    });

    // Populate editor fields
    const triggerBadge = document.getElementById('detail-trigger-badge');
    const usageBadge = document.getElementById('detail-usage-badge');
    const enabledSwitch = document.getElementById('detail-enabled-switch') as HTMLInputElement;
    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    const folderInput = document.getElementById('detail-folder-input') as HTMLInputElement;
    const descInput = document.getElementById('detail-desc-input') as HTMLInputElement;
    const bodyTextarea = document.getElementById('detail-body-textarea') as HTMLTextAreaElement;
    const prefixDisplay = document.getElementById('trigger-prefix-display');

    if (triggerBadge) triggerBadge.textContent = snippet.trigger;
    if (usageBadge) usageBadge.textContent = `${snippet.usageCount || 0} expansions`;
    if (enabledSwitch) enabledSwitch.checked = snippet.enabled;

    // Format trigger without prefix in input if prefix matches
    const prefix = this.settings.triggerPrefix || '';
    if (prefixDisplay) prefixDisplay.textContent = prefix || '•';

    if (prefix && snippet.trigger.startsWith(prefix)) {
      if (triggerInput) triggerInput.value = snippet.trigger.slice(prefix.length);
    } else {
      if (triggerInput) triggerInput.value = snippet.trigger;
    }

    if (folderInput) folderInput.value = snippet.folder || 'General';
    if (descInput) descInput.value = snippet.description || '';
    if (bodyTextarea) bodyTextarea.value = snippet.body || '';

    this.checkTriggerConflict();
    this.updateLiveTestMatcher();
    window.location.hash = snippet.id;
  }

  private createNewSnippet(prefillBody?: string): void {
    const newId = 'snip-' + Math.random().toString(36).slice(2, 9);
    const prefix = this.settings.triggerPrefix || '/';

    const newSnippet: Snippet = {
      id: newId,
      trigger: `${prefix}new`,
      body: prefillBody || '',
      description: 'New Snippet',
      folder: this.activeFolder !== 'All' ? this.activeFolder : 'General',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };

    this.snippets.unshift(newSnippet);
    this.renderFolders();
    this.renderSnippetList();
    this.selectSnippet(newId);

    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    triggerInput?.focus();
    triggerInput?.select();
  }

  // --- Conflict Detection (Error Prevention) ---

  private checkTriggerConflict(): void {
    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    const banner = document.getElementById('conflict-warning-banner');
    const warningText = document.getElementById('conflict-warning-text');
    if (!triggerInput || !banner || !warningText) return;

    const prefix = this.settings.triggerPrefix || '';
    const fullTrigger = prefix + triggerInput.value.trim();

    const conflict = ConflictDetector.checkConflict(
      fullTrigger,
      this.selectedSnippetId,
      this.snippets
    );

    if (conflict.hasConflict && conflict.message) {
      warningText.textContent = conflict.message;
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }

  // --- Insertion Helper ---

  private insertTagIntoBody(tag: string): void {
    const textarea = document.getElementById('detail-body-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;

    textarea.value = val.slice(0, start) + tag + val.slice(end);
    const newPos = start + tag.length;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
  }

  // --- Event Bindings ---

  private setupEventListeners(): void {
    // New snippet button in sidebar
    document.getElementById('btn-sidebar-new')?.addEventListener('click', () => {
      this.createNewSnippet();
    });

    document.getElementById('btn-empty-create')?.addEventListener('click', () => {
      this.createNewSnippet();
    });

    // Search input
    const searchInput = document.getElementById('sidebar-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value.trim();
      this.renderSnippetList();
    });

    // Save button
    document.getElementById('btn-save-snippet')?.addEventListener('click', () => {
      this.saveCurrentSnippet();
    });

    // Delete button (Loss Aversion with 8s Undo Toast)
    document.getElementById('btn-delete-snippet')?.addEventListener('click', () => {
      this.deleteCurrentSnippet();
    });

    // Undo toast button
    document.getElementById('btn-toast-undo')?.addEventListener('click', () => {
      this.restoreDeletedSnippet();
    });

    // Trigger input live check
    document.getElementById('detail-trigger-input')?.addEventListener('input', () => {
      this.checkTriggerConflict();
      const triggerBadge = document.getElementById('detail-trigger-badge');
      const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
      const prefix = this.settings.triggerPrefix || '';
      if (triggerBadge) triggerBadge.textContent = prefix + triggerInput.value.trim();
      this.updateLiveTestMatcher();
    });

    // Settings navigation
    document.getElementById('btn-tab-settings')?.addEventListener('click', () => {
      this.showSettingsView();
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.showEditorView();
    });

    // Export backup
    document.getElementById('btn-export-backup')?.addEventListener('click', async () => {
      const data = await BackupManager.exportBackup();
      BackupManager.downloadBackupFile(data);
    });

    // Import backup
    const importInput = document.getElementById('input-import-file') as HTMLInputElement;
    importInput?.addEventListener('change', async (e) => {
      const file = importInput.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const text = reader.result as string;
        const res = await BackupManager.importBackup(text, 'merge');
        if (res.success) {
          alert(`Successfully imported ${res.importedCount} snippet(s)!`);
          this.snippets = await SnippetStore.getAllSnippets();
          this.renderFolders();
          this.renderSnippetList();
        } else {
          alert('Import failed: ' + res.errors.join(', '));
        }
      };
      reader.readAsText(file);
      importInput.value = '';
    });
  }

  private async saveCurrentSnippet(): Promise<void> {
    if (!this.selectedSnippetId) return;

    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    const folderInput = document.getElementById('detail-folder-input') as HTMLInputElement;
    const descInput = document.getElementById('detail-desc-input') as HTMLInputElement;
    const bodyTextarea = document.getElementById('detail-body-textarea') as HTMLTextAreaElement;
    const enabledSwitch = document.getElementById('detail-enabled-switch') as HTMLInputElement;

    const prefix = this.settings.triggerPrefix || '';
    const cleanTrigger = prefix + triggerInput.value.trim();

    if (!cleanTrigger) {
      alert('Trigger cannot be empty');
      return;
    }

    const current = this.snippets.find((s) => s.id === this.selectedSnippetId);
    if (!current) return;

    const updated: Snippet = {
      ...current,
      trigger: cleanTrigger,
      folder: folderInput.value.trim() || 'General',
      description: descInput.value.trim(),
      body: bodyTextarea.value,
      enabled: enabledSwitch.checked,
      updatedAt: Date.now(),
    };

    await SnippetStore.saveSnippet(updated);
    this.snippets = await SnippetStore.getAllSnippets();

    this.renderFolders();
    this.renderSnippetList();
    this.selectSnippet(updated.id);

    // Save confirmation feedback
    const msg = document.getElementById('save-status-msg');
    if (msg) {
      msg.textContent = 'Saved successfully';
      msg.style.color = 'var(--success-text)';
      setTimeout(() => {
        msg.textContent = 'All changes saved locally';
        msg.style.color = 'var(--text-tertiary)';
      }, 2500);
    }

    // Broadcast update to content scripts
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SNIPPETS_UPDATED' }).catch(() => {});
    }
  }

  // --- Loss Aversion: 8-second Undo Toast ---

  private async deleteCurrentSnippet(): Promise<void> {
    if (!this.selectedSnippetId) return;

    const toDelete = this.snippets.find((s) => s.id === this.selectedSnippetId);
    if (!toDelete) return;

    // Remove from in-memory and storage
    await SnippetStore.deleteSnippet(toDelete.id);
    this.deletedSnippetStack.push(toDelete);
    this.snippets = await SnippetStore.getAllSnippets();

    this.renderFolders();
    this.renderSnippetList();

    if (this.snippets.length > 0) {
      this.selectSnippet(this.snippets[0].id);
    } else {
      this.createNewSnippet();
    }

    this.showUndoToast();
  }

  private showUndoToast(): void {
    const toast = document.getElementById('delete-undo-toast');
    const countdownEl = document.getElementById('undo-countdown');
    if (!toast) return;

    if (this.undoTimer) {
      clearInterval(this.undoTimer);
    }

    this.undoSecondsRemaining = 8;
    if (countdownEl) countdownEl.textContent = '8';
    toast.classList.add('visible');

    this.undoTimer = setInterval(() => {
      this.undoSecondsRemaining--;
      if (countdownEl) countdownEl.textContent = String(this.undoSecondsRemaining);

      if (this.undoSecondsRemaining <= 0) {
        clearInterval(this.undoTimer);
        this.undoTimer = null;
        toast.classList.remove('visible');
        this.deletedSnippetStack = [];
      }
    }, 1000);
  }

  private async restoreDeletedSnippet(): Promise<void> {
    const restored = this.deletedSnippetStack.pop();
    if (!restored) return;

    if (this.undoTimer) {
      clearInterval(this.undoTimer);
      this.undoTimer = null;
    }
    const toast = document.getElementById('delete-undo-toast');
    toast?.classList.remove('visible');

    await SnippetStore.saveSnippet(restored);
    this.snippets = await SnippetStore.getAllSnippets();
    this.renderFolders();
    this.renderSnippetList();
    this.selectSnippet(restored.id);
  }

  // --- Live Practice Field ---

  private setupLivePractice(): void {
    const input = document.getElementById('live-test-field') as HTMLInputElement;
    if (!input) return;

    this.updateLiveTestMatcher();

    input.addEventListener('input', () => {
      const val = input.value;
      const match = this.testMatcher.matchTail(val);
      if (match) {
        const snippet = this.snippets.find((s) => s.id === match.snippetId);
        if (snippet) {
          const resolved = TemplateResolver.resolve(snippet.body);
          const start = val.length - match.tailLength;
          input.value = val.slice(0, start) + resolved.text;
          const cursorPos =
            resolved.cursorOffset !== undefined
              ? start + resolved.cursorOffset
              : input.value.length;
          input.setSelectionRange(cursorPos, cursorPos);
        }
      }
    });
  }

  private updateLiveTestMatcher(): void {
    const index: Record<string, any> = {};
    this.snippets.forEach((s) => {
      if (s.enabled) {
        index[s.trigger] = { id: s.id, trigger: s.trigger, enabled: true };
      }
    });
    this.testMatcher.updateIndex(index);
  }

  // --- Views Switching ---

  private showEditorView(): void {
    const editor = document.getElementById('editor-view');
    const settings = document.getElementById('settings-view');
    const empty = document.getElementById('workspace-empty-state');
    if (editor) editor.style.display = 'flex';
    if (settings) settings.style.display = 'none';
    if (empty) empty.style.display = 'none';
  }

  private showSettingsView(): void {
    const editor = document.getElementById('editor-view');
    const settings = document.getElementById('settings-view');
    const empty = document.getElementById('workspace-empty-state');
    if (editor) editor.style.display = 'none';
    if (settings) settings.style.display = 'flex';
    if (empty) empty.style.display = 'none';
  }

  // --- Settings Controller ---

  private renderSettings(): void {
    const prefixSelect = document.getElementById('setting-prefix-select') as HTMLSelectElement;
    const modeSelect = document.getElementById('setting-expand-mode') as HTMLSelectElement;

    if (prefixSelect) {
      prefixSelect.value = this.settings.triggerPrefix;
      prefixSelect.addEventListener('change', async () => {
        this.settings = await SnippetStore.updateSettings({
          triggerPrefix: prefixSelect.value,
        });
        const prefixDisplay = document.getElementById('trigger-prefix-display');
        if (prefixDisplay) prefixDisplay.textContent = this.settings.triggerPrefix || '•';
      });
    }

    if (modeSelect) {
      modeSelect.value = this.settings.expandOn;
      modeSelect.addEventListener('change', async () => {
        this.settings = await SnippetStore.updateSettings({
          expandOn: modeSelect.value as any,
        });
      });
    }

    this.renderExclusionList();

    // Add exclusion domain button
    document.getElementById('btn-add-exclusion')?.addEventListener('click', async () => {
      const input = document.getElementById('new-exclusion-input') as HTMLInputElement;
      if (!input || !input.value.trim()) return;

      const domain = input.value.trim().toLowerCase();
      await SnippetStore.toggleDomainExclusion(domain);
      this.settings = await SnippetStore.getSettings();
      input.value = '';
      this.renderExclusionList();
    });
  }

  private renderExclusionList(): void {
    const listEl = document.getElementById('exclusion-domains-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const domains = this.settings.excludedDomains || [];

    if (domains.length === 0) {
      listEl.innerHTML = '<span class="text-xs text-muted">No websites currently excluded.</span>';
      return;
    }

    domains.forEach((d) => {
      const chip = document.createElement('div');
      chip.className = 'exclusion-chip';
      chip.innerHTML = `
        <span>${this.escapeHtml(d)}</span>
        <button class="exclusion-remove-btn" title="Remove exclusion">×</button>
      `;

      chip.querySelector('.exclusion-remove-btn')?.addEventListener('click', async () => {
        await SnippetStore.toggleDomainExclusion(d);
        this.settings = await SnippetStore.getSettings();
        this.renderExclusionList();
      });

      listEl.appendChild(chip);
    });
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (m) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return map[m];
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const workspace = new ManagerWorkspace();
  workspace.init();
});
