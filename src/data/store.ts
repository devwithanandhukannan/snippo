/**
 * Data Store: Manages persistent snippet and settings storage.
 * Runs in chrome.storage.local with fallback to localStorage.
 * Maintains compact trigger index for lightweight content script usage.
 */

import { Settings, Snippet, TriggerIndex } from '../core/types';
import { DEFAULT_SETTINGS, INITIAL_SNIPPETS } from './schema';

const STORAGE_KEY_SNIPPETS = 'verbatim_snippets_v1';
const STORAGE_KEY_SETTINGS = 'verbatim_settings_v1';
const STORAGE_KEY_INDEX = 'verbatim_trigger_index_v1';
const STORAGE_KEY_INITIALIZED = 'verbatim_initialized_v1';

export class SnippetStore {
  /**
   * Helper to check if Chrome extension storage is available.
   */
  private static isChromeStorageAvailable(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.storage?.local;
  }

  /**
   * Reads raw data from Chrome storage or localStorage.
   */
  private static async getRaw<T>(key: string): Promise<T | null> {
    if (this.isChromeStorageAvailable()) {
      const res = await chrome.storage.local.get(key);
      return (res[key] as T) ?? null;
    }
    const val = localStorage.getItem(key);
    return val ? (JSON.parse(val) as T) : null;
  }

  /**
   * Writes raw data to Chrome storage or localStorage.
   */
  private static async setRaw<T>(key: string, value: T): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [key]: value });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  /**
   * Initializes store on first boot if never initialized before.
   */
  public static async init(): Promise<void> {
    const isInitialized = await this.getRaw<boolean>(STORAGE_KEY_INITIALIZED);
    if (isInitialized) {
      return;
    }

    const existingSnippets = await this.getRaw<Snippet[]>(STORAGE_KEY_SNIPPETS);
    const existingSettings = await this.getRaw<Settings>(STORAGE_KEY_SETTINGS);

    // Only seed on true fresh installation (neither snippets nor settings exist)
    if (existingSnippets === null && existingSettings === null) {
      await this.setRaw(STORAGE_KEY_SNIPPETS, INITIAL_SNIPPETS);
      await this.setRaw(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS);
      await this.rebuildIndex(INITIAL_SNIPPETS);
    }

    await this.setRaw(STORAGE_KEY_INITIALIZED, true);
  }

  /**
   * Retrieves all snippets.
   */
  public static async getAllSnippets(): Promise<Snippet[]> {
    const isInitialized = await this.getRaw<boolean>(STORAGE_KEY_INITIALIZED);
    if (!isInitialized) {
      await this.init();
    }
    const data = await this.getRaw<Snippet[]>(STORAGE_KEY_SNIPPETS);
    return data || [];
  }

  /**
   * Retrieves a single snippet by ID.
   */
  public static async getSnippetById(id: string): Promise<Snippet | null> {
    const snippets = await this.getAllSnippets();
    return snippets.find((s) => s.id === id) || null;
  }

  /**
   * Saves (adds or updates) a snippet and refreshes index.
   */
  public static async saveSnippet(snippet: Snippet): Promise<Snippet> {
    const snippets = await this.getAllSnippets();
    const existingIdx = snippets.findIndex((s) => s.id === snippet.id);

    const now = Date.now();
    const updatedSnippet = {
      ...snippet,
      updatedAt: now,
    };

    if (existingIdx !== -1) {
      snippets[existingIdx] = updatedSnippet;
    } else {
      updatedSnippet.createdAt = now;
      snippets.unshift(updatedSnippet);
    }

    await this.setRaw(STORAGE_KEY_SNIPPETS, snippets);
    await this.rebuildIndex(snippets);
    return updatedSnippet;
  }

  /**
   * Deletes a snippet by ID and refreshes index.
   */
  public static async deleteSnippet(id: string): Promise<Snippet | null> {
    const snippets = await this.getAllSnippets();
    const target = snippets.find((s) => s.id === id);
    if (!target) return null;

    const filtered = snippets.filter((s) => s.id !== id);
    await this.setRaw(STORAGE_KEY_SNIPPETS, filtered);
    await this.rebuildIndex(filtered);
    return target;
  }

  /**
   * Increments usage count of a snippet.
   */
  public static async recordUsage(id: string): Promise<void> {
    const snippets = await this.getAllSnippets();
    const target = snippets.find((s) => s.id === id);
    if (target) {
      target.usageCount = (target.usageCount || 0) + 1;
      target.lastUsedAt = Date.now();
      await this.setRaw(STORAGE_KEY_SNIPPETS, snippets);
    }
  }

  /**
   * Rebuilds and persists the compact trigger index (trigger -> {id, trigger, enabled, folder}).
   */
  public static async rebuildIndex(snippets?: Snippet[]): Promise<TriggerIndex> {
    const list = snippets || (await this.getAllSnippets());
    const index: TriggerIndex = {};

    for (const snip of list) {
      index[snip.trigger] = {
        id: snip.id,
        trigger: snip.trigger,
        enabled: snip.enabled,
        folder: snip.folder,
      };
    }

    await this.setRaw(STORAGE_KEY_INDEX, index);
    return index;
  }

  /**
   * Gets the compact trigger index used by content scripts.
   */
  public static async getTriggerIndex(): Promise<TriggerIndex> {
    const index = await this.getRaw<TriggerIndex>(STORAGE_KEY_INDEX);
    if (!index) {
      return await this.rebuildIndex();
    }
    return index;
  }

  /**
   * Retrieves user settings.
   */
  public static async getSettings(): Promise<Settings> {
    const settings = await this.getRaw<Settings>(STORAGE_KEY_SETTINGS);
    if (!settings) {
      await this.setRaw(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  /**
   * Updates user settings.
   */
  public static async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const merged = { ...current, ...updates };
    await this.setRaw(STORAGE_KEY_SETTINGS, merged);
    return merged;
  }

  /**
   * Toggles pause/exclusion for a given hostname.
   */
  public static async toggleDomainExclusion(domain: string): Promise<boolean> {
    const settings = await this.getSettings();
    const cleanDomain = domain.toLowerCase().trim();
    const isExcluded = settings.excludedDomains.includes(cleanDomain);

    let updatedList: string[];
    if (isExcluded) {
      updatedList = settings.excludedDomains.filter((d) => d !== cleanDomain);
    } else {
      updatedList = [...settings.excludedDomains, cleanDomain];
    }

    await this.updateSettings({ excludedDomains: updatedList });
    return !isExcluded; // Returns new exclusion state
  }

  /**
   * Checks if a domain is currently excluded.
   */
  public static async isDomainExcluded(domain: string): Promise<boolean> {
    const settings = await this.getSettings();
    const cleanDomain = domain.toLowerCase().trim();
    return settings.excludedDomains.some(
      (excluded) => cleanDomain === excluded || cleanDomain.endsWith('.' + excluded)
    );
  }
}
