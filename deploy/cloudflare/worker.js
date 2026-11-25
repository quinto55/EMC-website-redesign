// The new site on emctickets.com, served by Cloudflare in front of the old web host (deploy/GO-LIVE-CLOUDFLARE.md).
// A request for one of the new site's files (dist-cf/) is answered from it without running this code. This code runs
// for the home page and for every address that is not a file of the new site, and does what deploy/htaccess-block.conf
// does on Apache: WordPress keeps its own addresses at /, eight old addresses move for good, the rest goes to the old host.

// WordPress's own names at / : a search, a short link or preview, form plugins, the REST API, feeds.
const WP_QUERY = /(^|&)(s|p|page_id|preview|rest_route|gf_page|wc-ajax|feed|jet_form_builder_submit)=/i;

export const MOVED = new Map([
  ['what-we-do', '/platform/'], ['online', '/platform/#online-sales'], ['onsite', '/platform/#box-office'], ['social', '/marketing/'],
  ['contact-us', '/contact/'], ['privacy-and-terms', '/privacy/'], ['walgreens', '/retail-partners/'], ['events', '/'],
]);

/** 'home' (the new home page), 'origin' (the old host) or the address a permanent redirect points to. */
export function decide(url, method) {
  if (url.pathname === '/') {
    return (method === 'GET' || method === 'HEAD') && !WP_QUERY.test(url.search.slice(1)) ? 'home' : 'origin';
  }
  const to = MOVED.get(url.pathname.match(/^\/([^/]+)\/?$/)?.[1]);
  if (!to) return 'origin';
  // As on Apache: the query is kept, except on the two that land on a section of a page (QSD there).
  return to.includes('#') ? to : to + url.search;
}

export default {
  async fetch(request, env) {
    const to = decide(new URL(request.url), request.method);
    if (to === 'origin') return fetch(request); // on a zone route this goes to the old host named in DNS
    if (to === 'home') return env.ASSETS.fetch(request);
    // Relative, so the same answer is right on the live domain and on a local test copy.
    return new Response(null, { status: 301, headers: { Location: to } });
  },
};
