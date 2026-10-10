/**
 * Core Resolver: Expands dynamic variables into final replacement text
 * Supports {date}, {time}, {day}, {year}, {clipboard}, {cursor}.
 * Tracks caret position with {cursor} placeholder.
 */

import { ResolvedText } from './types';

export interface ResolverContext {
  now?: Date;
  clipboardText?: string;
}

export class TemplateResolver {
  /**
   * Resolves snippet template text with variables.
   * Handles both {variable} and {{variable}} patterns.
   */
  public static resolve(template: string, context: ResolverContext = {}): ResolvedText {
    if (!template) {
      return { text: '' };
    }

    const now = context.now || new Date();
    let cursorOffset: number | undefined = undefined;

    // First replace dynamic date/time variables
    let result = template.replace(/\{\{?([a-zA-Z0-9_:]+)\}?\}/g, (match, varName: string) => {
      const lower = varName.toLowerCase();

      switch (lower) {
        case 'date':
          return now.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

        case 'date:iso':
          return now.toISOString().split('T')[0];

        case 'date:short':
          return now.toLocaleDateString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });

        case 'time':
          return now.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          });

        case 'time:24':
          return now.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });

        case 'day':
          return now.toLocaleDateString(undefined, { weekday: 'long' });

        case 'year':
          return now.getFullYear().toString();

        case 'clipboard':
          return context.clipboardText ?? '';

        case 'cursor':
          // Keep cursor tag for second pass so we calculate correct offset
          return '__VERBATIM_CURSOR__';

        default:
          return match; // Unknown variable, keep as is
      }
    });

    // Check for cursor position
    const cursorMarker = '__VERBATIM_CURSOR__';
    const cursorIdx = result.indexOf(cursorMarker);
    if (cursorIdx !== -1) {
      cursorOffset = cursorIdx;
      result = result.replace(cursorMarker, '');
    }

    return {
      text: result,
      cursorOffset,
    };
  }

  /**
   * List of supported variable tags with descriptions for UI chips.
   */
  public static getAvailableVariables(): { tag: string; label: string; preview: string }[] {
    const now = new Date();
    return [
      {
        tag: '{date}',
        label: 'Date',
        preview: now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      },
      {
        tag: '{time}',
        label: 'Time',
        preview: now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      },
      {
        tag: '{cursor}',
        label: 'Cursor Position',
        preview: 'Caret stops here',
      },
      {
        tag: '{clipboard}',
        label: 'Clipboard',
        preview: 'Paste clipboard',
      },
      {
        tag: '{day}',
        label: 'Day of Week',
        preview: now.toLocaleDateString(undefined, { weekday: 'long' }),
      },
      {
        tag: '{date:short}',
        label: 'Short Date',
        preview: now.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }),
      },
    ];
  }
}
