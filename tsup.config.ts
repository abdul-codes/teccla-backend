import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'es2022',
  clean: true,
  minify: false, // Keep readable for debugging
  sourcemap: true,
  dts: false, // Set true if you're building a library
  outExtension: () => ({ js: '.mjs' }),
  external: ['@prisma/client'],
});