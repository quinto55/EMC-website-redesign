export const SITE_URL = 'https://emctickets.com';
export const PROD_HOSTNAMES = ['emctickets.com', 'www.emctickets.com'];
export const CONTACT_EMAIL = 'info@emctickets.com';

/* Analytics IDs — an empty string disables that vendor entirely.
   Paste real EMC account IDs here when they exist; nothing else to wire.
   ACTIVATION NOTE: the PostHog/LinkedIn loaders in analytics.js are condensed,
   not vendor-verbatim — smoke-test each vendor on a staging host the first
   time its real ID goes in. */
export const POSTHOG_KEY = '';
export const POSTHOG_HOST = 'https://us.i.posthog.com';
export const CLARITY_ID = '';
export const LINKEDIN_PARTNER_ID = '';
export const META_PIXEL_ID = '';

/* Site contact and app links, used by the page renderer as {{TOKENS}}. */
export const LEAD_NAME = 'Anthony Quintana';
export const LEAD_EMAIL = 'anthony@emctickets.com';
export const TOLL_FREE = '800-290-2090';
export const TOLL_FREE_TEL = '+18002902090';
export const OFFICE_STREET = '8409 Land O Lakes Blvd';
export const OFFICE_CITY = 'Land O Lakes, FL 34638';
export const APP_RECOVER_URL = 'https://app.emctickets.com/recover';
export const APP_LOGIN_URL = 'https://app.emctickets.com/portal/login';
export const POS_TOUR_URL = 'https://app.emctickets.com/pos/tour';

/* The contact form's delivery service. The key stays empty until the site owner approves the
   service: with no key the live site shows the email and phone fallback instead of the form. */
export const FORM_SERVICE_NAME = 'Web3Forms';
export const FORM_ENDPOINT = 'https://api.web3forms.com/submit';
export const FORM_ACCESS_KEY = '';
