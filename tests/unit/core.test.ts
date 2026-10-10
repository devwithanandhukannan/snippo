import { describe, it, expect } from 'vitest';
import { TriggerMatcher } from '../../src/core/matcher';
import { TemplateResolver } from '../../src/core/resolver';
import { ConflictDetector } from '../../src/core/conflicts';
import { Snippet, TriggerIndex } from '../../src/core/types';

describe('TriggerMatcher', () => {
  const sampleIndex: TriggerIndex = {
    '/omw': { id: '1', trigger: '/omw', enabled: true, folder: 'General' },
    '/email': { id: '2', trigger: '/email', enabled: true, folder: 'General' },
    ';sig': { id: '3', trigger: ';sig', enabled: true, folder: 'Work' },
    '/disabled': { id: '4', trigger: '/disabled', enabled: false, folder: 'Work' },
  };

  it('matches exact triggers at tail', () => {
    const matcher = new TriggerMatcher(sampleIndex);
    const match = matcher.matchTail('Hey I am /omw');
    expect(match).not.toBeNull();
    expect(match?.snippetId).toBe('1');
    expect(match?.matchedTrigger).toBe('/omw');
  });

  it('ignores disabled triggers', () => {
    const matcher = new TriggerMatcher(sampleIndex);
    const match = matcher.matchTail('Checking /disabled');
    expect(match).toBeNull();
  });

  it('prioritizes longest trigger if there are overlapping suffixes', () => {
    const indexWithOverlap: TriggerIndex = {
      'test': { id: '1', trigger: 'test', enabled: true, folder: 'General' },
      'latest': { id: '2', trigger: 'latest', enabled: true, folder: 'General' },
    };
    const matcher = new TriggerMatcher(indexWithOverlap);
    const match = matcher.matchTail('This is latest');
    expect(match?.snippetId).toBe('2');
    expect(match?.matchedTrigger).toBe('latest');
  });

  it('returns null when no trigger matches', () => {
    const matcher = new TriggerMatcher(sampleIndex);
    expect(matcher.matchTail('Hello world')).toBeNull();
  });
});

describe('TemplateResolver', () => {
  it('resolves date and time correctly', () => {
    const fixedDate = new Date('2026-10-10T12:30:00');
    const res = TemplateResolver.resolve('Today is {date:iso} and year {year}', { now: fixedDate });
    expect(res.text).toBe('Today is 2026-10-10 and year 2026');
  });

  it('handles {cursor} position correctly', () => {
    const template = 'Hello {cursor}, welcome!';
    const res = TemplateResolver.resolve(template);
    expect(res.text).toBe('Hello , welcome!');
    expect(res.cursorOffset).toBe(6);
  });

  it('handles clipboard interpolation', () => {
    const template = 'Link: {clipboard}';
    const res = TemplateResolver.resolve(template, { clipboardText: 'https://example.com' });
    expect(res.text).toBe('Link: https://example.com');
  });
});

describe('ConflictDetector', () => {
  const snippets: Snippet[] = [
    {
      id: '1',
      trigger: '/omw',
      body: 'On my way',
      description: 'OMW',
      folder: 'General',
      enabled: true,
      createdAt: 1,
      updatedAt: 1,
      usageCount: 0,
    },
    {
      id: '2',
      trigger: '/hello',
      body: 'Hello World',
      description: 'Hello',
      folder: 'General',
      enabled: true,
      createdAt: 1,
      updatedAt: 1,
      usageCount: 0,
    },
  ];

  it('detects duplicate trigger', () => {
    const result = ConflictDetector.checkConflict('/omw', null, snippets);
    expect(result.hasConflict).toBe(true);
    expect(result.type).toBe('duplicate');
  });

  it('allows same trigger when editing own snippet', () => {
    const result = ConflictDetector.checkConflict('/omw', '1', snippets);
    expect(result.hasConflict).toBe(false);
  });

  it('detects prefix conflict', () => {
    const result = ConflictDetector.checkConflict('/hell', null, snippets);
    expect(result.hasConflict).toBe(true);
    expect(result.type).toBe('prefix');
  });

  it('returns no conflict for clean trigger', () => {
    const result = ConflictDetector.checkConflict('/unique', null, snippets);
    expect(result.hasConflict).toBe(false);
  });
});
