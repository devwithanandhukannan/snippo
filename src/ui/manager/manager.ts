/**
 * Snippo Manager Workspace Controller
 * Modern Minimalist Design System implementation.
 * Responsive cards grid, mobile-style bottom-to-top sheet modal,
 * Tab-to-expansion keyboard navigation, custom category dialogs,
 * interactive test studio modal, and guided onboarding tour.
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
  private isEditingExisting = false;
  private activeFolder = 'All';
  private searchQuery = '';
  private deletedSnippetStack: Snippet[] = [];
  private undoTimer: any = null;
  private undoSecondsRemaining = 8;
  private testMatcher = new TriggerMatcher();
  private customFolders = new Set<string>();
  private deletedDefaultFolders = new Set<string>();
  private categoryPendingDelete = '';
  private saveToastTimer = null as any;

  // Onboarding Tour state
  private currentTourStep = 0;
  private tourSteps: TourStep[] = [
    {
      targetId: 'btn-sidebar-new',
      title: 'Create New Snippets',
      description: 'Click "+ New" to open the bottom sheet modal and add a new shortcut keyword and expansion text.',
    },
    {
      targetId: 'sidebar-snippet-list',
      title: 'Snippet Cards & Actions',
      description: 'Each card in your library features instant "Edit" and "Delete" options, plus an active toggle switch.',
    },
    {
      targetId: 'sidebar-folders-nav',
      title: 'Categories & Organization',
      description: 'Filter snippets by category or click "+" to create custom folders to stay organized.',
    },
    {
      targetId: 'btn-open-test-modal-header',
      title: 'Interactive Test Studio',
      description: 'Practice typing your shortcut keywords in real-time or fine-tune triggers and themes in Settings.',
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
    this.setupSheetModal();
    this.setupTestModal();
    this.setupDeleteCategoryModal();
    this.setupAddCategoryModal();
    this.setupOnboardingTour();
    this.renderFolders();
    this.renderSnippetList();
    this.renderSettings();

    // Check URL hash for target snippet or new
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get('prefill');

    if (hash === 'new' || prefill) {
      this.createNewSnippet(prefill ? decodeURIComponent(prefill) : undefined);
    } else if (hash && this.snippets.some((s) => s.id === hash)) {
      this.editSnippet(hash);
    }

    // Auto-launch tour for first-time users
    try {
      const tourSeen = localStorage.getItem('snippo_tour_seen');
      if (!tourSeen) {
        setTimeout(() => this.startTour(), 600);
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
      const delRaw = localStorage.getItem('snippo_deleted_folders');
      if (delRaw) {
        const arr = JSON.parse(delRaw);
        if (Array.isArray(arr)) {
          arr.forEach((f: string) => this.deletedDefaultFolders.add(f));
        }
      }
    } catch (e) {}
  }

  private saveCustomFolders(): void {
    try {
      localStorage.setItem('snippo_custom_folders', JSON.stringify(Array.from(this.customFolders)));
      localStorage.setItem('snippo_deleted_folders', JSON.stringify(Array.from(this.deletedDefaultFolders)));
    } catch (e) {}
  }

  // --- Add Category Custom Modal (Screenshot 3 Fix) ---

  private setupAddCategoryModal(): void {
    const modal = document.getElementById('add-category-modal');
    const input = document.getElementById('new-category-name-input') as HTMLInputElement;
    const confirmBtn = document.getElementById('btn-confirm-add-category');
    const cancelBtn = document.getElementById('btn-cancel-add-category');
    const closeBtn = document.getElementById('btn-close-add-category-modal');
    const errorEl = document.getElementById('add-category-error');

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
      if (input) input.value = '';
      if (errorEl) errorEl.style.display = 'none';
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    const submit = () => {
      const val = input?.value.trim();
      if (!val) {
        if (errorEl) {
          errorEl.textContent = 'Category name cannot be empty';
          errorEl.style.display = 'block';
        }
        return;
      }
      if (val.toLowerCase() === 'all') {
        if (errorEl) {
          errorEl.textContent = '"All" is a reserved category name';
          errorEl.style.display = 'block';
        }
        return;
      }

      this.deletedDefaultFolders.delete(val);
      this.customFolders.add(val);
      this.saveCustomFolders();
      this.renderFolders();

      const folderSelect = document.getElementById('detail-folder-select') as HTMLSelectElement;
      if (folderSelect) {
        folderSelect.value = val;
      }

      closeModal();
      this.showSaveToast(`Category "${val}" created`);
    };

    confirmBtn?.addEventListener('click', submit);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  public promptAddCategory(): void {
    const modal = document.getElementById('add-category-modal');
    const input = document.getElementById('new-category-name-input') as HTMLInputElement;
    const errorEl = document.getElementById('add-category-error');

    if (errorEl) errorEl.style.display = 'none';
    if (input) input.value = '';
    if (modal) modal.style.display = 'flex';
    setTimeout(() => input?.focus(), 50);
  }

  // --- Delete Category Modal Management (Screenshot 2 Fix) ---

  private setupDeleteCategoryModal(): void {
    const modal = document.getElementById('delete-category-modal');
    const closeBtn = document.getElementById('btn-close-delete-category-modal');
    const cancelBtn = document.getElementById('btn-cancel-delete-category');
    const confirmBtn = document.getElementById('btn-confirm-delete-category');
    const radioMove = document.getElementById('radio-category-move') as HTMLInputElement;
    const radioDelete = document.getElementById('radio-category-delete') as HTMLInputElement;
    const cardMove = document.getElementById('card-choice-move');
    const cardDelete = document.getElementById('card-choice-delete');

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
      this.categoryPendingDelete = '';
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
        closeModal();
      }
    });

    const updateChoiceCards = () => {
      if (radioMove?.checked) {
        cardMove?.classList.add('active');
        cardDelete?.classList.remove('active');
      } else {
        cardMove?.classList.remove('active');
        cardDelete?.classList.add('active');
      }
    };

    radioMove?.addEventListener('change', updateChoiceCards);
    radioDelete?.addEventListener('change', updateChoiceCards);

    cardMove?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'SELECT') return;
      if (radioMove) {
        radioMove.checked = true;
        updateChoiceCards();
      }
    });

    cardDelete?.addEventListener('click', () => {
      if (radioDelete) {
        radioDelete.checked = true;
        updateChoiceCards();
      }
    });

    confirmBtn?.addEventListener('click', async () => {
      await this.executeDeleteCategory();
      closeModal();
    });
  }

  public openDeleteCategoryModal(categoryName: string, allFolders: string[]): void {
    const modal = document.getElementById('delete-category-modal');
    const title = document.getElementById('delete-category-modal-title');
    const subtitle = document.getElementById('delete-category-modal-subtitle');
    const warningDesc = document.getElementById('delete-category-warning-desc');
    const countWarning = document.getElementById('delete-category-snippets-count');
    const targetSelect = document.getElementById('delete-category-target-select') as HTMLSelectElement;
    const optionsWrap = document.getElementById('delete-category-options-wrap');
    const emptyMsg = document.getElementById('delete-category-empty-msg');
    const radioMove = document.getElementById('radio-category-move') as HTMLInputElement;
    const cardMove = document.getElementById('card-choice-move');
    const cardDelete = document.getElementById('card-choice-delete');

    if (!modal) return;

    this.categoryPendingDelete = categoryName;

    const matchingSnippets = this.snippets.filter((s) => s.folder === categoryName);
    const count = matchingSnippets.length;

    if (title) title.textContent = `Delete "${categoryName}"`;
    if (subtitle) subtitle.textContent = `Manage snippets inside this category`;

    if (count === 0) {
      if (optionsWrap) optionsWrap.style.display = 'none';
      if (emptyMsg) {
        emptyMsg.style.display = 'block';
        emptyMsg.textContent = `Category "${categoryName}" has no snippets. Deleting it will remove the category tab.`;
      }
    } else {
      if (optionsWrap) optionsWrap.style.display = 'block';
      if (emptyMsg) emptyMsg.style.display = 'none';

      if (warningDesc) {
        warningDesc.textContent = `"${categoryName}" contains ${count} snippet${count > 1 ? 's' : ''}. Choose what to do:`;
      }
      if (countWarning) {
        countWarning.textContent = `Permanently removes all ${count} snippet${count > 1 ? 's' : ''} inside "${categoryName}".`;
      }

      // Populate destination categories (NEVER include categoryName being deleted!)
      if (targetSelect) {
        targetSelect.innerHTML = '';
        const destinationFolders = allFolders.filter((f) => f !== categoryName && f !== 'All');
        if (destinationFolders.length === 0) {
          destinationFolders.push(categoryName === 'General' ? 'Uncategorized' : 'General');
        }
        destinationFolders.forEach((f) => {
          const opt = document.createElement('option');
          opt.value = f;
          opt.textContent = f;
          targetSelect.appendChild(opt);
        });
      }

      if (radioMove) radioMove.checked = true;
      cardMove?.classList.add('active');
      cardDelete?.classList.remove('active');
    }

    modal.style.display = 'flex';
  }

  private async executeDeleteCategory(): Promise<void> {
    const categoryName = this.categoryPendingDelete;
    if (!categoryName) return;

    const radioMove = document.getElementById('radio-category-move') as HTMLInputElement;
    const targetSelect = document.getElementById('delete-category-target-select') as HTMLSelectElement;

    if (radioMove?.checked && targetSelect) {
      const destinationCategory = targetSelect.value || 'General';
      const toMove = this.snippets.filter((s) => s.folder === categoryName);
      for (const s of toMove) {
        s.folder = destinationCategory;
        s.updatedAt = Date.now();
        await SnippetStore.saveSnippet(s);
      }
    } else {
      const toDelete = this.snippets.filter((s) => s.folder === categoryName);
      for (const s of toDelete) {
        await SnippetStore.deleteSnippet(s.id);
      }
    }

    this.customFolders.delete(categoryName);
    this.deletedDefaultFolders.add(categoryName);
    this.saveCustomFolders();

    this.snippets = await SnippetStore.getAllSnippets();
    if (this.activeFolder === categoryName) {
      this.activeFolder = 'All';
    }

    this.renderFolders();
    this.renderSnippetList();
    this.showSaveToast(`Category "${categoryName}" deleted`);
  }

  // --- Folder Pills Rendering ---

  private renderFolders(): void {
    const nav = document.getElementById('sidebar-folders-nav');
    if (!nav) return;

    nav.innerHTML = '';

    const folderSet = new Set<string>();
    folderSet.add('General');

    this.snippets.forEach((s) => {
      if (s.folder) folderSet.add(s.folder);
    });

    this.customFolders.forEach((f) => folderSet.add(f));
    this.deletedDefaultFolders.forEach((f) => {
      if (!this.snippets.some((s) => s.folder === f)) {
        folderSet.delete(f);
      }
    });

    const folders = ['All', ...Array.from(folderSet).sort()];

    folders.forEach((f) => {
      const isCustomOrDeletable = f !== 'All';

      if (!isCustomOrDeletable) {
        const tab = document.createElement('button');
        tab.className = `folder-tab-btn folder-tab-pill ${this.activeFolder === f ? 'active' : ''}`;
        tab.textContent = f;
        tab.addEventListener('click', () => {
          this.activeFolder = f;
          this.renderFolders();
          this.renderSnippetList();
        });
        nav.appendChild(tab);
      } else {
        const pill = document.createElement('div');
        pill.className = `folder-tab-pill ${this.activeFolder === f ? 'active' : ''}`;

        const textBtn = document.createElement('button');
        textBtn.className = 'folder-tab-btn';
        textBtn.textContent = f;
        textBtn.addEventListener('click', () => {
          this.activeFolder = f;
          this.renderFolders();
          this.renderSnippetList();
        });
        pill.appendChild(textBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'folder-tab-del-btn';
        delBtn.title = `Delete "${f}" category`;
        delBtn.innerHTML = `
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openDeleteCategoryModal(f, Array.from(folderSet));
        });
        pill.appendChild(delBtn);

        nav.appendChild(pill);
      }
    });

    // Add "+" tab in subbar folder navigation
    const addTab = document.createElement('button');
    addTab.className = 'btn-folder-add-tab';
    addTab.title = 'Add new category';
    addTab.textContent = '+';
    addTab.addEventListener('click', () => {
      this.promptAddCategory();
    });
    nav.appendChild(addTab);

    // Populate detail folder dropdown inside modal
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
  }

  // --- Snippet Cards Grid Rendering (Main Page) ---

  private renderSnippetList(): void {
    const listEl = document.getElementById('sidebar-snippet-list');
    const statsLabel = document.getElementById('total-stats-label');
    const categoryHeading = document.getElementById('current-category-heading');
    const categoryCount = document.getElementById('current-category-count');
    const emptyState = document.getElementById('workspace-empty-state');
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
          (s.folder && s.folder.toLowerCase().includes(q))
      );
    }

    const totalCountText = `${this.snippets.length} snippet${this.snippets.length === 1 ? '' : 's'}`;
    if (statsLabel) statsLabel.textContent = totalCountText;

    if (categoryHeading) {
      categoryHeading.textContent = this.activeFolder === 'All' ? 'All Snippets' : `${this.activeFolder} Snippets`;
    }
    if (categoryCount) {
      categoryCount.textContent = `${filtered.length} snippet${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    } else {
      if (emptyState) emptyState.style.display = 'none';
    }

    // Render cards
    filtered.forEach((snippet) => {
      const card = document.createElement('div');
      card.className = `snippet-card ${!snippet.enabled ? 'inactive' : ''}`;
      card.setAttribute('data-id', snippet.id);

      const cleanBody = snippet.body.replace(/\n/g, ' ').trim() || '(Empty snippet text)';

      card.innerHTML = `
        <div class="snippet-card-info">
          <div class="snippet-card-title-row">
            <span class="card-trigger-title">${this.escapeHtml(snippet.trigger)}</span>
            <span class="card-folder-badge">${this.escapeHtml(snippet.folder || 'General')}</span>
          </div>
          <div class="snippet-card-desc" title="Click Edit to modify">${this.escapeHtml(cleanBody)}</div>
          <div class="snippet-card-meta-line">
            <span>Used ${snippet.usageCount || 0} times</span>
            <span class="meta-dot">&bull;</span>
            <span>${snippet.enabled ? 'Active' : 'Disabled'}</span>
          </div>
        </div>

        <div class="snippet-card-footer">
          <div class="card-actions-left">
            <button class="btn-card-action btn-card-edit" data-id="${snippet.id}" title="Edit snippet" aria-label="Edit snippet">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-card-action btn-card-delete" data-id="${snippet.id}" title="Delete snippet" aria-label="Delete snippet">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
          <div class="card-toggle-right">
            <label class="switch" title="Toggle active status">
              <input type="checkbox" class="card-active-toggle" data-id="${snippet.id}" ${snippet.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `;

      // Event listener: Toggle active directly on card
      const toggle = card.querySelector('.card-active-toggle') as HTMLInputElement;
      toggle?.addEventListener('change', async (e) => {
        e.stopPropagation();
        snippet.enabled = toggle.checked;
        card.classList.toggle('inactive', !snippet.enabled);
        await SnippetStore.saveSnippet(snippet);
        this.showSaveToast(`Snippet ${snippet.enabled ? 'activated' : 'deactivated'}`);
      });

      // Event listener: Edit button
      const editBtn = card.querySelector('.btn-card-edit');
      editBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editSnippet(snippet.id);
      });

      // Event listener: Delete button
      const deleteBtn = card.querySelector('.btn-card-delete');
      deleteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedSnippetId = snippet.id;
        this.requestDeleteCurrentSnippet();
      });

      // Clicking card body also edits
      card.querySelector('.snippet-card-body')?.addEventListener('click', () => {
        this.editSnippet(snippet.id);
      });

      listEl.appendChild(card);
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

  // --- Bottom-to-Top Sheet Modal Management ---

  private setupSheetModal(): void {
    const modalBackdrop = document.getElementById('snippet-editor-modal');
    const closeBtn = document.getElementById('btn-close-sheet-modal');
    const cancelBtn = document.getElementById('btn-cancel-sheet-modal');
    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    const bodyTextarea = document.getElementById('detail-body-textarea') as HTMLTextAreaElement;

    const closeModal = () => {
      if (modalBackdrop) {
        modalBackdrop.classList.remove('open');
        setTimeout(() => {
          modalBackdrop.style.display = 'none';
        }, 280);
      }
      this.selectedSnippetId = null;
      this.isEditingExisting = false;
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    modalBackdrop?.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop && modalBackdrop.classList.contains('open')) {
        closeModal();
      }
    });

    // ─────────────────────────────────────────────────────────────
    // KEY REQUIREMENT: When user enters keyword then clicks TAB,
    // go straight to expansion content!
    // ─────────────────────────────────────────────────────────────
    triggerInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        bodyTextarea?.focus();
        bodyTextarea?.select();
      }
    });

    // Body textarea input updates preview
    bodyTextarea?.addEventListener('input', () => {
      this.updateOutputPreview();
    });

    // Trigger input checks conflicts
    triggerInput?.addEventListener('input', () => {
      this.checkTriggerConflict();
      this.updateLiveTestMatcher();
    });
  }

  public createNewSnippet(prefillBody?: string): void {
    this.selectedSnippetId = null;
    this.isEditingExisting = false;

    const modalBackdrop = document.getElementById('snippet-editor-modal');
    const sheetTitle = document.getElementById('sheet-modal-title');
    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    const folderSelect = document.getElementById('detail-folder-select') as HTMLSelectElement;
    const bodyTextarea = document.getElementById('detail-body-textarea') as HTMLTextAreaElement;
    const enabledSwitch = document.getElementById('detail-enabled-switch') as HTMLInputElement;
    const prefixDisplay = document.getElementById('trigger-prefix-display');
    const deleteBtn = document.getElementById('btn-delete-snippet');

    if (sheetTitle) sheetTitle.textContent = 'New Snippet';
    if (deleteBtn) deleteBtn.style.display = 'none';

    const prefix = this.settings.triggerPrefix || '/';
    if (prefixDisplay) prefixDisplay.textContent = prefix || '•';

    if (triggerInput) triggerInput.value = '';
    if (folderSelect) {
      folderSelect.value = this.activeFolder !== 'All' ? this.activeFolder : 'General';
    }
    if (bodyTextarea) bodyTextarea.value = prefillBody || '';
    if (enabledSwitch) enabledSwitch.checked = true;

    this.checkTriggerConflict();
    this.updateOutputPreview();

    if (modalBackdrop) {
      modalBackdrop.style.display = 'flex';
      requestAnimationFrame(() => {
        modalBackdrop.classList.add('open');
      });
    }

    setTimeout(() => {
      triggerInput?.focus();
    }, 150);
  }

  public editSnippet(id: string): void {
    const snippet = this.snippets.find((s) => s.id === id);
    if (!snippet) return;

    this.selectedSnippetId = id;
    this.isEditingExisting = true;

    const modalBackdrop = document.getElementById('snippet-editor-modal');
    const sheetTitle = document.getElementById('sheet-modal-title');
    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    const folderSelect = document.getElementById('detail-folder-select') as HTMLSelectElement;
    const bodyTextarea = document.getElementById('detail-body-textarea') as HTMLTextAreaElement;
    const enabledSwitch = document.getElementById('detail-enabled-switch') as HTMLInputElement;
    const prefixDisplay = document.getElementById('trigger-prefix-display');
    const deleteBtn = document.getElementById('btn-delete-snippet');

    if (sheetTitle) sheetTitle.textContent = 'Edit Snippet';
    if (deleteBtn) deleteBtn.style.display = 'flex';

    const prefix = this.settings.triggerPrefix || '';
    if (prefixDisplay) prefixDisplay.textContent = prefix || '•';

    if (prefix && snippet.trigger.startsWith(prefix)) {
      if (triggerInput) triggerInput.value = snippet.trigger.slice(prefix.length);
    } else {
      if (triggerInput) triggerInput.value = snippet.trigger;
    }

    if (folderSelect) folderSelect.value = snippet.folder || 'General';
    if (bodyTextarea) bodyTextarea.value = snippet.body || '';
    if (enabledSwitch) enabledSwitch.checked = snippet.enabled;

    this.checkTriggerConflict();
    this.updateOutputPreview();
    this.updateLiveTestMatcher();

    if (modalBackdrop) {
      modalBackdrop.style.display = 'flex';
      requestAnimationFrame(() => {
        modalBackdrop.classList.add('open');
      });
    }

    setTimeout(() => {
      triggerInput?.focus();
      triggerInput?.select();
    }, 150);
  }

  private async saveCurrentSnippet(): Promise<void> {
    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    const folderSelect = document.getElementById('detail-folder-select') as HTMLSelectElement;
    const bodyTextarea = document.getElementById('detail-body-textarea') as HTMLTextAreaElement;
    const enabledSwitch = document.getElementById('detail-enabled-switch') as HTMLInputElement;

    const keyword = triggerInput?.value.trim();
    if (!keyword) {
      this.showSaveToast('Trigger keyword cannot be empty');
      triggerInput?.focus();
      return;
    }

    const prefix = this.settings.triggerPrefix || '';
    const cleanTrigger = prefix + keyword;
    const chosenFolder = (folderSelect ? folderSelect.value : 'General') || 'General';

    if (this.isEditingExisting && this.selectedSnippetId) {
      const current = this.snippets.find((s) => s.id === this.selectedSnippetId);
      if (current) {
        const updated: Snippet = {
          ...current,
          trigger: cleanTrigger,
          folder: chosenFolder.trim(),
          body: bodyTextarea ? bodyTextarea.value : '',
          enabled: enabledSwitch ? enabledSwitch.checked : true,
          updatedAt: Date.now(),
        };
        await SnippetStore.saveSnippet(updated);
      }
    } else {
      const newId = 'snip-' + Math.random().toString(36).slice(2, 9);
      const newSnippet: Snippet = {
        id: newId,
        trigger: cleanTrigger,
        body: bodyTextarea ? bodyTextarea.value : '',
        description: '',
        folder: chosenFolder.trim(),
        enabled: enabledSwitch ? enabledSwitch.checked : true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
      };
      await SnippetStore.saveSnippet(newSnippet);
    }

    this.snippets = await SnippetStore.getAllSnippets();
    this.renderFolders();
    this.renderSnippetList();

    // Close modal sheet
    const modalBackdrop = document.getElementById('snippet-editor-modal');
    if (modalBackdrop) {
      modalBackdrop.classList.remove('open');
      setTimeout(() => {
        modalBackdrop.style.display = 'none';
      }, 280);
    }

    this.showSaveToast('Snippet saved successfully');

    // Broadcast update to content scripts
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SNIPPETS_UPDATED' }).catch(() => {});
    }
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

  // --- Conflict Detection ---

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
    // New snippet buttons
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

    // Delete snippet button in sheet modal
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

    // Add Category button
    document.getElementById('btn-add-category')?.addEventListener('click', () => {
      this.promptAddCategory();
    });

    // Settings navigation
    document.getElementById('btn-tab-settings')?.addEventListener('click', () => {
      this.showSettingsView();
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.showSnippetsView();
    });

    // Clicking Snippo logo or text goes back to Snippets view
    const brandHome = document.getElementById('btn-brand-home') || document.querySelector('.brand-group');
    brandHome?.addEventListener('click', () => {
      this.showSnippetsView();
    });
    brandHome?.addEventListener('keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter' || ke.key === ' ') {
        ke.preventDefault();
        this.showSnippetsView();
      }
    });

    // Replay tour buttons
    document.getElementById('btn-sidebar-tour')?.addEventListener('click', () => {
      this.startTour();
    });

    document.getElementById('btn-settings-replay-tour')?.addEventListener('click', () => {
      this.showSnippetsView();
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
          this.showSaveToast(`Successfully imported ${res.importedCount} snippet(s)!`);
          this.snippets = await SnippetStore.getAllSnippets();
          this.renderFolders();
          this.renderSnippetList();
        } else {
          this.showSaveToast('Import failed: ' + res.errors.join(', '));
        }
      };
      reader.readAsText(file);
      importInput.value = '';
    });
  }

  private showSettingsView(): void {
    const snippetsView = document.getElementById('snippets-page-view');
    const settingsView = document.getElementById('settings-view');
    if (snippetsView) snippetsView.style.display = 'none';
    if (settingsView) settingsView.style.display = 'flex';
  }

  private showSnippetsView(): void {
    const snippetsView = document.getElementById('snippets-page-view');
    const settingsView = document.getElementById('settings-view');
    if (snippetsView) snippetsView.style.display = 'flex';
    if (settingsView) settingsView.style.display = 'none';
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

  // --- Deletion Flow ---

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
      msg.textContent = `"${snippet.trigger}" will be deleted.`;
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

    // Close sheet modal if open
    const modalBackdrop = document.getElementById('snippet-editor-modal');
    if (modalBackdrop && modalBackdrop.classList.contains('open')) {
      modalBackdrop.classList.remove('open');
      setTimeout(() => {
        modalBackdrop.style.display = 'none';
      }, 280);
    }

    await SnippetStore.deleteSnippet(toDelete.id);
    this.deletedSnippetStack.push(toDelete);
    this.snippets = await SnippetStore.getAllSnippets();

    this.renderFolders();
    this.renderSnippetList();

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SNIPPETS_UPDATED' }).catch(() => {});
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
    this.showSaveToast('Snippet restored');
  }

  // --- Interactive Test Studio Modal ---

  private setupTestModal(): void {
    const openBtn = document.getElementById('btn-open-test-modal');
    const headerOpenBtn = document.getElementById('btn-open-test-modal-header');
    const closeBtn = document.getElementById('btn-close-test-modal');
    const doneBtn = document.getElementById('btn-modal-done');
    const clearBtn = document.getElementById('btn-modal-clear-input');
    const modalEl = document.getElementById('test-snippet-modal');
    const modalInput = document.getElementById('modal-test-input') as HTMLTextAreaElement;

    openBtn?.addEventListener('click', () => this.openTestModal());
    headerOpenBtn?.addEventListener('click', () => this.openTestModal());
    closeBtn?.addEventListener('click', () => this.closeTestModal());
    doneBtn?.addEventListener('click', () => this.closeTestModal());

    clearBtn?.addEventListener('click', () => {
      if (modalInput) {
        modalInput.value = '';
        modalInput.focus();
        this.resetModalPreview();
      }
    });

    modalEl?.addEventListener('click', (e) => {
      if (e.target === modalEl) this.closeTestModal();
    });

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

  private updateLiveTestMatcher(): void {
    const triggerInput = document.getElementById('detail-trigger-input') as HTMLInputElement;
    const prefix = this.settings?.triggerPrefix || '';

    const index: Record<string, { id: string; trigger: string; enabled: boolean; folder: string }> = {};

    this.snippets.forEach((s) => {
      index[s.trigger] = { id: s.id, trigger: s.trigger, enabled: s.enabled, folder: s.folder };
    });

    if (triggerInput && triggerInput.value.trim()) {
      const activeTrigger = prefix + triggerInput.value.trim();
      index[activeTrigger] = { id: 'live-test', trigger: activeTrigger, enabled: true, folder: 'Test' };
    }

    this.testMatcher.updateIndex(index);
  }

  private handleModalTestInput(): void {
    const modalInput = document.getElementById('modal-test-input') as HTMLTextAreaElement;
    const statusEl = document.getElementById('modal-preview-status');
    const contentEl = document.getElementById('modal-preview-content');
    if (!modalInput) return;

    this.updateLiveTestMatcher();
    const text = modalInput.value;
    const match = this.testMatcher.matchTail(text);

    if (match) {
      let bodyToResolve = '';
      if (match.snippetId === 'live-test') {
        const bodyTextarea = document.getElementById('detail-body-textarea') as HTMLTextAreaElement;
        bodyToResolve = bodyTextarea?.value || '';
      } else {
        const target = this.snippets.find((s) => s.id === match.snippetId);
        bodyToResolve = target?.body || '';
      }

      const resolved = TemplateResolver.resolve(bodyToResolve);
      const before = text.slice(0, text.length - match.tailLength);
      modalInput.value = before + resolved.text;

      if (statusEl) {
        statusEl.textContent = `Expanded trigger "${match.matchedTrigger}"!`;
        statusEl.style.color = 'var(--color-brand-green)';
      }
      if (contentEl) {
        contentEl.textContent = resolved.text;
      }
    }
  }

  // --- Onboarding Tour ---

  private setupOnboardingTour(): void {
    const nextBtn = document.getElementById('btn-tour-next');
    const prevBtn = document.getElementById('btn-tour-prev');
    const skipBtn = document.getElementById('btn-tour-skip');

    nextBtn?.addEventListener('click', () => this.nextTourStep());
    prevBtn?.addEventListener('click', () => this.prevTourStep());
    skipBtn?.addEventListener('click', () => this.endTour());
  }

  public startTour(): void {
    this.currentTourStep = 0;
    this.showSnippetsView();

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

    setTimeout(() => {
      this.positionTourCard(step.targetId);
    }, 50);
  }

  private positionTourCard(targetId?: string): void {
    const card = document.getElementById('tour-card');
    const arrow = document.getElementById('tour-pointer-arrow');
    if (!card) return;

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

    const targetEl = document.getElementById(targetId) || document.querySelector(targetId);
    if (!targetEl) {
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      if (arrow) arrow.style.display = 'none';
      return;
    }

    targetEl.classList.add('tour-target-spotlight');
    const rect = targetEl.getBoundingClientRect();
    const cardWidth = Math.min(360, window.innerWidth - 32);
    card.style.width = `${cardWidth}px`;
    card.style.transform = 'none';
    const cardHeight = card.offsetHeight || 160;

    if (window.innerWidth <= 768) {
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

    if (arrow) arrow.style.display = 'block';

    const targetCenterX = rect.left + rect.width / 2;
    let left = targetCenterX - cardWidth / 2;
    if (left < 20) left = 20;
    if (left + cardWidth > window.innerWidth - 20) {
      left = window.innerWidth - cardWidth - 20;
    }

    if (rect.bottom + cardHeight + 20 < window.innerHeight) {
      card.style.top = `${rect.bottom + 12}px`;
      card.style.left = `${left}px`;
      if (arrow) {
        arrow.className = 'tour-pointer-arrow arrow-top';
        arrow.style.left = `${Math.max(16, Math.min(cardWidth - 28, targetCenterX - left - 6))}px`;
      }
    } else {
      card.style.top = `${Math.max(16, rect.top - cardHeight - 12)}px`;
      card.style.left = `${left}px`;
      if (arrow) {
        arrow.className = 'tour-pointer-arrow arrow-bottom';
        arrow.style.left = `${Math.max(16, Math.min(cardWidth - 28, targetCenterX - left - 6))}px`;
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

  // --- Settings Controller ---

  private renderSettings(): void {
    const themeSelect = document.getElementById('setting-theme-select') as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.value = this.settings.theme || 'system';
      themeSelect.addEventListener('change', async () => {
        const val = themeSelect.value as any;
        this.settings.theme = val;
        this.applyTheme(val);
        await SnippetStore.updateSettings({ theme: val });
      });
    }

    const prefixSelect = document.getElementById('setting-prefix-select') as HTMLSelectElement;
    if (prefixSelect) {
      prefixSelect.value = this.settings.triggerPrefix !== undefined ? this.settings.triggerPrefix : '/';
      prefixSelect.addEventListener('change', async () => {
        this.settings.triggerPrefix = prefixSelect.value;
        await SnippetStore.updateSettings({ triggerPrefix: prefixSelect.value });
        const prefixDisplay = document.getElementById('trigger-prefix-display');
        if (prefixDisplay) prefixDisplay.textContent = this.settings.triggerPrefix || '•';
      });
    }

    const confirmDelete = document.getElementById('setting-confirm-delete') as HTMLInputElement;
    if (confirmDelete) {
      confirmDelete.checked = this.settings.confirmOnDelete !== false;
      confirmDelete.addEventListener('change', async () => {
        this.settings.confirmOnDelete = confirmDelete.checked;
        await SnippetStore.updateSettings({ confirmOnDelete: confirmDelete.checked });
      });
    }

    this.renderExclusions();
    document.getElementById('btn-add-exclusion')?.addEventListener('click', () => {
      this.addExclusion();
    });
  }

  private renderExclusions(): void {
    const list = document.getElementById('exclusion-domains-list');
    if (!list) return;

    list.innerHTML = '';
    const exclusions = this.settings.excludedDomains || [];

    exclusions.forEach((domain) => {
      const chip = document.createElement('span');
      chip.className = 'exclusion-chip';
      chip.innerHTML = `
        <span>${this.escapeHtml(domain)}</span>
        <button class="exclusion-remove-btn" title="Remove exclusion" data-domain="${domain}">×</button>
      `;

      chip.querySelector('button')?.addEventListener('click', async (e) => {
        const d = (e.currentTarget as HTMLElement).getAttribute('data-domain');
        if (d) {
          this.settings.excludedDomains = (this.settings.excludedDomains || []).filter((item) => item !== d);
          await SnippetStore.updateSettings({ excludedDomains: this.settings.excludedDomains });
          this.renderExclusions();
        }
      });

      list.appendChild(chip);
    });
  }

  private async addExclusion(): Promise<void> {
    const input = document.getElementById('new-exclusion-input') as HTMLInputElement;
    if (!input || !input.value.trim()) return;

    let domain = input.value.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    const current = this.settings.excludedDomains || [];
    if (!current.includes(domain)) {
      this.settings.excludedDomains = [...current, domain];
      await SnippetStore.updateSettings({ excludedDomains: this.settings.excludedDomains });
      this.renderExclusions();
      input.value = '';
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const workspace = new ManagerWorkspace();
  workspace.init().catch((err) => {
    console.error('Failed to initialize Snippo Workspace:', err);
  });
});
