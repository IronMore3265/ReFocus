import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { version } from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [tailwindcss()],
  // So Settings can show the version it was built from, rather than a number
  // someone has to remember to bump twice.
  define: { __APP_VERSION__: JSON.stringify(version) },
});
