/**
 * Fallback Adapter: Handles special-case editors (like canvas-based Google Docs)
 * Copies expansion to clipboard so user can paste with ⌘V / Ctrl+V.
 */

import { ResolvedText } from '../../core/types';

export class FallbackAdapter {
  public static async copyToClipboard(resolved: ResolvedText): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(resolved.text);
        return true;
      }
    } catch {
      // Fallback using textarea
      const ta = document.createElement('textarea');
      ta.value = resolved.text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const success = document.execCommand('copy');
      document.body.removeChild(ta);
      return success;
    }
    return false;
  }
}
