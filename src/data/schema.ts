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
  {
    id: 'snip-meet',
    trigger: '/meet',
    body: "Let's connect on Google Meet: https://meet.google.com/{cursor}",
    description: 'Google Meet link with cursor placement',
    folder: 'Work',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'snip-date',
    trigger: '/date',
    body: '{date}',
    description: "Today's formatted date",
    folder: 'General',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'snip-sig',
    trigger: '/sig',
    body: 'Best regards,\nAlex Rivera\nEngineering Lead | Snippo',
    description: 'Professional email signature',
    folder: 'Work',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'snip-shrug',
    trigger: '/shrug',
    body: '¯\\_(ツ)_/¯',
    description: 'Shrug kaomoji',
    folder: 'Fun',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
];
