import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		outDir: 'webapp/dist',
		emptyOutDir: true,
		assetsInlineLimit: 10_000_000,
		lib: {
			entry: 'webapp/src/index.ts',
			name: 'Plugin',
			formats: ['iife'],
			fileName: () => 'main.js',
		},
	},
});
