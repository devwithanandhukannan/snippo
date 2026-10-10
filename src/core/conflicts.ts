/**
 * Core Conflict Detector: Detects duplicate triggers and overlapping trigger prefixes.
 * Error prevention principle: live feedback as the user types in the editor.
 */

import { ConflictResult, Snippet } from './types';

export class ConflictDetector {
  /**
   * Validates if a proposed trigger conflicts with existing snippets.
   * @param proposedTrigger The trigger being edited or created
   * @param currentSnippetId The ID of the snippet being edited (to exclude self)
   * @param snippets The collection of existing snippets
   */
  public static checkConflict(
    proposedTrigger: string,
    currentSnippetId: string | null,
    snippets: Snippet[]
  ): ConflictResult {
    const cleanProposed = proposedTrigger.trim();

    if (!cleanProposed) {
      return { hasConflict: false };
    }

    const activeSnippets = snippets.filter(
      (s) => s.enabled && (!currentSnippetId || s.id !== currentSnippetId)
    );

    // 1. Exact Duplicate Check
    const duplicate = activeSnippets.find((s) => s.trigger === cleanProposed);
    if (duplicate) {
      return {
        hasConflict: true,
        type: 'duplicate',
        message: `Duplicate trigger: "${cleanProposed}" is already used by "${duplicate.description || duplicate.trigger}".`,
        conflictingSnippetId: duplicate.id,
      };
    }

    // 2. Prefix Check (Proposed is prefix of existing)
    // E.g. Proposed is "/sh" and existing is "/shrug"
    const longerMatch = activeSnippets.find((s) => s.trigger.startsWith(cleanProposed));
    if (longerMatch) {
      return {
        hasConflict: true,
        type: 'prefix',
        message: `Prefix conflict: "${cleanProposed}" is a prefix of existing trigger "${longerMatch.trigger}". This will trigger before "${longerMatch.trigger}" can be typed.`,
        conflictingSnippetId: longerMatch.id,
      };
    }

    // 3. Subsumed Check (Existing is prefix of proposed)
    // E.g. Existing is "/sh" and proposed is "/shrug"
    const shorterMatch = activeSnippets.find((s) => cleanProposed.startsWith(s.trigger));
    if (shorterMatch) {
      return {
        hasConflict: true,
        type: 'prefix',
        message: `Prefix conflict: Existing trigger "${shorterMatch.trigger}" will fire before "${cleanProposed}" can be completed.`,
        conflictingSnippetId: shorterMatch.id,
      };
    }

    return { hasConflict: false };
  }
}
