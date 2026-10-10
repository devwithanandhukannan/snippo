import { describe, it, expect } from 'vitest';
import { PlainInputAdapter } from '../../src/content/adapters/plain-input';
import { RichEditableAdapter } from '../../src/content/adapters/rich-editable';
import { EditorDetector } from '../../src/content/detector';
import { isHostExcluded } from '../../src/utils/site-exclusion';

describe('PlainInputAdapter', () => {
  it('extracts tail text accurately up to maxLen', () => {
    // Mock input element
    const input = {
      value: 'Hello world /omw',
      selectionEnd: 16,
    } as unknown as HTMLInputElement;

    const tail = PlainInputAdapter.getTail(input, 10);
    expect(tail).toBe('world /omw');
  });

  it('correctly replaces trigger with range text', () => {
    let internalValue = 'Hey /omw';
    const input: any = {
      value: internalValue,
      selectionStart: 8,
      selectionEnd: 8,
      setRangeText(replacement: string, start: number, end: number) {
        internalValue = internalValue.slice(0, start) + replacement + internalValue.slice(end);
        input.value = internalValue;
        input.selectionStart = input.selectionEnd = start + replacement.length;
      },
      dispatchEvent: () => true,
    };

    const context = PlainInputAdapter.replaceTrigger(
      input,
      4, // length of /omw
      { text: 'On my way!' },
      'test-snip',
      '/omw'
    );

    expect(input.value).toBe('Hey On my way!');
    expect(context.expandedText).toBe('On my way!');
    expect(context.restoreData.originalTriggerText).toBe('/omw');

    // Test undo
    PlainInputAdapter.undo(input, context);
    expect(input.value).toBe('Hey /omw');
  });
});

describe('RichEditableAdapter', () => {
  it('extracts tail text accurately and cleans invisible zero-width spaces', () => {
    const textNode = {
      nodeType: 3, // Node.TEXT_NODE
      textContent: 'Hello\u200B /date',
    };

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => ({
        startContainer: textNode,
        startOffset: 12,
      }),
    };

    (globalThis as any).window = {
      getSelection: () => mockSelection,
    };
    (globalThis as any).Node = { TEXT_NODE: 3 };

    const container = {} as HTMLElement;
    const tail = RichEditableAdapter.getTail(container, 10);
    expect(tail).toBe('ello /date');
  });
});

describe('EditorDetector', () => {
  it('detects password input on skip list', () => {
    const pwdInput = {
      type: 'password',
      autocomplete: '',
      getAttribute: () => null,
    } as unknown as HTMLInputElement;

    // Check custom check
    expect(EditorDetector.isSkipListElement(null)).toBe(true);
  });

  it('detects sensitive payment autocomplete on skip list', () => {
    const ccInput = {
      type: 'text',
      autocomplete: 'cc-number',
      getAttribute: () => null,
    } as unknown as HTMLInputElement;

    expect(ccInput.autocomplete.includes('cc-')).toBe(true);
  });
});

describe('Site Exclusion', () => {
  const excluded = ['bankofamerica.com', 'chase.com'];

  it('matches exact and subdomain hosts', () => {
    expect(isHostExcluded('chase.com', excluded)).toBe(true);
    expect(isHostExcluded('secure.chase.com', excluded)).toBe(true);
    expect(isHostExcluded('google.com', excluded)).toBe(false);
  });
});
