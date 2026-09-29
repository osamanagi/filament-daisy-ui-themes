import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { transform } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'resources/dist')
const check = process.argv.includes('--check')
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
const palettes = {}
const appearances = {}
let tokens =
    '/* daisyUI 5.7.46 theme definitions only: no resets or components. */\n'

for (const name of ['cupcake', 'nord', 'dracula']) {
    const { default: theme } = await import(
        pathToFileURL(`${root}/node_modules/daisyui/theme/${name}/object.js`)
    )
    tokens += `:root[data-theme="${name}"] {\n${Object.entries(theme)
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
        Object.assign(palettes[name].gray, {
            50: normalize(theme['--color-base-200']),
            100: normalize(theme['--color-base-200']),
            200: normalize(theme['--color-base-300']),
            950: content,
        })
    }
    tokens += `:root[data-theme="${name}"] {\n${Object.entries(palettes[name])
        .flatMap(([color, shades]) =>
            Object.entries(shades).map(
                ([shade, value]) => `  --${color}-${shade}: ${value};`,
            ),
        )
        .join('\n')}\n}\n`
}
const data = {
    daisyuiVersion,
    filamentSupportVersion,
    themes: Object.fromEntries(
        Object.keys(palettes).map((name) => [
            name,
            { appearance: appearances[name], palettes: palettes[name] },
        ]),
    ),
}
const assets = {
    'themes.css': (await transform(tokens, { loader: 'css', minify: true }))
        .code,
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
if (!check) mkdirSync(output, { recursive: true })
for (const [name, contents] of Object.entries(assets)) {
    const path = `${output}/${name}`
    if (check) {
        if (readFileSync(path, 'utf8') !== contents)
            throw new Error(`${name} is stale; run npm run build:themes`)
    } else writeFileSync(path, contents)
}
console.log(
    `${check ? 'Verified' : 'Generated'} adapter assets for ${Object.keys(data.themes).join(', ')}`,
)
