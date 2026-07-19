import { getConsent } from './consent.js';
import {
  PROD_HOSTNAMES,
  POSTHOG_KEY,
  POSTHOG_HOST,
  CLARITY_ID,
  LINKEDIN_PARTNER_ID,
  META_PIXEL_ID,
} from './site-config.js';

export function trackingAllowed(hostname = location.hostname) {
  return PROD_HOSTNAMES.includes(hostname) && getConsent() === 'accepted';
}

function injectScript(src, doc) {
  const s = doc.createElement('script');
  s.async = true;
  s.src = src;
  doc.head.appendChild(s);
}

export function loadVendors(doc = document) {
  const w = doc.defaultView || window;
  if (POSTHOG_KEY && !w.posthog) {
    // Official stub: queue init until the SDK script arrives.
    const ph = (w.posthog = []);
    ph._i = [];
    ph.init = (key, cfg) => ph._i.push([key, cfg]);
    injectScript(`${POSTHOG_HOST}/static/array.js`, doc);
    ph.init(POSTHOG_KEY, { api_host: POSTHOG_HOST });
  }
  if (CLARITY_ID && !w.clarity) {
    w.clarity = function (...args) {
      (w.clarity.q = w.clarity.q || []).push(args);
    };
    injectScript(`https://www.clarity.ms/tag/${CLARITY_ID}`, doc);
  }
  if (LINKEDIN_PARTNER_ID && !w._linkedin_partner_id) {
    w._linkedin_partner_id = LINKEDIN_PARTNER_ID;
    w._linkedin_data_partner_ids = w._linkedin_data_partner_ids || [];
    w._linkedin_data_partner_ids.push(LINKEDIN_PARTNER_ID);
    injectScript('https://snap.licdn.com/li.lms-analytics/insight.min.js', doc);
  }
  if (META_PIXEL_ID && !w.fbq) {
    const fbq = (w.fbq = function (...args) {
      fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args);
    });
    w._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    injectScript('https://connect.facebook.net/en_US/fbevents.js', doc);
    w.fbq('init', META_PIXEL_ID);
    w.fbq('track', 'PageView');
  }
}

export function initAnalytics(doc = document, hostname = location.hostname) {
  if (!PROD_HOSTNAMES.includes(hostname)) return;
  if (getConsent() === 'accepted') {
    loadVendors(doc);
    return;
  }
  doc.addEventListener(
    'emc:consent-accepted',
    () => loadVendors(doc),
    { once: true }
  );
}
