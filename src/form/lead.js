export const LIMITS = { name: 120, event: 160, email: 254, message: 2000 };
const REQUESTS = { talk: 'Conversation', mockup: 'In-store mockup' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const tidy = (v, max) => String(v ?? '').trim().slice(0, max);

export function validateLead(fields) {
  const errors = {};
  if (!tidy(fields.name, LIMITS.name)) errors.name = 'Enter your name.';
  if (!tidy(fields.event, LIMITS.event)) errors.event = 'Enter your fair or event.';
  if (!EMAIL.test(tidy(fields.email, LIMITS.email))) errors.email = 'Enter an email address we can reply to.';
  return { ok: Object.keys(errors).length === 0, errors };
}

export function buildLead(fields, { page, utm = {}, request }) {
  const name = tidy(fields.name, LIMITS.name);
  const event = tidy(fields.event, LIMITS.event);
  const email = tidy(fields.email, LIMITS.email);
  return {
    subject: `Website inquiry: ${event}`,
    name,
    event,
    email,
    replyto: email,
    message: tidy(fields.message, LIMITS.message),
    request: REQUESTS[request] ?? REQUESTS.talk,
    page,
    utm_source: utm.utm_source ?? '',
    utm_medium: utm.utm_medium ?? '',
    utm_campaign: utm.utm_campaign ?? '',
    utm_content: utm.utm_content ?? '',
  };
}
