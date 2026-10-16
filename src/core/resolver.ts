/**
 * Core Resolver: Expands dynamic variables into final replacement text
 * Supports {date}, {time}, {day}, {year}, {clipboard}, {cursor}.
 * Tracks caret position with {cursor} placeholder.
 */

import { ResolvedText } from './types';

export interface ResolverContext {
  now?: Date;
  clipboardText?: string;
  fillValues?: Record<string, string>;
}

export class TemplateResolver {
  private static readonly BUILT_IN_VARS = new Set([
    'date',
    'date:short',
    'date:iso',
    'time',
    'time:24',
    'day',
    'month',
    'year',
    'clipboard',
    'cursor',
  ]);

  /**
   * Extracts any fill-in/custom variable tags from template.
   * e.g. {fill:Name}, {name}, {phone}
   */
  public static getFillInVariables(template: string): string[] {
    if (!template) return [];
    const matches = template.matchAll(/\{\{?([a-zA-Z0-9_:\s\-]+)\}?\}/g);
    const seen = new Set<string>();
    const fields: string[] = [];

    for (const match of matches) {
      const raw = match[1].trim();
      const lower = raw.toLowerCase();
      if (this.BUILT_IN_VARS.has(lower)) continue;

      let fieldName = raw;
      if (lower.startsWith('fill:')) {
        fieldName = raw.slice(5).trim();
      }

      if (fieldName && !seen.has(fieldName.toLowerCase())) {
        seen.add(fieldName.toLowerCase());
        fields.push(fieldName);
      }
    }

    return fields;
  }

  /**
   * Resolves snippet template text with variables.
   * Handles both {variable} and {{variable}} patterns.
   */
  public static resolve(template: string, context: ResolverContext = {}): ResolvedText {
    if (!template) {
      return { text: '' };
    }

    const now = context.now || new Date();
    const fillValues = context.fillValues || {};
    let cursorOffset: number | undefined = undefined;

    // First replace dynamic date/time & fill-in variables
    let result = template.replace(/\{\{?([a-zA-Z0-9_:\s\-]+)\}?\}/g, (match, rawName: string) => {
      const trimmed = rawName.trim();
      const lower = trimmed.toLowerCase();

      // Check fill-in overrides first
      let fillKey = trimmed;
      if (lower.startsWith('fill:')) {
        fillKey = trimmed.slice(5).trim();
      }

      // Exact or case-insensitive match in fillValues
      const foundKey = Object.keys(fillValues).find(
        (k) => k.toLowerCase() === fillKey.toLowerCase() || k.toLowerCase() === trimmed.toLowerCase()
      );
      if (foundKey && fillValues[foundKey] !== undefined) {
        return fillValues[foundKey];
      }

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

        case 'month':
          return now.toLocaleDateString(undefined, { month: 'long' });

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
        tag: '{date:short}',
        label: 'Short Date',
        preview: now.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }),
      },
      {
        tag: '{date:iso}',
        label: 'ISO Date',
        preview: now.toISOString().split('T')[0],
      },
      {
        tag: '{time}',
        label: 'Time',
        preview: now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      },
      {
        tag: '{time:24}',
        label: '24h Time',
        preview: now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
      },
      {
        tag: '{day}',
        label: 'Day',
        preview: now.toLocaleDateString(undefined, { weekday: 'long' }),
      },
      {
        tag: '{month}',
        label: 'Month',
        preview: now.toLocaleDateString(undefined, { month: 'long' }),
      },
      {
        tag: '{year}',
        label: 'Year',
        preview: now.getFullYear().toString(),
      },
    ];
  }
}
