import { describe, it, expect, beforeEach } from 'vitest';
import { BackupManager } from '../../src/data/import-export';
import { SnippetStore } from '../../src/data/store';

describe('BackupManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exports valid JSON backup structure', async () => {
    await SnippetStore.init();
    const backup = await BackupManager.exportBackup();
    expect(backup.version).toBe(1);
    expect(Array.isArray(backup.snippets)).toBe(true);
    expect(backup.snippets.length).toBeGreaterThan(0);
    expect(backup.settings).toBeDefined();
  });

  it('imports valid backup and merges snippets', async () => {
    await SnippetStore.init();
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      snippets: [
        {
          id: 'imported-1',
          trigger: '/imported',
          body: 'Imported Body Content',
          description: 'Imported Snippet',
          folder: 'Testing',
          enabled: true,
        },
      ],
    };

    const res = await BackupManager.importBackup(JSON.stringify(backupData), 'merge');
    expect(res.success).toBe(true);
    expect(res.importedCount).toBe(1);

    const snip = await SnippetStore.getSnippetById('imported-1');
    expect(snip).not.toBeNull();
    expect(snip?.trigger).toBe('/imported');
  });

  it('gracefully handles corrupted JSON data', async () => {
    const res = await BackupManager.importBackup('not valid json {', 'merge');
    expect(res.success).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});
