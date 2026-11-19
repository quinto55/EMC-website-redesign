// Draws the QR code on the gate scanning demo's sample ticket. It encodes only the words EMC-SAMPLE-TICKET (not a web
// address and not a real ticket's barcode). The SVG is committed, so the site never needs `qrcode` at run time.
//
//   npm run sample-qr
import QRCode from 'qrcode';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'public/emc-site/img/sample-ticket-qr.svg');

const svg = await QRCode.toString('EMC-SAMPLE-TICKET', {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 2,
  color: { dark: '#1b1f2a', light: '#ffffff' }, // the site's ink on white
});
writeFileSync(OUT, `${svg.trim()}\n`);
console.log(`wrote ${OUT}`);
