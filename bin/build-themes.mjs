import {
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { transform } from 'esbuild'
import { clampContrast, clampPair } from './oklch.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'resources/dist')
const check = process.argv.includes('--check')
// Minimum WCAG contrast for text-bearing generated stops. The margin above 4.5
// absorbs browser gamut mapping of high-chroma oklch values and the composited
// surfaces muted text actually sits on (which are not always base-100).
const contrastTarget = 5.4
const daisyuiVersion = JSON.parse(
    readFileSync(`${root}/node_modules/daisyui/package.json`),
).version
if (daisyuiVersion !== '5.7.46')
    throw new Error(`Expected daisyUI 5.7.46, got ${daisyuiVersion}`)
const filamentSupportVersion = execFileSync(
    'php',
    [
        '-d',
        'display_errors=stderr',
        '-r',
        'require $argv[1]; echo Composer\\InstalledVersions::getPrettyVersion("filament/support");',
        `${root}/vendor/autoload.php`,
    ],
    { encoding: 'utf8' },
).trim()
if (filamentSupportVersion !== 'v5.9.0')
    throw new Error(
        `Palette generation is verified against filament/support v5.9.0, got ${filamentSupportVersion}`,
    )
// Every built-in daisyUI theme ships; panels inline only what they allowlist.
const allThemes = (
    await import(pathToFileURL(`${root}/node_modules/daisyui/theme/object.js`))
).default
const themeNames = Object.keys(allThemes).sort()
// Themes that passed the full three-engine release matrix (milestone 6).
const verifiedThemes = ['cupcake', 'nord', 'dracula']
// Themes that passed the milestone 7 Chromium acceptance audit (native tables
// and forms, contrast, screenshots, both Filament majors). Re-earn this list
// whenever the theme set or adapter changes; see milestone 7 findings.
const auditedThemes = themeNames
const palettes = {}
const appearances = {}
const themeCss = {}

for (const name of themeNames) {
    const theme = allThemes[name]
    let block = `:root[data-theme="${name}"] {\n${Object.entries(theme)
        .map(([key, value]) => `  ${key}: ${value};`)
        .join('\n')}\n}\n`
    appearances[name] = theme['color-scheme']
    // Resolve real colors for Filament's server-side contrast calculations.
    const normalize = (value) =>
        value.replace(/([\d.]+)%/, (_, n) => Number(n) / 100)
    const colors = Object.fromEntries(
        ['primary', 'info', 'success', 'warning', 'error'].map((key) => [
            key === 'error' ? 'danger' : key,
            normalize(theme[`--color-${key}`]),
        ]),
    )
    const php = `require $argv[1]; $colors=json_decode($argv[2],true); foreach($colors as &$color){$color=\\Filament\\Support\\Colors\\Color::generatePalette($color);} echo json_encode($colors);`
    const result = execFileSync(
        'php',
        [
            '-d',
            'display_errors=stderr',
            '-r',
            php,
            `${root}/vendor/autoload.php`,
            JSON.stringify(colors),
        ],
        { encoding: 'utf8' },
    )
    palettes[name] = JSON.parse(result)
    const base = normalize(theme['--color-base-100'])
    const content = normalize(theme['--color-base-content'])
    const parse = (value) => value.match(/[\d.]+/g).map(Number)
    const mix = (a, b, t) => {
        const aa = parse(a),
            bb = parse(b)
        // Neutral ramp: base hue/chroma, interpolated lightness. Exact endpoints below.
        return `oklch(${aa[0] * (1 - t) + bb[0] * t} ${aa[1]} ${aa[2]})`
    }
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
    const dark = theme['color-scheme'] === 'dark'
    palettes[name].gray = Object.fromEntries(
        shades.map((shade, i) => [
            shade,
            mix(
                base,
                content,
                dark ? 1 - i / 10 : i < 5 ? i / 10 : 0.7 + (i - 5) * 0.06,
            ),
        ]),
    )
    if (dark) {
        Object.assign(palettes[name].gray, {
            50: content,
            900: base,
            950: normalize(theme['--color-base-300']),
        })
    } else {
        // Light surfaces need darker text stops than generatePalette's defaults.
        // This adapter supports only the three browser-verified themes.
        for (const key of Object.keys(colors)) {
            const color = palettes[name][key]
            for (const shade of [600, 700, 800])
                color[shade] = color[shade + 100]
        }
        const page = normalize(theme['--color-base-200'])
        const border = normalize(theme['--color-base-300'])
        // gray-100 is Filament's neutral fill: chart areas, icon wells and
        // active sidebar items. daisyUI ships only two neutrals below base-100,
        // and reusing the page colour made every one of those fills disappear
        // into the page, so step exactly one rung below it: as far as the page
        // itself sits below base-100.
        const rung = parse(base)[0] - parse(page)[0]
        const [pageLightness, pageChroma, pageHue] = parse(page)
        Object.assign(palettes[name].gray, {
            50: page,
            100: `oklch(${pageLightness - rung} ${pageChroma} ${pageHue})`,
            200: border,
            950: content,
        })
    }

    const surfaces = [
        base,
        normalize(theme['--color-base-300']),
        // Active sidebar items, dropdown hovers and other neutral fills paint
        // gray-100, and Filament puts text on that fill.
        dark ? null : palettes[name].gray[100],
    ].filter(Boolean)
    for (const stop of dark ? [400, 500, 600] : [500, 600, 700, 800, 900]) {
        let value = palettes[name].gray[stop]
        for (const surface of surfaces) {
            const clamped = clampContrast(value, surface, contrastTarget)
            if (!clamped)
                throw new Error(
                    `Cannot reach ${contrastTarget}:1 for gray-${stop} in ${name}`,
                )
            value = clamped
        }
        palettes[name].gray[stop] = value
    }
    if (!dark) {
        // Filament paints coloured text on the same surfaces (the active
        // sidebar label is -700), so that stop needs the clamp too. Darker
        // surfaces cover the lighter ones, so this also holds on base-100.
        for (const [key, shades] of Object.entries(palettes[name])) {
            if (key === 'gray') continue
            let value = shades[700]
            for (const surface of surfaces) {
                const clamped = clampContrast(value, surface, contrastTarget)
                if (!clamped)
                    throw new Error(
                        `Cannot reach ${contrastTarget}:1 for ${key}-700 in ${name}`,
                    )
                value = clamped
            }
            shades[700] = value
        }
    }
    // The adapter paints primary buttons with daisyUI's own pair. Some built-in
    // themes ship a pair below the contrast target, so clamp the pair, moving
    // whichever side needs the smaller lightness change.
    const button = clampPair(
        normalize(theme['--color-primary']),
        normalize(theme['--color-primary-content']),
        contrastTarget,
    )
    const paletteTokens = Object.entries(palettes[name])
        .flatMap(([color, shades]) =>
            Object.entries(shades).map(
                ([shade, value]) => `  --${color}-${shade}: ${value};`,
            ),
        )
        .join('\n')
    block += `:root[data-theme="${name}"] {\n${paletteTokens}\n  --daisy-btn-primary-bg: ${button.background};\n  --daisy-btn-primary-content: ${button.foreground};\n}\n`
    // The switcher previews each theme with daisyUI's own picker colours. Theme
    // variables only exist on the root, so every swatch carries its own copy.
    block += `[data-daisy-theme-swatch="${name}"] {\n  --fdut-swatch-base: ${base};\n  --fdut-swatch-content: ${content};\n  --fdut-swatch-primary: ${normalize(theme['--color-primary'])};\n  --fdut-swatch-secondary: ${normalize(theme['--color-secondary'])};\n  --fdut-swatch-accent: ${normalize(theme['--color-accent'])};\n}\n`
    themeCss[name] = (await transform(block, { loader: 'css', minify: true }))
        .code
}
const data = {
    daisyuiVersion,
    filamentSupportVersion,
    verified: verifiedThemes,
    audited: auditedThemes,
    themes: Object.fromEntries(
        Object.keys(palettes).map((name) => [
            name,
            { appearance: appearances[name], palettes: palettes[name] },
        ]),
    ),
}
const assets = {
    // Published convenience bundle; panels inline only their allowlisted
    // themes from the per-theme files below instead of loading this whole file.
    'themes.css': themeNames.map((name) => themeCss[name]).join('\n') + '\n',
    'adapter.css': (
        await transform(
            readFileSync(`${root}/resources/css/adapter.css`, 'utf8'),
            { loader: 'css', minify: true },
        )
    ).code,
    'theme-data.json': JSON.stringify(data, null, 2) + '\n',
    'DAISYUI-LICENSE.txt': readFileSync(
        `${root}/node_modules/daisyui/LICENSE`,
        'utf8',
    ),
}
const themeDirectory = `${output}/themes`
if (!check) {
    mkdirSync(output, { recursive: true })
    mkdirSync(themeDirectory, { recursive: true })
    for (const file of readdirSync(themeDirectory)) {
        if (file.endsWith('.css') && !themeNames.includes(file.slice(0, -4)))
            rmSync(`${themeDirectory}/${file}`)
    }
}
for (const [name, contents] of Object.entries(assets)) {
    const path = `${output}/${name}`
    if (check) {
        if (readFileSync(path, 'utf8') !== contents)
            throw new Error(`${name} is stale; run npm run build:themes`)
    } else writeFileSync(path, contents)
}
for (const name of themeNames) {
    const path = `${themeDirectory}/${name}.css`
    if (check) {
        if (readFileSync(path, 'utf8') !== themeCss[name])
            throw new Error(
                `themes/${name}.css is stale; run npm run build:themes`,
            )
    } else writeFileSync(path, themeCss[name])
}
console.log(
    `${check ? 'Verified' : 'Generated'} adapter assets for ${themeNames.length} themes (${verifiedThemes.length} verified)`,
)
