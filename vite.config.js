import { defineConfig } from 'vite';
import { resolve } from 'path';
import { PAGES } from './build/pages.js';
import sitePlugin from './build/vite-plugin-site.js';

export default defineConfig(({ mode }) => ({
  appType: 'mpa',
  server: {
    watch: {
      // WSL2 + Windows-drive (/mnt/c) checkouts don't emit inotify events,
      // so Vite's watcher never invalidates edited modules. Poll instead.
      usePolling: true,
      interval: 300,
      // Polling every build copy and tool folder (about 3,000 files) took half a CPU and 3 s per file served.
      ignored: ['**/dist/**', '**/dist-host/**', '**/dist-cf/**', '**/.superpowers/**', '**/.impeccable/**', '**/assets-src/**', '**/docs/**'],
    },
  },
  plugins: [sitePlugin({ staging: mode === 'staging' })],
  build: {
    assetsDir: 'emc-site/assets',
    rollupOptions: {
      input: Object.fromEntries(PAGES.map((p) => [p.key, resolve(__dirname, p.file)])),
    },
  },
}));
