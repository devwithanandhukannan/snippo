/**
 * Data Import/Export: Backup and restore functionality.
 * Supports clean JSON export and validated import with deduplication.
 */

import { Settings, Snippet } from '../core/types';
import { SnippetStore } from './store';

export interface VerbatimBackupData {
  version: number;
  exportedAt: string;
  snippets: Snippet[];
  settings?: Settings;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

export class BackupManager {
  /**
   * Generates a backup data bundle.
   */
  public static async exportBackup(): Promise<VerbatimBackupData> {
    const snippets = await SnippetStore.getAllSnippets();
    const settings = await SnippetStore.getSettings();

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      snippets,
      settings,
    };
  }

  /**
   * Downloads backup file in browser.
   */
  public static downloadBackupFile(data: VerbatimBackupData): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snippo-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Validates and imports JSON backup string.
   */
  public static async importBackup(
    jsonString: string,
    mode: 'merge' | 'overwrite' = 'merge'
  ): Promise<ImportResult> {
    const errors: string[] = [];
    let parsed: any;

    try {
      parsed = JSON.parse(jsonString);
    } catch (e: any) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: ['Invalid JSON format: ' + (e?.message || 'parse error')],
      };
    }

    if (!parsed || !Array.isArray(parsed.snippets)) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: ['Invalid backup file structure: missing "snippets" array'],
      };
    }

    const currentSnippets = await SnippetStore.getAllSnippets();
    const currentTriggers = new Set(currentSnippets.map((s) => s.trigger));

    let importedCount = 0;
    let skippedCount = 0;
    const finalSnippets: Snippet[] = mode === 'overwrite' ? [] : [...currentSnippets];

    for (const item of parsed.snippets) {
      if (!item.trigger || typeof item.trigger !== 'string' || !item.body) {
        errors.push(`Skipped malformed snippet: ${JSON.stringify(item).slice(0, 50)}`);
        skippedCount++;
        continue;
      }

      const cleanTrigger = item.trigger.trim();
      const newSnippet: Snippet = {
        id: item.id || 'snip-' + Math.random().toString(36).slice(2, 9),
        trigger: cleanTrigger,
        body: String(item.body),
        description: item.description ? String(item.description) : '',
        folder: item.folder ? String(item.folder) : 'General',
        enabled: item.enabled !== false,
        createdAt: item.createdAt || Date.now(),
        updatedAt: item.updatedAt || Date.now(),
        usageCount: item.usageCount || 0,
      };

      if (mode === 'merge' && currentTriggers.has(cleanTrigger)) {
        // In merge mode, replace existing or skip
        const idx = finalSnippets.findIndex((s) => s.trigger === cleanTrigger);
        if (idx !== -1) {
          finalSnippets[idx] = newSnippet;
          importedCount++;
        }
      } else {
        finalSnippets.push(newSnippet);
        currentTriggers.add(cleanTrigger);
        importedCount++;
      }
    }

    // Save final list to storage
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ verbatim_snippets_v1: finalSnippets });
    } else {
      localStorage.setItem('verbatim_snippets_v1', JSON.stringify(finalSnippets));
    }

    // Also import settings if present
    if (parsed.settings && typeof parsed.settings === 'object') {
      await SnippetStore.updateSettings(parsed.settings);
    }

    await SnippetStore.rebuildIndex(finalSnippets);

    return {
      success: true,
      importedCount,
      skippedCount,
      errors,
    };
  }
}
