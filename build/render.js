import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import * as config from '../src/site-config.js';
import { ASK_VARIANTS, askHeadingHtml } from '../src/form/variants.js';
import { SITE_URL } from './pages.js';
import { renderBoardHTML } from '../src/demo/board-markup.js';
import { createBoardState, snapshot } from '../src/demo/board-engine.js';
import { renderDashboardHTML } from '../src/demo/dashboard-markup.js';
import { createDashState, dashSnapshot } from '../src/demo/dashboard-engine.js';
import { renderGateScanHTML } from '../src/demo/gate-scan.js';
import { renderDayReportHTML } from '../src/demo/day-report.js';
import { VIDEOS, renderVideoHTML, publishedMeta } from './videos.js';
import { CURTAIN_SEEN_KEY, shouldShowCurtain, curtainInputs } from '../src/curtain/should-show.js';

const PARTIALS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'partials');
const OG_IMAGE = `${SITE_URL}/emc-site/og-image.png`;
const PRELOAD_FONTS = ['/emc-site/fonts/bricolage-grotesque-var.woff2', '/emc-site/fonts/figtree-var.woff2'];

/** The header logo for each tone, at the files' native pixel sizes (never shown larger). */
const HEADER_LOGOS = {
  photo: { src: '/emc-site/img/emc-logo-on-dark.png', width: 309, height: 250 },  // white TICKETS word
  cream: { src: '/emc-site/img/emc-logo-on-light.png', width: 298, height: 238 }, // navy TICKETS word
};

/** name -> (page, opts) => html. Later tasks add entries; a generator wins over a partial of the same name. */
export const GENERATORS = {
  board: () => renderBoardHTML(snapshot(createBoardState())),
  dashboard: () => renderDashboardHTML(dashSnapshot(createDashState())),
  'gate-scan': () => renderGateScanHTML(),
  'day-report': () => renderDayReportHTML(),
};
// One player per product video (<!--site:video-box-office--> and so on). A video that is not
// cleared renders nothing; a cleared one whose files were never copied stops the build.
for (const video of VIDEOS) {
  GENERATORS[`video-${video.id}`] = () => renderVideoHTML(video, video.cleared ? publishedMeta(video) : {});
}

const defaultRead = (name) => {
  try {
    return readFileSync(join(PARTIALS_DIR, `${name}.html`), 'utf8');
  } catch {
    return undefined;
  }
};

export function buildVars(page, { staging = false } = {}) {
  const vars = {};
  for (const [k, v] of Object.entries(config)) if (typeof v === 'string') vars[k] = v;
  vars.YEAR = String(new Date().getFullYear());
  vars.TONE = page.tone;
  vars.PAGE_PATH = page.path;
  vars.ASK_VARIANT = page.ask;
  const ask = ASK_VARIANTS[page.ask];
  if (!ask) throw new Error(`Unknown ask variant "${page.ask}" on ${page.file}`);
  vars.ASK_HEADING = askHeadingHtml(page.ask);
  vars.ASK_BUTTON = ask.button;
  const logo = HEADER_LOGOS[page.tone === 'photo' ? 'photo' : 'cream'];
  vars.LOGO_SRC = logo.src;
  vars.LOGO_WIDTH = String(logo.width);
  vars.LOGO_HEIGHT = String(logo.height);
  return vars;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The home page's curtain decision, made in the head before the first paint (spec 5.4): when the module's own rule
 * holds, `curtain-pending` goes on <html> and curtain.css covers the hero with the still until the module takes over
 * (or, if it never does, for 8 seconds). The rule is the module's: the two functions' source is copied in here.
 */
function curtainHeadScript() {
  const src = `(function(){var show=${shouldShowCurtain};var read=${curtainInputs};` +
    `try{if(show(read(window,${JSON.stringify(CURTAIN_SEEN_KEY)})))document.documentElement.classList.add('curtain-pending')}catch(e){}})()`;
  return `<script>${src}</script>`;
}

function headBlock(page, { staging }) {
  const url = SITE_URL + page.path;
  const lines = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(page.title)}</title>`,
  ];
  if (page.description) lines.push(`<meta name="description" content="${esc(page.description)}">`);
  if (page.key !== 'notFound') lines.push(`<link rel="canonical" href="${url}">`);
  if (!page.indexable || staging) lines.push('<meta name="robots" content="noindex">');
  lines.push(
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="EMC Tickets">',
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${OG_IMAGE}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="theme-color" content="#fff8ec">',
    '<meta name="emc-site" content="relaunch">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/emc-site/icons/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/emc-site/icons/favicon-16x16.png">',
    '<link rel="apple-touch-icon" href="/emc-site/icons/apple-touch-icon.png">',
    '<link rel="manifest" href="/emc-site/site.webmanifest">',
    "<script>document.documentElement.classList.add('js')</script>",
    ...(page.key === 'home' ? [curtainHeadScript()] : []),
    ...PRELOAD_FONTS.map((href) => `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`),
    ...page.styles.map((href) => `<link rel="stylesheet" href="${href}">`),
    `<script type="module" src="${page.entry}"></script>`,
  );
  return lines.join('\n');
}

export function renderPage(source, page, { staging = false, read = defaultRead } = {}) {
  let html = source.replace('<!--site:head-->', () => headBlock(page, { staging }));

  const placeholder = /<!--site:([A-Za-z0-9_-]+)-->/;
  for (let depth = 0; placeholder.test(html); depth++) {
    if (depth > 20) throw new Error('site placeholders nest too deeply (cycle?)');
    html = html.replace(new RegExp(placeholder.source, 'g'), (_, name) => {
      if (GENERATORS[name]) return GENERATORS[name](page, { staging });
      const partial = read(name);
      if (partial === undefined) throw new Error(`Unknown site placeholder: ${name}`);
      return partial;
    });
  }

  if (page.nav) {
    html = html.split(`data-nav="${page.nav}"`).join(`data-nav="${page.nav}" aria-current="page"`);
  }

  const vars = buildVars(page, { staging });
  return html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, token) => {
    if (!(token in vars)) throw new Error(`Unknown site token: ${token}`);
    return vars[token];
  });
}
