// Work samples: real ads and ticket sale sites EMC made for fairs, festivals and rodeos. Every one of them was
// already public on the old emctickets.com ("What we do"); the originals are kept in assets-src/work and
// `npm run work` (scripts/build-work.mjs) writes the web sizes into public/emc-site/work.
//
// Rules for adding one: it must be EMC's own published work; no performer's or celebrity's face, and no child as the
// main subject; the words under `alt` say what the ad is for and carry no prices or dates.
export const WORK_PUBLIC_DIR = 'public/emc-site/work';
export const WORK_SOURCE_DIR = 'assets-src/work';
const WORK_URL = '/emc-site/work';

/** kind: 'ad' is a square, built 280 and 560 wide; 'site' is a wide device mockup, built 400 and 800 wide. */
const KINDS = {
  ad: { widths: [280, 560], ratio: [1, 1] },
  site: { widths: [400, 800], ratio: [8, 5] },
};

/** Each set is one row or grid on one page. `sizes` tells the browser how wide a picture is drawn. */
export const WORK_SETS = {
  // Marketing page
  ads: {
    kind: 'ad', sizes: '(max-width: 700px) 46vw, (max-width: 1000px) 23vw, 270px',
    items: [
      { slug: 'bsaf-get-ready', source: '1080x1080_BSAF-v3_small.jpg', alt: 'Ad for the Big SA Fair: get ready for a roller-coaster of non-stop fun, with a Walgreens fast lane banner.' },
      { slug: 'bepf-giveaway', source: 'BEPF-giveaway-6.jpg', alt: 'Social media giveaway ad for the Big El Paso Fair: make some noise, win some prizes.' },
      { slug: 'btcf-food', source: 'BTCF-food-v2.jpg', alt: 'Social media ad for the Big Tri City Fair asking: sweet or savory, what fair food do you prefer?' },
      { slug: 'ccf-goat', source: 'CCF-2024-Goats-Fashion-600.jpg', alt: "Ad for the Coastal Carolina Fair's goat fashion show: a goat in sunglasses and a cape." },
      { slug: 'ccf-donuts', source: 'CCF2025-Save-20-donuts.webp', alt: 'Ad for the Coastal Carolina Fair, Fair Under the Stars: savings online and at Circle K, with donuts in a night sky.' },
      { slug: 'camper-rv', source: 'Camper-RV-Shows-v1.jpg', alt: 'Ad for a camper and RV show at Exchange Park.' },
      { slug: 'triple-b-bull', source: 'BBB-ad-bull-v2.jpg', alt: 'Ad for the Triple B Cowboy Challenge: a bull rider, limited seating.' },
      { slug: 'ccf-pretzels', source: 'CCF2025-Pretzels-imagepulse.png', alt: 'Ad for the Coastal Carolina Fair: delicious new food, yummy pretzels, with a Circle K fast lane banner.' },
    ],
  },
  sites: {
    kind: 'site', sizes: '(max-width: 700px) 92vw, (max-width: 1000px) 31vw, 366px',
    items: [
      { slug: 'site-big-sa-fair', source: 'mockup-bsaf-web.jpg', alt: "The Big SA Fair's ticket sale site on a laptop and a phone." },
      { slug: 'site-mn-ren-fest', source: 'MinRenFest-web.jpg', alt: "The Minnesota Renaissance Festival's ticket sale site on a laptop and a phone." },
      { slug: 'site-sc-state-fair', source: 'SCS-web.jpg', alt: "The South Carolina State Fair's ticket sale site, with its Circle K store locations, on a laptop and a phone." },
    ],
  },
  // Retail partners page
  retail: {
    kind: 'ad', sizes: '(max-width: 700px) 46vw, (max-width: 1000px) 23vw, 270px',
    items: [
      { slug: 'promo-santa-en', source: 'general-3_small.jpg', alt: "Ad for Santa's Enchanted Forest: savings on every ticket purchased at Walgreens." },
      { slug: 'promo-santa-es', source: 'general-2-ES_small.jpg', alt: "The same promotion for Santa's Enchanted Forest in Spanish: savings on every ticket bought at Walgreens." },
      { slug: 'promo-mecklenburg', source: 'BMCF-Half-Price-WG-v4.jpg', alt: 'Ad for the Big Mecklenburg County Fair: half-price gate tickets now on sale, only at Walgreens.' },
      { slug: 'promo-ccf-circle-k', source: 'CCF-save5-rides.jpg', alt: 'Ad for the Coastal Carolina Fair: save and skip the line with the Circle K fast lane.' },
    ],
  },
  // About page
  about: {
    kind: 'ad', sizes: '(max-width: 700px) 30vw, (max-width: 1000px) 15vw, 176px',
    items: [
      { slug: 'bsaf-circus', source: '1080x1080_BSAF-v2a_small.jpg', alt: "Ad for the Big SA Fair's Wonderland Circus: free shows daily with gate admission." },
      { slug: 'ccf-senior-day', source: 'CCF-seniors-day-700px.jpg', alt: 'Ad for Senior Day at the Coastal Carolina Fair.' },
      { slug: 'baf-mega-pass', source: 'BAF-megapass-v4_1.jpg', alt: "Ad for the Big Austin Fair's Mega Pass." },
      { slug: 'ccf-bullriders', source: 'bullriders-v2_small.jpg', alt: 'Ad for the American Bullriders Tour at the Coastal Carolina Fair.' },
      { slug: 'ccf-barn-animals', source: 'CCF2025-barn-20-v2.webp', alt: 'Ad for the barn animals at the Coastal Carolina Fair.' },
      { slug: 'family-festival', source: 'bogovinska-pecina-9.webp', alt: 'Ad for the last weekend of the Exchange Park Family Festival and Cowboy Challenge.' },
    ],
  },
};

/** Every file `npm run work` writes for a set's item: { width, height, webp, jpg } per width. */
export function workFiles(setName, item) {
  const { widths, ratio } = KINDS[WORK_SETS[setName].kind];
  return widths.map((width) => ({
    width,
    height: Math.round((width * ratio[1]) / ratio[0]),
    webp: `${item.slug}-${width}.webp`,
    jpg: `${item.slug}-${width}.jpg`,
  }));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * One set as a list of pictures. Each loads only when the visitor scrolls near it (they all sit below the first
 * screen), as WebP with a JPEG for browsers without it.
 */
export function renderWorkHTML(setName) {
  const set = WORK_SETS[setName];
  if (!set) throw new Error(`Unknown work set: ${setName}`);
  const lines = [`<ul class="work-grid work-${esc(setName)}">`];
  for (const item of set.items) {
    const files = workFiles(setName, item);
    const big = files[files.length - 1];
    const srcset = (ext) => files.map((f) => `${WORK_URL}/${f[ext]} ${f.width}w`).join(', ');
    lines.push(
      '  <li><picture>',
      `    <source type="image/webp" srcset="${srcset('webp')}" sizes="${esc(set.sizes)}">`,
      `    <img src="${WORK_URL}/${big.jpg}" srcset="${srcset('jpg')}" sizes="${esc(set.sizes)}" width="${big.width}" height="${big.height}" alt="${esc(item.alt)}" loading="lazy" decoding="async">`,
      '  </picture></li>',
    );
  }
  lines.push('</ul>');
  return lines.join('\n');
}
