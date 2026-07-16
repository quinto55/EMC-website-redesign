import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    watch: {
      // WSL2 + Windows-drive (/mnt/c) checkouts don't emit inotify events,
      // so Vite's watcher never invalidates edited modules. Poll instead.
      usePolling: true,
      interval: 300,
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        whatWeDo: resolve(__dirname, 'what-we-do.html'),
        sellOnsite: resolve(__dirname, 'sell-onsite.html'),
        sellOnline: resolve(__dirname, 'sell-online.html'),
        sellSocial: resolve(__dirname, 'sell-social.html'),
        contact: resolve(__dirname, 'contact.html'),
        revealHero: resolve(__dirname, 'reveal-hero.html'),
      },
    },
  },
});
