import { describe, it, expect, beforeEach } from 'vitest';
import { SnippetStore } from '../../src/data/store';
import { Snippet } from '../../src/core/types';

describe('SnippetStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with seed snippets on first boot', async () => {
    await SnippetStore.init();
    const snippets = await SnippetStore.getAllSnippets();
    expect(snippets.length).toBeGreaterThan(0);
    expect(snippets.some((s) => s.trigger === '/omw')).toBe(true);
  });

  it('does NOT re-seed initial snippets if user deleted them all', async () => {
    await SnippetStore.init();
    const all = await SnippetStore.getAllSnippets();
    for (const snip of all) {
      await SnippetStore.deleteSnippet(snip.id);
    }
    const emptySnippets = await SnippetStore.getAllSnippets();
    expect(emptySnippets.length).toBe(0);

    // Simulate refreshing / re-initializing the extension
    await SnippetStore.init();
    const afterRefresh = await SnippetStore.getAllSnippets();
    expect(afterRefresh.length).toBe(0);
  });

  it('saves and retrieves a new snippet', async () => {
    await SnippetStore.init();
    const newSnip: Snippet = {
      id: 'test-1',
      trigger: '/brb',
      body: 'Be right back!',
      description: 'Quick BRB',
      folder: 'General',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };

    await SnippetStore.saveSnippet(newSnip);
    const retrieved = await SnippetStore.getSnippetById('test-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.body).toBe('Be right back!');

    const index = await SnippetStore.getTriggerIndex();
    expect(index['/brb']).toBeDefined();
  });

  it('deletes a snippet and updates the trigger index', async () => {
    await SnippetStore.init();
    const newSnip: Snippet = {
      id: 'test-del',
      trigger: '/delme',
      body: 'To be deleted',
      description: 'Delete me',
      folder: 'General',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };

    await SnippetStore.saveSnippet(newSnip);
    await SnippetStore.deleteSnippet('test-del');

    const retrieved = await SnippetStore.getSnippetById('test-del');
    expect(retrieved).toBeNull();

    const index = await SnippetStore.getTriggerIndex();
    expect(index['/delme']).toBeUndefined();
  });

  it('toggles domain exclusion correctly', async () => {
    await SnippetStore.init();
    const domain = 'github.com';

    const isExcludedFirst = await SnippetStore.isDomainExcluded(domain);
    expect(isExcludedFirst).toBe(false);

    const newState = await SnippetStore.toggleDomainExclusion(domain);
    expect(newState).toBe(true);
    expect(await SnippetStore.isDomainExcluded(domain)).toBe(true);

    const revertedState = await SnippetStore.toggleDomainExclusion(domain);
    expect(revertedState).toBe(false);
    expect(await SnippetStore.isDomainExcluded(domain)).toBe(false);
  });
});
