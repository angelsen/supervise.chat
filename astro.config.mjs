// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://supervise.chat',
	integrations: [
		starlight({
			title: 'supervise',
			logo: { src: './src/assets/cairn.svg' },
			description:
				'Run several Claude Code sessions side by side and keep them going.',
			customCss: [
				'@fontsource-variable/roboto-flex/full.css',
				'@fontsource-variable/roboto-mono/index.css',
				'./src/styles/m3.css',
				'./src/styles/theme.css',
			],
			components: { Hero: './src/components/Hero.astro' },
			sidebar: [
				{
					label: 'Start',
					items: [
						{ label: 'Install', slug: 'start/install' },
						{ label: 'Doctor', slug: 'start/doctor' },
						{ label: 'Your first hour', slug: 'start/first-hour' },
					],
				},
				{
					label: 'Concepts',
					items: [
						{ label: 'The cairn', slug: 'concepts/cairn' },
						{ label: 'Vocabulary', slug: 'concepts/vocabulary' },
						{ label: 'How it works', slug: 'concepts/how-it-works' },
						{ label: 'macOS and Linux', slug: 'concepts/platforms' },
					],
				},
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
			],
		}),
	],
});
