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

  it('updates and persists settings enabled state', async () => {
    await SnippetStore.init();
    const initialSettings = await SnippetStore.getSettings();
    expect(initialSettings.enabled).toBe(true);

    const updated = await SnippetStore.updateSettings({ enabled: false });
    expect(updated.enabled).toBe(false);

    const reloaded = await SnippetStore.getSettings();
    expect(reloaded.enabled).toBe(false);

    await SnippetStore.updateSettings({ enabled: true });
    expect((await SnippetStore.getSettings()).enabled).toBe(true);
  });

  it('throws an error when trying to save a snippet with an existing trigger', async () => {
    await SnippetStore.init();
    const snip1: Snippet = {
      id: 'test-dup-1',
      trigger: '/samename',
      body: 'First one',
      description: 'First',
      folder: 'General',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };
    await SnippetStore.saveSnippet(snip1);

    const snip2: Snippet = {
      id: 'test-dup-2',
      trigger: '/samename',
      body: 'Second one with same trigger',
      description: 'Second',
      folder: 'General',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };

    await expect(SnippetStore.saveSnippet(snip2)).rejects.toThrow(
      'Duplicate trigger: "/samename" is already used by another snippet.'
    );

    const all = await SnippetStore.getAllSnippets();
    const matching = all.filter((s) => s.trigger === '/samename');
    expect(matching.length).toBe(1);
    expect(matching[0].id).toBe('test-dup-1');
  });

  it('prevents concurrent race conditions when saving snippets at the same time', async () => {
    await SnippetStore.init();
    const snipA: Snippet = {
      id: 'test-race-a',
      trigger: '/concurrent_trigger',
      body: 'First concurrent attempt',
      description: 'A',
      folder: 'General',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };
    const snipB: Snippet = {
      id: 'test-race-b',
      trigger: '/concurrent_trigger',
      body: 'Second concurrent attempt with same name',
      description: 'B',
      folder: 'General',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };

    // Trigger both saves concurrently at the exact same time
    const results = await Promise.allSettled([
      SnippetStore.saveSnippet(snipA),
      SnippetStore.saveSnippet(snipB),
    ]);

    // Exactly one must succeed, and one must be rejected due to duplicate trigger
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const all = await SnippetStore.getAllSnippets();
    const matching = all.filter((s) => s.trigger === '/concurrent_trigger');
    expect(matching.length).toBe(1);
  });

  it('allows updating an existing snippet without triggering duplicate check on itself', async () => {
    await SnippetStore.init();
    const snip: Snippet = {
      id: 'test-update-self',
      trigger: '/selfupdate',
      body: 'Initial body',
      description: 'Self',
      folder: 'General',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };
    await SnippetStore.saveSnippet(snip);

    // Update body with same trigger
    snip.body = 'Updated body';
    await expect(SnippetStore.saveSnippet(snip)).resolves.not.toThrow();

    const retrieved = await SnippetStore.getSnippetById('test-update-self');
    expect(retrieved?.body).toBe('Updated body');
  });
});

