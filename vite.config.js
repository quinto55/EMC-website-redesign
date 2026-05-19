import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        whatWeDo: resolve(__dirname, 'what-we-do.html'),
        sellOnsite: resolve(__dirname, 'sell-onsite.html'),
        sellOnline: resolve(__dirname, 'sell-online.html'),
        sellSocial: resolve(__dirname, 'sell-social.html'),
        contact: resolve(__dirname, 'contact.html'),
      },
    },
  },
});
