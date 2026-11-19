import { describe, it, expect } from 'vitest';
import { ASK_VARIANTS, askHeadingHtml } from '../src/form/variants.js';

describe('askHeadingHtml', () => {
  it('wraps each hyphenated word so it cannot break, and keeps the sentence', () => {
    const html = askHeadingHtml('mockup');
    expect(html).toBe('Get a free <span class="nowrap">in-store</span> mockup of your event.');
    expect(html.replace(/<[^>]+>/g, '')).toBe(ASK_VARIANTS.mockup.heading);
  });
  it('leaves a heading with no hyphen as plain text', () => {
    expect(askHeadingHtml('talk')).toBe("Let's talk about your fair.");
  });
  it('returns an empty string for an unknown variant', () => {
    expect(askHeadingHtml('nope')).toBe('');
  });
});
