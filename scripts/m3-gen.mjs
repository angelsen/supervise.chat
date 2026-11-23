// Usage: bun scripts/m3-gen.mjs > src/styles/m3.css
// bun, not node: @material/material-color-utilities 0.4.0 ships extensionless ESM imports.
import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
	DynamicScheme,
	Hct,
	MaterialDynamicColors,
	SchemeTonalSpot,
	TonalPalette,
	Variant,
	argbFromHex,
	hexFromArgb,
} from '@material/material-color-utilities';

// The first seed is the site's scheme; any others are emitted as `data-seed` alternatives for comparing.
const SEEDS = { ember: '#c4501b' };

const dir = join(
	process.env.RESOURCES_HOME ?? join(homedir(), '.local/share/resources'),
	'm3.material.io/tokens',
);
const tokens = new Map();
for (const name of readdirSync(dir)) {
	if (!name.endsWith('.json')) continue;
	for (const t of JSON.parse(readFileSync(join(dir, name), 'utf8'))) {
		if (t.chosen && typeof t.chosen.resolved === 'string') tokens.set(t.token, t.chosen.resolved);
	}
}
const need = (token) => {
	const value = tokens.get(token);
	if (value === undefined) throw new Error(`no token ${token} in ${dir}`);
	return value;
};
const under = (prefix, pattern) =>
	[...tokens.keys()].filter((t) => t.startsWith(prefix) && pattern.test(t.slice(prefix.length))).sort();
const cssName = (token) => '--' + token.replaceAll('.', '-');
const num = (value) => parseFloat(value);
const rem = (value) => `${num(value) / 16}rem`;

const kebab = (name) => name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const roles = Object.getOwnPropertyNames(MaterialDynamicColors).filter(
	(k) => MaterialDynamicColors[k]?.getArgb && !k.endsWith('PaletteKeyColor'),
);
const scheme = (seed, dark) => {
	const source = Hct.fromInt(argbFromHex(seed));
	const spot = new SchemeTonalSpot(source, dark, 0);
	// Tonal spot, with two departures: the primary keeps more of the seed's chroma, and the neutrals are a warm
	// paper tone instead of a tint of the seed, so surfaces read as cream and not as pink.
	const s = new DynamicScheme({
		sourceColorHct: source,
		variant: Variant.TONAL_SPOT,
		isDark: dark,
		contrastLevel: 0,
		primaryPalette: TonalPalette.fromHueAndChroma(source.hue, 48),
		secondaryPalette: spot.secondaryPalette,
		tertiaryPalette: spot.tertiaryPalette,
		neutralPalette: TonalPalette.fromHueAndChroma(88, 4),
		neutralVariantPalette: TonalPalette.fromHueAndChroma(84, 7),
		errorPalette: spot.errorPalette,
	});
	return roles.map(
		(k) => `--md-sys-color-${kebab(k)}: ${hexFromArgb(MaterialDynamicColors[k].getArgb(s))};`,
	);
};

// A spring token pair as a CSS `linear()` easing and the time it takes to settle within 0.1%.
const spring = (name) => {
	const zeta = num(need(`md.sys.motion.spring.${name}.damping`));
	const w0 = Math.sqrt(num(need(`md.sys.motion.spring.${name}.stiffness`)));
	const at = (t) => {
		if (zeta >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
		const wd = w0 * Math.sqrt(1 - zeta * zeta);
		return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
	};
	let settle = 0;
	for (let t = 0; t < 3; t += 0.001) if (Math.abs(1 - at(t)) > 0.001) settle = t;
	const steps = 32;
	const points = Array.from({ length: steps + 1 }, (_, i) =>
		i === steps ? '1' : at((settle * i) / steps).toFixed(4).replace(/\.?0+$/, '') || '0',
	);
	const css = name.replaceAll('.', '-');
	return [
		`--md-sys-motion-spring-${css}: linear(${points.join(', ')});`,
		`--md-sys-motion-spring-${css}-duration: ${Math.round(settle * 1000)}ms;`,
	];
};

const base = [];
for (const t of under('md.sys.shape.corner-value.', /^[a-z-]+$/)) {
	base.push(`${cssName(t).replace('corner-value', 'corner')}: ${num(need(t))}px;`);
}
base.push('--md-sys-shape-corner-full: 9999px;');
for (const role of ['display', 'headline', 'title', 'body', 'label']) {
	for (const size of ['large', 'medium', 'small']) {
		const t = `md.sys.typescale.${role}-${size}`;
		base.push(
			`${cssName(t)}-size: ${rem(need(`${t}.size`))};`,
			`${cssName(t)}-line-height: ${rem(need(`${t}.line-height`))};`,
			`${cssName(t)}-weight: ${need(`${t}.weight`)};`,
			`${cssName(t)}-tracking: ${rem(need(`${t}.tracking`))};`,
		);
	}
}
for (const t of under('md.sys.measurement.space', /^\d+$/).sort(
	(a, b) => num(need(a)) - num(need(b)),
)) {
	base.push(`${cssName(t).replace('measurement-', '')}: ${rem(need(t))};`);
}
for (const t of under('md.sys.state.', /state-layer-opacity$/)) base.push(`${cssName(t)}: ${need(t)};`);
for (const part of ['thickness', 'outer-offset', 'inner-offset']) {
	const t = `md.sys.state.focus-indicator.${part}`;
	base.push(`${cssName(t)}: ${num(need(t))}px;`);
}
for (const t of under('md.sys.motion.duration.', /^[a-z-]+\d$/)) base.push(`${cssName(t)}: ${need(t)};`);
for (const t of under('md.sys.motion.easing.', /^(standard|emphasized)(\.(accelerate|decelerate))?$/)) {
	base.push(`${cssName(t)}: ${need(t)};`);
}
for (const speed of ['fast', 'default', 'slow']) {
	for (const kind of ['spatial', 'effects']) base.push(...spring(`${speed}.${kind}`));
}

const block = (selector, lines) => `${selector} {\n${lines.map((l) => '\t' + l).join('\n')}\n}\n`;
const out = [
	'/* Generated by scripts/m3-gen.mjs from the m3.material.io token mirror. Do not edit. */',
	block(':root', base),
];
const [first, ...others] = Object.entries(SEEDS);
out.push(block(':root', scheme(first[1], true)));
out.push(block(":root[data-theme='light']", scheme(first[1], false)));
for (const [name, seed] of others) {
	out.push(block(`:root[data-seed='${name}']`, scheme(seed, true)));
	out.push(block(`:root[data-seed='${name}'][data-theme='light']`, scheme(seed, false)));
}
console.log(out.join('\n'));
