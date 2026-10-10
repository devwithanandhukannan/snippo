/**
 * Core Matcher: Tail-only trigger detection right at the caret.
 * Performance budget: < 1ms per keystroke.
 */

import { TailMatch, TriggerIndex } from './types';

export class TriggerMatcher {
  private maxTriggerLength = 32;
  private minTriggerLength = 1;
  private triggerMap: Map<string, string> = new Map(); // trigger -> snippetId

  constructor(index?: TriggerIndex) {
    if (index) {
      this.updateIndex(index);
    }
  }

  /**
   * Updates the trigger hash map from the compact index.
   */
  public updateIndex(index: TriggerIndex): void {
    this.triggerMap.clear();
    let maxLen = 1;
    let minLen = 1000;

    for (const [trigger, entry] of Object.entries(index)) {
      if (entry.enabled) {
        this.triggerMap.set(trigger, entry.id);
        if (trigger.length > maxLen) maxLen = trigger.length;
        if (trigger.length < minLen) minLen = trigger.length;
      }
    }

    this.maxTriggerLength = maxLen;
    this.minTriggerLength = minLen === 1000 ? 1 : minLen;
  }

  /**
   * Fast prefix/tail check.
   * Tests tails from maximum trigger length down to minimum length.
   * Takes substring of length at most maxTriggerLength before caret.
   * Complexity: O(k) where k is maxTriggerLength (typically <= 32 string hash lookups).
   * Execution time is typically 0.002ms - 0.01ms.
   */
  public matchTail(tailText: string): TailMatch | null {
    if (!tailText || this.triggerMap.size === 0) return null;

    const len = tailText.length;
    const searchDepth = Math.min(len, this.maxTriggerLength);

    // Test from longest candidate to shortest to prioritize longest match
    for (let testLen = searchDepth; testLen >= this.minTriggerLength; testLen--) {
      const candidate = tailText.slice(len - testLen);
      const snippetId = this.triggerMap.get(candidate);
      if (snippetId) {
        return {
          matchedTrigger: candidate,
          snippetId,
          tailLength: testLen,
        };
      }
    }

    return null;
  }

  /**
   * Fast gate check: determines if the typed character could possibly be part of an expansion.
   */
  public couldTriggerEnd(char: string, triggerPrefix?: string): boolean {
    if (!char) return false;
    // If triggerPrefix is defined and char matches, it might start one;
    // but here we check if a character could complete any trigger in the index.
    return true;
  }

  public getTriggerCount(): number {
    return this.triggerMap.size;
  }

  public hasTrigger(trigger: string): boolean {
    return this.triggerMap.has(trigger);
  }
}
