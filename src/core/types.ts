/**
 * Core type definitions for Verbatim text expansion.
 * Zero external dependencies.
 */

export type VariableType =
  | 'date'
  | 'date:short'
  | 'date:iso'
  | 'time'
  | 'time:24'
  | 'day'
  | 'month'
  | 'year'
  | 'clipboard'
  | 'cursor';

export interface Snippet {
  id: string;
  trigger: string;
  body: string;
  description: string;
  folder: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  lastUsedAt?: number;
}

export interface Settings {
  triggerPrefix: string;
  expandOn: 'immediate' | 'space' | 'enter';
  showChip: boolean;
  chipDurationMs: number;
  soundOnExpand: boolean;
  excludedDomains: string[];
  theme: 'system' | 'light' | 'dark';
  confirmOnDelete?: boolean;
  schemaVersion: number;
}

export interface TriggerIndexEntry {
  id: string;
  trigger: string;
  enabled: boolean;
  folder: string;
}

export type TriggerIndex = Record<string, TriggerIndexEntry>;

export interface TailMatch {
  matchedTrigger: string;
  snippetId: string;
  tailLength: number;
}

export interface ResolvedText {
  text: string;
  cursorOffset?: number; // Relative position where cursor should be placed
}

export interface ConflictResult {
  hasConflict: boolean;
  type?: 'duplicate' | 'prefix' | 'suffix';
  message?: string;
  conflictingSnippetId?: string;
}

export interface CaretCoordinates {
  x: number;
  y: number;
  height: number;
}

export type EditorType = 'plain-input' | 'rich-editable' | 'shadow-dom' | 'fallback' | 'unsupported';

export interface ExpansionUndoContext {
  id: string;
  snippetId: string;
  trigger: string;
  expandedText: string;
  timestamp: number;
  editorType: EditorType;
  // State for restoring
  restoreData: {
    startOffset: number;
    endOffset: number;
    originalTriggerText: string;
    [key: string]: unknown;
  };
}
