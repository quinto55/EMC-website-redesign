import { describe, it, expect } from 'vitest';
import { validateLead, buildLead } from '../src/form/lead.js';

describe('validateLead', () => {
  it('accepts a complete lead', () => {
    expect(validateLead({ name: 'Pat', event: 'Demo County Fair', email: 'pat@example.org', message: '' }).ok).toBe(true);
  });
  it('requires name, event and email, with these messages', () => {
    const r = validateLead({ name: ' ', event: '', email: 'nope', message: '' });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual({
      name: 'Enter your name.',
      event: 'Enter your fair or event.',
      email: 'Enter an email address we can reply to.',
    });
  });
});

describe('buildLead', () => {
  it('trims and caps every field', () => {
    const lead = buildLead(
      { name: '  Pat  ', event: 'x'.repeat(500), email: ' PAT@Example.org ', message: 'm'.repeat(5000) },
      { page: '/iafe/', utm: {}, request: 'talk' },
    );
    expect(lead.name).toBe('Pat');
    expect(lead.event).toHaveLength(160);
    expect(lead.email).toBe('PAT@Example.org');
    expect(lead.message).toHaveLength(2000);
  });
  it('carries the page, the campaign tags and the request type', () => {
    const utm = { utm_source: 'iafe', utm_medium: 'handout', utm_campaign: 'iafe2026', utm_content: 'walgreens-card' };
    const lead = buildLead({ name: 'Pat', event: 'Demo County Fair', email: 'pat@example.org', message: '' }, { page: '/iafe/', utm, request: 'talk' });
    expect(lead.subject).toBe('Website inquiry: Demo County Fair');
    expect(lead.replyto).toBe('pat@example.org');
    expect(lead.page).toBe('/iafe/');
    expect(lead.utm_content).toBe('walgreens-card');
    expect(lead.utm_source).toBe('iafe');
    expect(lead.request).toBe('Conversation');
    const m = buildLead({ name: 'Pat', event: 'E', email: 'a@b.co', message: '' }, { page: '/retail-partners/', utm: {}, request: 'mockup' });
    expect(m.request).toBe('In-store mockup');
    expect(m.utm_source).toBe('');
  });
});
