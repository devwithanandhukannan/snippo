/**
 * Snippo Manager Workspace Controller
 * Apple minimalist design system implementation.
 * Zero-borders, interactive test studio modal, live output preview,
 * transient save toast notification, 2-column settings grid, and guided onboarding tour.
 */

import { ConflictDetector } from '../../core/conflicts';
import { TriggerMatcher } from '../../core/matcher';
import { TemplateResolver } from '../../core/resolver';
import { Settings, Snippet } from '../../core/types';
import { BackupManager } from '../../data/import-export';
import { SnippetStore } from '../../data/store';

interface TourStep {
  targetId?: string;
  title: string;
  description: string;
}

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
  private customFolders = new Set<string>();
  private isSidebarCollapsed = false;
  private saveToastTimer: any = null;

  // Onboarding Tour state
  private currentTourStep = 0;
  private tourSteps: TourStep[] = [
    {
      targetId: 'btn-sidebar-new',
      title: 'Create & Manage Snippets',
      description: 'Tap "+ New" right here to add text expansions, or browse and search shortcuts in your library.',
    },
    {
      targetId: 'detail-trigger-input',
      title: 'Custom Trigger Shortcut',
      description: 'Set your trigger keyword (e.g. /omw). Snippo listens for this keyword and expands it across any website.',
    },
    {
      targetId: 'variables-toolbar',
      title: 'Dynamic Variables Toolbar',
      description: 'Click smart tags like +{date}, +{time}, +{day}, or +{year} to inject dynamic timestamps and formatting.',
    },
    {
      targetId: 'btn-open-test-modal',
      title: 'Interactive Test Studio',
      description: 'Click "Test Snippet" right here to pop open the test studio and practice typing your shortcut in real time!',
    },
  ];

  public async init(): Promise<void> {
    await SnippetStore.init();
    this.settings = await SnippetStore.getSettings();
    this.snippets = await SnippetStore.getAllSnippets();
    this.loadCustomFolders();
    this.applyTheme(this.settings.theme || 'system');

    this.renderVariablesToolbar();
    this.setupEventListeners();
    this.setupTestModal();
    this.setupOnboardingTour();
    this.renderFolders();
    this.renderSnippetList();
    this.renderSettings();

    // Restore sidebar collapsed preference on desktop
    try {
      const saved = localStorage.getItem('snippo_sidebar_collapsed');
      if (saved === '1' && window.innerWidth > 768) {
        this.toggleSidebar(true);
      }
    } catch (e) {}

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

    // Auto-launch tour for first-time users
    try {
      const tourSeen = localStorage.getItem('snippo_tour_seen');
      if (!tourSeen) {
        setTimeout(() => this.startTour(), 500);
      }
    } catch (e) {}
  }

  // --- Theme Controller ---

  public applyTheme(theme: string): void {
    if (theme === 'system' || !theme) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  // --- Sidebar Collapse & Expand ---

  public toggleSidebar(force?: boolean): void {
    this.isSidebarCollapsed = force !== undefined ? force : !this.isSidebarCollapsed;
    const sidebar = document.querySelector('.workspace-sidebar');
    const layout = document.querySelector('.workspace-layout');
    const expandBtn = document.getElementById('btn-sidebar-expand');

    if (sidebar) sidebar.classList.toggle('collapsed', this.isSidebarCollapsed);
    if (layout) layout.classList.toggle('sidebar-collapsed', this.isSidebarCollapsed);
    if (expandBtn) expandBtn.style.display = this.isSidebarCollapsed ? 'flex' : 'none';

    try {
      localStorage.setItem('snippo_sidebar_collapsed', this.isSidebarCollapsed ? '1' : '0');
    } catch (e) {}
  }

  // --- Category / Folder Management ---

  private loadCustomFolders(): void {
    try {
      const raw = localStorage.getItem('snippo_custom_folders');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((f: string) => this.customFolders.add(f));
        }
      }
    } catch (e) {}
  }

  private saveCustomFolders(): void {
    try {
      localStorage.setItem(
        'snippo_custom_folders',
        JSON.stringify(Array.from(this.customFolders))
      );
    } catch (e) {}
  }

  public promptAddCategory(): void {
    const input = prompt('Enter new category name:');
    if (!input || !input.trim()) return;
    const clean = input.trim();
    this.customFolders.add(clean);
    this.saveCustomFolders();
    this.renderFolders();

    const folderSelect = document.getElementById('detail-folder-select') as HTMLSelectElement;
    if (folderSelect) {
      folderSelect.value = clean;
    }
    const folderInput = document.getElementById('detail-folder-input') as HTMLInputElement;
    if (folderInput) {
      folderInput.value = clean;
    }
    const folderChip = document.getElementById('detail-folder-chip');
    if (folderChip) {
      folderChip.textContent = clean;
    }
    const heroSubtitle = document.getElementById('card-hero-subtitle');
    if (heroSubtitle) {
      heroSubtitle.textContent = `${clean.toUpperCase()} • SNIPPET`;
    }

    if (this.selectedSnippetId) {
      const current = this.snippets.find((s) => s.id === this.selectedSnippetId);
      if (current) {
        current.folder = clean;
        SnippetStore.saveSnippet(current).then(() => {
          this.renderSnippetList();
        });
      }
    }
  }

  // --- Renderers ---

  private renderFolders(): void {
    const nav = document.getElementById('sidebar-folders-nav');
    if (!nav) return;

    // Discover unique folders
    const folderSet = new Set<string>();
    ['General', 'Personal', 'Work'].forEach((f) => folderSet.add(f));
    this.customFolders.forEach((f) => folderSet.add(f));
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

    // Add "+" tab in sidebar folder navigation
    const addTab = document.createElement('button');
    addTab.className = 'folder-tab btn-folder-add-tab';
    addTab.title = 'Add new category';
    addTab.textContent = '+';
    addTab.addEventListener('click', () => {
      this.promptAddCategory();
    });
    nav.appendChild(addTab);

    // Populate detail folder dropdown
    const selectEl = document.getElementById('detail-folder-select') as HTMLSelectElement;
    if (selectEl) {
      const prevVal = selectEl.value;
      selectEl.innerHTML = '';
      Array.from(folderSet)
        .sort()
        .forEach((f) => {
          const opt = document.createElement('option');
          opt.value = f;
          opt.textContent = f;
          selectEl.appendChild(opt);
        });
      if (prevVal && folderSet.has(prevVal)) {
        selectEl.value = prevVal;
      }
    }

    // Update folder datalist
    const datalist = document.getElementById('folder-datalist');
    if (datalist) {
      datalist.innerHTML = '';
      folders
        .filter((f) => f !== 'All')
        .forEach((f) => {
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

    if (window.innerWidth <= 768) {
      document.querySelector('.workspace-layout')?.classList.add('mobile-editing');
    }

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
    const folderSelect = document.getElementById('detail-folder-select') as HTMLSelectElement;
    const folderChip = document.getElementById('detail-folder-chip');
    const heroTitle = document.getElementById('card-hero-title');
    const heroSubtitle = document.getElementById('card-hero-subtitle');
    const descInput = document.getElementById('detail-desc-input') as HTMLInputElement;
    const bodyTextarea = document.getElementById('detail-body-textarea') as HTMLTextAreaElement;
    const prefixDisplay = document.getElementById('trigger-prefix-display');

    if (triggerBadge) triggerBadge.textContent = snippet.trigger;
    if (heroTitle) heroTitle.textContent = snippet.trigger;
    if (heroSubtitle) heroSubtitle.textContent = `${(snippet.folder || 'GENERAL').toUpperCase()} • SNIPPET`;
    if (folderChip) folderChip.textContent = snippet.folder || 'General';
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

    const folderVal = snippet.folder || 'General';
    if (folderInput) folderInput.value = folderVal;
    if (folderSelect) folderSelect.value = folderVal;
    if (descInput) descInput.value = snippet.description || '';
    if (bodyTextarea) bodyTextarea.value = snippet.body || '';

    this.checkTriggerConflict();
    this.updateOutputPreview();
    this.updateLiveTestMatcher();
    window.location.hash = snippet.id;

    // Trigger smooth bottom-to-top sheet pop up animation
    const editor = document.getElementById('editor-view');
    if (editor) {
      editor.classList.remove('animate-sheet-up');
      void editor.offsetWidth;
      editor.classList.add('animate-sheet-up');
    }
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

    if (window.innerWidth <= 768) {
      document.querySelector('.workspace-layout')?.classList.add('mobile-editing');
    }

    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    triggerInput?.focus();
    triggerInput?.select();
  }

  // --- Live Output Preview ---

  private updateOutputPreview(): void {
    const bodyTextarea = document.getElementById('detail-body-textarea') as HTMLTextAreaElement;
    const previewBox = document.getElementById('output-preview-box');
    if (!bodyTextarea || !previewBox) return;

    const val = bodyTextarea.value;
    if (!val || !val.trim()) {
      previewBox.innerHTML = '<span class="output-preview-placeholder">Live preview will appear as you type...</span>';
      return;
    }

    const resolved = TemplateResolver.resolve(val);
    previewBox.textContent = resolved.text;
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

    this.updateOutputPreview();
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

    // Save snippet button
    document.getElementById('btn-save-snippet')?.addEventListener('click', () => {
      this.saveCurrentSnippet();
    });

    // Body textarea live preview listener
    document.getElementById('detail-body-textarea')?.addEventListener('input', () => {
      this.updateOutputPreview();
    });

    // Delete snippet button (Explicit trash icon)
    document.getElementById('btn-delete-snippet')?.addEventListener('click', () => {
      this.requestDeleteCurrentSnippet();
    });

    // Delete confirmation prompt actions
    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => {
      this.hideDeleteConfirmationToast();
    });

    document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
      this.executeDeleteSnippet();
    });

    // Undo toast button
    document.getElementById('btn-toast-undo')?.addEventListener('click', () => {
      this.restoreDeletedSnippet();
    });

    // Trigger input live check and hero title update
    document.getElementById('detail-trigger-input')?.addEventListener('input', () => {
      this.checkTriggerConflict();
      const triggerBadge = document.getElementById('detail-trigger-badge');
      const heroTitle = document.getElementById('card-hero-title');
      const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
      const prefix = this.settings.triggerPrefix || '';
      const full = prefix + triggerInput.value.trim();
      if (triggerBadge) triggerBadge.textContent = full;
      if (heroTitle) heroTitle.textContent = full || '/...';
      this.updateLiveTestMatcher();
    });

    // Folder select change
    const folderSelect = document.getElementById('detail-folder-select') as HTMLSelectElement;
    folderSelect?.addEventListener('change', () => {
      const val = folderSelect.value;
      const folderInput = document.getElementById('detail-folder-input') as HTMLInputElement;
      if (folderInput) folderInput.value = val;
      const folderChip = document.getElementById('detail-folder-chip');
      if (folderChip) folderChip.textContent = val;
      const heroSubtitle = document.getElementById('card-hero-subtitle');
      if (heroSubtitle) heroSubtitle.textContent = `${val.toUpperCase()} • SNIPPET`;
    });

    // Add Category button
    document.getElementById('btn-add-category')?.addEventListener('click', () => {
      this.promptAddCategory();
    });

    // Sidebar Collapse and Expand Buttons
    document.getElementById('btn-sidebar-toggle')?.addEventListener('click', () => {
      this.toggleSidebar();
    });

    document.getElementById('btn-sidebar-expand')?.addEventListener('click', () => {
      this.toggleSidebar(false);
    });

    // Mobile Back Button
    document.getElementById('btn-mobile-back')?.addEventListener('click', () => {
      document.querySelector('.workspace-layout')?.classList.remove('mobile-editing');
    });

    // Close mobile sheet when tapping on backdrop outside sheet
    const mainPane = document.getElementById('workspace-main-pane');
    mainPane?.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && e.target === mainPane) {
        document.querySelector('.workspace-layout')?.classList.remove('mobile-editing');
      }
    });

    // Settings navigation
    document.getElementById('btn-tab-settings')?.addEventListener('click', () => {
      this.showSettingsView();
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.showEditorView();
    });

    // Replay tour buttons
    document.getElementById('btn-sidebar-tour')?.addEventListener('click', () => {
      this.startTour();
    });

    document.getElementById('btn-settings-replay-tour')?.addEventListener('click', () => {
      this.showEditorView();
      this.startTour();
    });

    // Export backup
    document.getElementById('btn-export-backup')?.addEventListener('click', async () => {
      const data = await BackupManager.exportBackup();
      BackupManager.downloadBackupFile(data);
    });

    // Import backup
    const importInput = document.getElementById('input-import-file') as HTMLInputElement;
    importInput?.addEventListener('change', async () => {
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
    const folderSelect = document.getElementById('detail-folder-select') as HTMLSelectElement;
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

    const chosenFolder = (folderSelect ? folderSelect.value : folderInput?.value) || 'General';

    const updated: Snippet = {
      ...current,
      trigger: cleanTrigger,
      folder: chosenFolder.trim(),
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

    // Show Transient Save Toast Notification
    this.showSaveToast('Snippet saved successfully');

    // Broadcast update to content scripts
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SNIPPETS_UPDATED' }).catch(() => {});
    }
  }

  private showSaveToast(text: string): void {
    const toast = document.getElementById('toast-save-notification');
    const toastText = document.getElementById('toast-save-text');
    if (!toast) return;

    if (toastText) toastText.textContent = text;
    toast.classList.add('visible');

    if (this.saveToastTimer) {
      clearTimeout(this.saveToastTimer);
    }

    this.saveToastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      this.saveToastTimer = null;
    }, 2400);
  }

  // --- Delete Confirmation & Loss Aversion Undo Toast ---

  private requestDeleteCurrentSnippet(): void {
    if (!this.selectedSnippetId) return;
    const toDelete = this.snippets.find((s) => s.id === this.selectedSnippetId);
    if (!toDelete) return;

    if (this.settings.confirmOnDelete !== false) {
      this.showDeleteConfirmationToast(toDelete);
    } else {
      this.executeDeleteSnippet();
    }
  }

  private showDeleteConfirmationToast(snippet: Snippet): void {
    const toast = document.getElementById('toast-delete-confirm');
    const msg = document.getElementById('toast-delete-msg');
    if (!toast) return;

    if (msg) {
      msg.textContent = `"${snippet.trigger}" shortcut will be permanently removed.`;
    }
    toast.classList.add('visible');
  }

  private hideDeleteConfirmationToast(): void {
    const toast = document.getElementById('toast-delete-confirm');
    toast?.classList.remove('visible');
  }

  private async executeDeleteSnippet(): Promise<void> {
    this.hideDeleteConfirmationToast();
    if (!this.selectedSnippetId) return;

    const toDelete = this.snippets.find((s) => s.id === this.selectedSnippetId);
    if (!toDelete) return;

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

  // --- Interactive Test Modal ---

  private setupTestModal(): void {
    const openBtn = document.getElementById('btn-open-test-modal');
    const closeBtn = document.getElementById('btn-close-test-modal');
    const doneBtn = document.getElementById('btn-modal-done');
    const clearBtn = document.getElementById('btn-modal-clear-input');
    const modalEl = document.getElementById('test-snippet-modal');
    const modalInput = document.getElementById('modal-test-input') as HTMLTextAreaElement;

    openBtn?.addEventListener('click', () => {
      this.openTestModal();
    });

    closeBtn?.addEventListener('click', () => {
      this.closeTestModal();
    });

    doneBtn?.addEventListener('click', () => {
      this.closeTestModal();
    });

    clearBtn?.addEventListener('click', () => {
      if (modalInput) {
        modalInput.value = '';
        modalInput.focus();
        this.resetModalPreview();
      }
    });

    modalEl?.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        this.closeTestModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalEl && modalEl.style.display !== 'none') {
        this.closeTestModal();
      }
    });

    // Real-time expansion testing inside modal textarea
    modalInput?.addEventListener('input', () => {
      this.handleModalTestInput();
    });
  }

  private openTestModal(): void {
    const modalEl = document.getElementById('test-snippet-modal');
    const targetTag = document.getElementById('modal-target-trigger');
    const modalInput = document.getElementById('modal-test-input') as HTMLTextAreaElement;
    if (!modalEl) return;

    const currentSnippet = this.snippets.find((s) => s.id === this.selectedSnippetId);
    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    const prefix = this.settings.triggerPrefix || '';
    const activeTrigger = currentSnippet ? currentSnippet.trigger : (prefix + (triggerInput?.value || 'omw'));

    if (targetTag) {
      targetTag.textContent = activeTrigger;
    }

    if (modalInput) {
      modalInput.value = '';
    }

    this.resetModalPreview();
    modalEl.style.display = 'flex';
    setTimeout(() => modalInput?.focus(), 50);
  }

  private closeTestModal(): void {
    const modalEl = document.getElementById('test-snippet-modal');
    if (modalEl) modalEl.style.display = 'none';
  }

  private resetModalPreview(): void {
    const statusEl = document.getElementById('modal-preview-status');
    const contentEl = document.getElementById('modal-preview-content');
    if (statusEl) {
      statusEl.textContent = 'Awaiting trigger input...';
      statusEl.style.color = 'var(--text-tertiary)';
    }
    if (contentEl) {
      contentEl.textContent = 'Type the trigger shortcut in the box above to see instant expansion.';
    }
  }

  private handleModalTestInput(): void {
    const modalInput = document.getElementById('modal-test-input') as HTMLTextAreaElement;
    const statusEl = document.getElementById('modal-preview-status');
    const contentEl = document.getElementById('modal-preview-content');
    if (!modalInput) return;

    const val = modalInput.value;
    const match = this.testMatcher.matchTail(val);

    if (match) {
      const snippet = this.snippets.find((s) => s.id === match.snippetId);
      if (snippet) {
        const resolved = TemplateResolver.resolve(snippet.body);
        const start = val.length - match.tailLength;
        modalInput.value = val.slice(0, start) + resolved.text;
        const cursorPos =
          resolved.cursorOffset !== undefined
            ? start + resolved.cursorOffset
            : modalInput.value.length;
        modalInput.setSelectionRange(cursorPos, cursorPos);

        if (statusEl) {
          statusEl.textContent = `Expanded (${snippet.trigger})!`;
          statusEl.style.color = 'var(--color-brand-green)';
        }
        if (contentEl) {
          contentEl.textContent = resolved.text;
        }
      }
    } else {
      // If no tail match but user typed active trigger specifically
      const currentSnippet = this.snippets.find((s) => s.id === this.selectedSnippetId);
      if (currentSnippet && val.includes(currentSnippet.trigger)) {
        const resolved = TemplateResolver.resolve(currentSnippet.body);
        if (statusEl) {
          statusEl.textContent = `Trigger detected: ${currentSnippet.trigger}`;
          statusEl.style.color = 'var(--color-brand-violet)';
        }
        if (contentEl) {
          contentEl.textContent = resolved.text;
        }
      }
    }
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

  // --- First-time Guided Onboarding Tour (Targeted Positioning & Spotlights) ---

  private setupOnboardingTour(): void {
    const overlay = document.getElementById('tour-overlay');
    const nextBtn = document.getElementById('btn-tour-next');
    const prevBtn = document.getElementById('btn-tour-prev');
    const skipBtn = document.getElementById('btn-tour-skip');

    const dots = document.querySelectorAll('.tour-dot');
    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        this.currentTourStep = idx;
        this.renderTourStep();
      });
    });

    nextBtn?.addEventListener('click', () => {
      this.nextTourStep();
    });

    prevBtn?.addEventListener('click', () => {
      this.prevTourStep();
    });

    skipBtn?.addEventListener('click', () => {
      this.endTour();
    });

    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.endTour();
      }
    });

    window.addEventListener('resize', () => {
      if (overlay && overlay.style.display !== 'none') {
        const step = this.tourSteps[this.currentTourStep];
        this.positionTourCard(step?.targetId);
      }
    });
  }

  public startTour(): void {
    this.currentTourStep = 0;
    this.showEditorView();

    // Ensure a snippet is selected so editor fields are visible and populated
    if (!this.selectedSnippetId && this.snippets.length > 0) {
      this.selectSnippet(this.snippets[0].id);
    } else if (this.snippets.length === 0) {
      this.createNewSnippet();
    }

    document.body.classList.add('tour-active');
    const overlay = document.getElementById('tour-overlay');
    const card = document.getElementById('tour-card');
    if (overlay) overlay.style.display = 'block';
    if (card) card.style.display = 'flex';

    requestAnimationFrame(() => {
      this.renderTourStep();
    });
  }

  private renderTourStep(): void {
    const step = this.tourSteps[this.currentTourStep];
    if (!step) return;

    this.showEditorView();

    const isMobile = window.innerWidth <= 768;
    const layout = document.querySelector('.workspace-layout');
    if (isMobile && layout) {
      if (this.currentTourStep === 0) {
        layout.classList.remove('mobile-editing');
      } else {
        layout.classList.add('mobile-editing');
      }
    }

    const numEl = document.getElementById('tour-step-num');
    const titleEl = document.getElementById('tour-title');
    const descEl = document.getElementById('tour-desc');
    const prevBtn = document.getElementById('btn-tour-prev');
    const nextBtn = document.getElementById('btn-tour-next');
    const dots = document.querySelectorAll('.tour-dot');

    if (numEl) numEl.textContent = String(this.currentTourStep + 1);
    if (titleEl) titleEl.textContent = step.title;
    if (descEl) descEl.textContent = step.description;

    if (prevBtn) {
      prevBtn.style.display = this.currentTourStep > 0 ? 'inline-flex' : 'none';
    }

    if (nextBtn) {
      nextBtn.textContent = this.currentTourStep === this.tourSteps.length - 1 ? 'Got it!' : 'Next';
    }

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === this.currentTourStep);
    });

    // Position dynamically next to the target element with arrow and spotlight
    setTimeout(() => {
      this.positionTourCard(step.targetId);
    }, 60);
  }

  private positionTourCard(targetId?: string): void {
    const card = document.getElementById('tour-card');
    const arrow = document.getElementById('tour-pointer-arrow');
    if (!card) return;

    // Remove previous spotlight highlights
    document.querySelectorAll('.tour-target-spotlight').forEach((el) => {
      el.classList.remove('tour-target-spotlight');
    });

    if (!targetId) {
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      if (arrow) arrow.style.display = 'none';
      return;
    }

    const targetEl = document.getElementById(targetId);
    if (!targetEl) {
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      if (arrow) arrow.style.display = 'none';
      return;
    }

    // Add glowing spotlight to target element
    targetEl.classList.add('tour-target-spotlight');
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    const rect = targetEl.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;
    const cardWidth = Math.min(360, window.innerWidth - 32);

    card.style.width = `${cardWidth}px`;
    card.style.transform = 'none';

    const cardHeight = card.offsetHeight || 180;

    if (isMobile) {
      if (arrow) arrow.style.display = 'none';
      card.style.left = '16px';
      card.style.right = '16px';

      if (rect.bottom + cardHeight + 20 < window.innerHeight) {
        card.style.top = `${rect.bottom + 12}px`;
      } else {
        card.style.top = `${Math.max(16, rect.top - cardHeight - 12)}px`;
      }
      return;
    }

    // Desktop positioning
    if (arrow) arrow.style.display = 'block';

    // Special handling for Step 1: `btn-sidebar-new` located inside the sidebar
    if (targetId === 'btn-sidebar-new') {
      const sidebarEl = document.querySelector('.workspace-sidebar');
      const sidebarRect = sidebarEl?.getBoundingClientRect();
      const sidebarRight = sidebarRect ? sidebarRect.right : 260;

      // Position card cleanly to the right of the sidebar, vertically aligned with button
      const left = sidebarRight + 18;
      const top = Math.max(16, rect.top - 10);
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;

      if (arrow) {
        arrow.className = 'tour-pointer-arrow arrow-left';
        arrow.style.left = '-6px';
        arrow.style.right = 'auto';
        arrow.style.top = `${Math.max(16, Math.min(cardHeight - 24, rect.top - top + rect.height / 2 - 6))}px`;
        arrow.style.bottom = 'auto';
      }
      return;
    }

    // Steps 2, 3, 4 (Elements inside the Editor Pane)
    const targetCenterX = rect.left + rect.width / 2;
    const sidebarEl = document.querySelector('.workspace-sidebar');
    const minLeft = (sidebarEl?.getBoundingClientRect()?.right || 260) + 16;

    let left = targetCenterX - cardWidth / 2;
    if (left < minLeft) left = minLeft;
    if (left + cardWidth > window.innerWidth - 20) {
      left = window.innerWidth - cardWidth - 20;
    }

    // Try placing below target
    if (rect.bottom + cardHeight + 24 < window.innerHeight) {
      const top = rect.bottom + 14;
      card.style.top = `${top}px`;
      card.style.left = `${left}px`;
      if (arrow) {
        arrow.className = 'tour-pointer-arrow arrow-top';
        arrow.style.top = '-6px';
        arrow.style.bottom = 'auto';
        arrow.style.right = 'auto';
        const arrowLeft = Math.max(16, Math.min(cardWidth - 28, targetCenterX - left - 6));
        arrow.style.left = `${arrowLeft}px`;
      }
    } else {
      // Place above target
      const top = Math.max(16, rect.top - cardHeight - 14);
      card.style.top = `${top}px`;
      card.style.left = `${left}px`;
      if (arrow) {
        arrow.className = 'tour-pointer-arrow arrow-bottom';
        arrow.style.bottom = '-6px';
        arrow.style.top = 'auto';
        arrow.style.right = 'auto';
        const arrowLeft = Math.max(16, Math.min(cardWidth - 28, targetCenterX - left - 6));
        arrow.style.left = `${arrowLeft}px`;
      }
    }
  }

  private nextTourStep(): void {
    if (this.currentTourStep < this.tourSteps.length - 1) {
      this.currentTourStep++;
      this.renderTourStep();
    } else {
      this.endTour();
    }
  }

  private prevTourStep(): void {
    if (this.currentTourStep > 0) {
      this.currentTourStep--;
      this.renderTourStep();
    }
  }

  private endTour(): void {
    document.body.classList.remove('tour-active');
    const overlay = document.getElementById('tour-overlay');
    const card = document.getElementById('tour-card');
    if (overlay) overlay.style.display = 'none';
    if (card) card.style.display = 'none';
    document.querySelectorAll('.tour-target-spotlight').forEach((el) => {
      el.classList.remove('tour-target-spotlight');
    });
    try {
      localStorage.setItem('snippo_tour_seen', '1');
    } catch (e) {}
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
    const themeSelect = document.getElementById('setting-theme-select') as HTMLSelectElement;
    const prefixSelect = document.getElementById('setting-prefix-select') as HTMLSelectElement;
    const modeSelect = document.getElementById('setting-expand-mode') as HTMLSelectElement;

    if (themeSelect) {
      themeSelect.value = this.settings.theme || 'system';
      themeSelect.addEventListener('change', async () => {
        const chosenTheme = themeSelect.value as any;
        this.settings = await SnippetStore.updateSettings({
          theme: chosenTheme,
        });
        this.applyTheme(chosenTheme);
      });
    }

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

    const confirmDeleteCheck = document.getElementById('setting-confirm-delete') as HTMLInputElement;
    if (confirmDeleteCheck) {
      confirmDeleteCheck.checked = this.settings.confirmOnDelete !== false;
      confirmDeleteCheck.addEventListener('change', async () => {
        this.settings = await SnippetStore.updateSettings({
          confirmOnDelete: confirmDeleteCheck.checked,
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
