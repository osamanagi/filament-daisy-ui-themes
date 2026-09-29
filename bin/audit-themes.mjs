// Static contrast audit for every generated theme.
//
// It checks the daisyUI semantic foreground/background pairs the adapter relies
// on and computes WCAG 2.1 contrast in sRGB. This is a fast first-pass filter,
// not a substitute for the browser acceptance matrix: a theme may still fail on
// rendered native components that this script cannot judge.
//
// Usage: node bin/audit-themes.mjs [--json]
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const asJson = process.argv.includes('--json')
const contrastThreshold = 4.5

const allThemes = (
    await import(pathToFileURL(`${root}/node_modules/daisyui/theme/object.js`))
).default

const parseOklch = (value) => {
    const [l, c, h] = value.match(/[\d.]+/g).map(Number)
    // daisyUI writes lightness as a percentage; normalise to 0..1.
    return { l: l > 1 ? l / 100 : l, c, h }
}

const linearize = (channel) =>
    channel <= 0.0031308
        ? 12.92 * channel
        : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055

// OKLCH -> linear sRGB (the space WCAG relative luminance is defined on).
const oklchToLinearSrgb = (value) => {
    const { l, c, h } = parseOklch(value)
    const a = c * Math.cos((h * Math.PI) / 180)
    const b = c * Math.sin((h * Math.PI) / 180)
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b
    const s_ = l - 0.0894841775 * a - 1.291485548 * b
    const l3 = l_ ** 3
    const m3 = m_ ** 3
    const s3 = s_ ** 3
    return [
        4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
        -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
        -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
    ]
}

const relativeLuminance = (value) => {
    const [r, g, b] = oklchToLinearSrgb(value).map((channel) =>
        Math.min(1, Math.max(0, channel)),
    )
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (foreground, background) => {
    const a = relativeLuminance(foreground)
    const b = relativeLuminance(background)
    const [light, dark] = a > b ? [a, b] : [b, a]
    return (light + 0.05) / (dark + 0.05)
}

const round = (value) => Math.round(value * 100) / 100

const pairs = (theme) => [
    ['base-content / base-100', '--color-base-content', '--color-base-100'],
    ['base-content / base-200', '--color-base-content', '--color-base-200'],
    ['base-content / base-300', '--color-base-content', '--color-base-300'],
    ['primary-content / primary', '--color-primary-content', '--color-primary'],
    [
        'secondary-content / secondary',
        '--color-secondary-content',
        '--color-secondary',
    ],
    ['accent-content / accent', '--color-accent-content', '--color-accent'],
    ['neutral-content / neutral', '--color-neutral-content', '--color-neutral'],
    ['info-content / info', '--color-info-content', '--color-info'],
    ['success-content / success', '--color-success-content', '--color-success'],
    ['warning-content / warning', '--color-warning-content', '--color-warning'],
    ['error-content / error', '--color-error-content', '--color-error'],
]

const results = []
for (const name of Object.keys(allThemes).sort()) {
    const theme = allThemes[name]
    const appearance = theme['color-scheme'] === 'dark' ? 'dark' : 'light'
    const failures = []
    const measured = []
    for (const [label, fg, bg] of pairs(theme)) {
        const ratio = round(contrast(theme[fg], theme[bg]))
        measured.push({ label, ratio })
        if (ratio < contrastThreshold)
            failures.push({ label, ratio, foreground: theme[fg], background: theme[bg] })
    }
    results.push({ name, appearance, failures, measured })
}

const failing = results.filter((result) => result.failures.length > 0)

if (asJson) {
    console.log(JSON.stringify({ contrastThreshold, results }, null, 2))
} else {
    for (const result of results) {
        const worst = Math.min(...result.measured.map((pair) => pair.ratio))
        const flag = result.failures.length === 0 ? 'ok  ' : 'FAIL'
        console.log(
            `${flag} ${result.name.padEnd(14)} ${result.appearance.padEnd(5)} worst ${worst.toFixed(2)}:1`,
        )
        for (const failure of result.failures)
            console.log(
                `       ↳ ${failure.label} = ${failure.ratio}:1 (${failure.foreground} on ${failure.background})`,
            )
    }
    console.log(
        `\n${results.length - failing.length}/${results.length} themes pass all semantic pairs at ${contrastThreshold}:1`,
    )
    if (failing.length)
        console.log(
            'Raw semantic pairs are not a ship gate; the rendered theme audit decides. Pass --strict to fail on them.',
        )
}

// Informational by default: daisyUI does not design every semantic pair to meet
// 4.5:1, so raw-pair failures are expected. --strict turns them into an error.
process.exitCode =
    process.argv.includes('--strict') && failing.length > 0 ? 1 : 0
