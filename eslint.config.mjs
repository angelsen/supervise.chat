// @ts-check
import eslint from '@eslint/js';
import eslintPluginAstro from 'eslint-plugin-astro';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
	globalIgnores(['dist/', '.astro/', 'node_modules/', 'src/generated/']),
	eslint.configs.recommended,
	tseslint.configs.recommended,
	eslintPluginAstro.configs.recommended,
	eslintPluginAstro.configs['jsx-a11y-recommended'],
	{ files: ['scripts/**', '*.mjs'], languageOptions: { globals: globals.node } },
	{ files: ['**/*.astro/*.ts', '**/*.astro/*.js'], languageOptions: { globals: globals.browser } },
	prettierConfig
);
