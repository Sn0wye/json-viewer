import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// O "exports" do monaco-editor só expõe .js; os .css saem por este alias (ver src/lib/monaco.ts).
const monacoEsm = fileURLToPath(new URL('./node_modules/monaco-editor/esm/vs/', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [{ find: /^monaco-css\/(.*)$/, replacement: `${monacoEsm}$1` }],
  },
  build: { chunkSizeWarningLimit: 5000 },
});
