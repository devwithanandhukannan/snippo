/**
 * Data Schema and default configurations.
 * Versioned schema for migrations and stability.
 */

import { Settings, Snippet } from '../core/types';

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  triggerPrefix: '/',
  expandOn: 'immediate',
  showChip: true,
  chipDurationMs: 1800,
  soundOnExpand: false,
  excludedDomains: ['bankofamerica.com', 'chase.com', 'wellsfargo.com'],
  theme: 'system',
  confirmOnDelete: true,
  schemaVersion: CURRENT_SCHEMA_VERSION,
};

export const INITIAL_SNIPPETS: Snippet[] = [
  {
    id: 'snip-omw',
    trigger: '/omw',
    body: 'On my way!',
    description: 'Quick message: On my way',
    folder: 'General',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'snip-email',
    trigger: '/email',
    body: 'hello@snippo.local',
    description: 'Personal email address',
    folder: 'Personal',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
];
