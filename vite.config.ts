import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const SCRIPT_NAME = 'Better Habr';
const NAMESPACE = 'https://github.com/ilyachch';
const MATCH_URLS = [
  'https://habr.com/*/post/*/*',
  'https://habr.com/*/blog/*/*',
  'https://habr.com/*/news/*/*',
  'https://habr.com/*/articles/*/*',
  'https://habr.com/**/company/**/**/*',
];
const ICON_URL = 'https://www.google.com/s2/favicons?sz=64&domain=habr.com';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: SCRIPT_NAME,
        namespace: NAMESPACE,
        match: MATCH_URLS,
        icon: ICON_URL,
        license: 'MIT',
        description: 'Habr.com usability enhancer',
        author: 'ilyachch',
        grant: ['GM_addStyle', 'GM_registerMenuCommand'],
        homepageURL: 'https://github.com/ilyachch-userscripts/better-habr',
        supportURL: 'https://github.com/ilyachch-userscripts/better-habr/issues',
        updateURL:
          'https://github.com/ilyachch-userscripts/better-habr/releases/latest/download/better-habr.user.js',
        downloadURL:
          'https://github.com/ilyachch-userscripts/better-habr/releases/latest/download/better-habr.user.js',
        'run-at': 'document-idle',
      },
    }),
  ],
});
