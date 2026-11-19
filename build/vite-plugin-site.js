import { writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { pageByFile } from './pages.js';
import { renderPage } from './render.js';

export default function sitePlugin({ staging = false } = {}) {
  let root = process.cwd();
  let outDir = 'dist';
  let building = false;
  return {
    name: 'emc-site',
    configResolved(config) {
      root = config.root;
      outDir = config.build.outDir;
      building = config.command === 'build'; // a dev server also calls closeBundle, when it stops
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const file = relative(root, ctx.filename).split(sep).join('/');
        const page = pageByFile(file);
        return page ? renderPage(html, page, { staging }) : html;
      },
    },
    configureServer(server) {
      const partials = join(root, 'src', 'partials');
      server.watcher.add(partials);
      const reload = (f) => {
        if (f.split(sep).join('/').includes('/src/partials/')) server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('change', reload);
    },
    closeBundle() {
      if (!staging || !building) return;
      const dir = resolve(root, outDir); // an absolute --outDir stays as given; a relative one is under the root
      if (!existsSync(dir)) {
        throw new Error(`Staging build: the output folder ${dir} is missing, so its robots.txt cannot be set to disallow everything`);
      }
      writeFileSync(join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    },
  };
}
