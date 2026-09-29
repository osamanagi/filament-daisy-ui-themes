// Milestone 7 audit: rendered contrast and screenshots for every shipped theme.
//
// This is deliberately separate from the milestone 1-6 suites, which encode the
// three original themes and their expected surface colours. It is manifest
// driven, so it covers every theme in resources/dist/theme-data.json without
// per-theme expectations.
//
// Usage:
//   node tests/Compatibility/theme-audit.mjs
//   COMPAT_BROWSER=firefox COMPAT_MAJORS=5 node tests/Compatibility/theme-audit.mjs
//   COMPAT_THEMES=cupcake,abyss node tests/Compatibility/theme-audit.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const manifest = JSON.parse(
    readFileSync(`${root}/resources/dist/theme-data.json`, 'utf8'),
)
const themes = Object.keys(manifest.themes).sort()
const threshold = 4.5
const output = resolve(
    process.env.COMPAT_OUTPUT || 'docs/compatibility/milestone7',
)
mkdirSync(output, { recursive: true })

const engines = await import(
    pathToFileURL(
        `${process.env.PLAYWRIGHT_DIR || '/tmp/daisy-browser-tools'}/node_modules/playwright/index.mjs`,
    )
)
const browserName = process.env.COMPAT_BROWSER || 'chromium'
const browser = await engines[browserName].launch()
const majors = (process.env.COMPAT_MAJORS || '4,5').split(',').map(Number)
const selected = process.env.COMPAT_THEMES
    ? process.env.COMPAT_THEMES.split(',')
    : themes
const credentials = {
    email: 'tester@example.test',
    password: 'fixture-password',
}

// Class names mirror the verified milestone 1-6 selectors in measure.mjs.
const tableSelectors = {
    heading: 'h1',
    cell: '.fi-ta-text-item',
    badge: '.fi-badge',
    button: '.fi-btn:not(.fi-color-primary)',
    primaryButton: '.fi-btn.fi-color-primary',
    navigation: '.fi-sidebar-item-label',
    breadcrumb: '.fi-breadcrumbs-item-label',
}
const formSelectors = {
    label: '.fi-fo-field-label-content',
    input: '.fi-input',
    helper: '.fi-sc-text',
    button: '.fi-btn:not(.fi-color-primary)',
    primaryButton: '.fi-btn.fi-color-primary',
    sectionHeading: '.fi-section-header-heading',
    stat: '.fi-wi-stats-overview-stat-value',
}

const measure = (page, selectors) =>
    page.evaluate((selectors) => {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const context = canvas.getContext('2d', { willReadFrequently: true })
        const cache = new Map()
        // Filament resolves theme colours to oklch(), which regex parsing cannot
        // read. Paint the value on a 1px canvas to get real sRGB bytes instead.
        const toRgb = (value) => {
            if (cache.has(value)) return cache.get(value)
            context.globalCompositeOperation = 'copy'
            context.fillStyle = value
            context.fillRect(0, 0, 1, 1)
            const data = context.getImageData(0, 0, 1, 1).data
            const result = [data[0], data[1], data[2], data[3] / 255]
            cache.set(value, result)
            return result
        }
        const surface = (el) => {
            const layers = []
            for (let node = el; node; node = node.parentElement)
                layers.unshift(toRgb(getComputedStyle(node).backgroundColor))
            return layers.reduce(
                (bg, fg) =>
                    fg
                        .slice(0, 3)
                        .map((c, i) => c * fg[3] + bg[i] * (1 - fg[3])),
                [255, 255, 255],
            )
        }
        const luminance = (color) =>
            color
                .slice(0, 3)
                .map((c) => c / 255)
                .map((c) =>
                    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
                )
                .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
        const nodes = {}
        for (const [name, selector] of Object.entries(selectors)) {
            // Measure every variant (for example each badge colour), not just
            // the first match, and keep the worst contrast.
            const matches = [...document.querySelectorAll(selector)].filter(
                (candidate) =>
                    candidate.getClientRects().length &&
                    getComputedStyle(candidate).visibility !== 'hidden' &&
                    // Disabled controls are recorded by the milestone 6 suite as
                    // non-text; their reduced contrast is intentional.
                    !candidate.matches(':disabled') &&
                    candidate.getAttribute('aria-disabled') !== 'true' &&
                    // Inputs carry colour but no text content.
                    (candidate.textContent.trim().length ||
                        candidate.matches('input, select, textarea')),
            )
            if (!matches.length) continue
            // Shape must not follow the theme: radii come from Filament, not from
            // daisyUI's --radius-* tokens, so this has to agree across themes.
            const radius = getComputedStyle(matches[0]).borderTopLeftRadius
            let worst
            for (const el of matches) {
                const css = getComputedStyle(el)
                const background = surface(el)
                const foreground = toRgb(css.color)
                foreground[3] *= Number(css.opacity)
                const fg = luminance(
                    foreground
                        .slice(0, 3)
                        .map(
                            (c, i) =>
                                c * foreground[3] +
                                background[i] * (1 - foreground[3]),
                        ),
                )
                const bg = luminance(background)
                const ratio =
                    (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
                const entry = {
                    text: (
                        el.textContent.trim() ||
                        el.getAttribute('placeholder') ||
                        el.value ||
                        el.getAttribute('aria-label') ||
                        el.className
                    ).slice(0, 48),
                    color: css.color,
                    background: css.backgroundColor,
                    effectiveBackground: `rgb(${background
                        .slice(0, 3)
                        .map((channel) => Math.round(channel))
                        .join(', ')})`,
                    contrast: Number.isFinite(ratio) ? +ratio.toFixed(2) : 0,
                }
                if (!worst || entry.contrast < worst.contrast) worst = entry
            }
            nodes[name] = { count: matches.length, worst, radius }
        }
        return {
            theme: document.documentElement.dataset.theme,
            dark: document.documentElement.classList.contains('dark'),
            scheme: document.documentElement.style.colorScheme,
            nodes,
        }
    }, selectors)

const results = { browser: browser.version(), threshold, runs: [] }

try {
    for (const major of majors) {
        const base = `http://127.0.0.1:810${major}`
        const context = await browser.newContext({
            viewport: { width: 1440, height: 1000 },
            colorScheme: 'light',
        })
        const page = await context.newPage()
        page.setDefaultTimeout(15000)
        page.setDefaultNavigationTimeout(20000)
        try {
            await page.goto(`${base}/allthemes/login`)
            await page.fill('input[type=email]', credentials.email)
            await page.fill('input[type=password]', credentials.password)
            await page.click('button[type=submit]')
            await page.waitForURL(`${base}/allthemes`)
        } catch (error) {
            console.error(`filament${major}: login failed: ${error.message}`)
            await context.close()
            continue
        }
        for (const theme of selected) {
            const appearance = manifest.themes[theme].appearance
            const dark = appearance === 'dark'
            const run = {
                major,
                theme,
                appearance,
                failures: [],
                errors: [],
                stages: [],
            }
            results.runs.push(run)
            const onError = (error) => run.errors.push(error.message)
            const onResponse = (response) => {
                if (response.status() >= 400)
                    run.errors.push(`${response.status()} ${response.url()}`)
            }
            page.on('pageerror', onError)
            page.on('response', onResponse)
            try {
                // Force the OS preference to the opposite mode: the explicit theme
                // must still win.
                await page.emulateMedia({
                    colorScheme: dark ? 'light' : 'dark',
                })
                await page.evaluate(
                    (value) =>
                        localStorage.setItem(
                            'filament-daisy-theme:allthemes',
                            value,
                        ),
                    theme,
                )
                for (const [stage, path, selectors] of [
                    ['table', '/products', tableSelectors],
                    ['form', '/products/create', formSelectors],
                ]) {
                    await page.goto(`${base}/allthemes${path}`)
                    await page.waitForTimeout(500)
                    const data = await measure(page, selectors)
                    run.stages.push({ stage, ...data })
                    if (data.theme !== theme)
                        run.failures.push(`${stage}: theme ${data.theme}`)
                    if (data.dark !== dark)
                        run.failures.push(`${stage}: dark ${data.dark}`)
                    if (data.scheme !== appearance)
                        run.failures.push(
                            `${stage}: color-scheme ${data.scheme}`,
                        )
                    for (const [name, node] of Object.entries(data.nodes))
                        if (node.worst.contrast < threshold)
                            run.failures.push(
                                `${stage}: ${name} (${node.count}×, worst "${node.worst.text}") contrast ${node.worst.contrast}`,
                            )
                    await page.screenshot({
                        path: `${output}/${major}-${theme}-${stage}.png`,
                        fullPage: true,
                        animations: 'disabled',
                    })
                }
            } catch (error) {
                run.failures.push(`audit error: ${error.message}`)
            } finally {
                page.off('pageerror', onError)
                page.off('response', onResponse)
            }
            const status =
                run.failures.length || run.errors.length ? 'FAIL' : 'ok  '
            console.log(
                `${status} filament${major} ${theme.padEnd(14)} ${appearance.padEnd(5)} failures=${run.failures.length} errors=${run.errors.length}`,
            )
            for (const failure of run.failures)
                console.log(`       ↳ ${failure}`)
            for (const error of run.errors.slice(0, 3))
                console.log(`       ! ${error}`)
        }
        await context.close()
    }
} finally {
    // Without this the browser keeps the event loop alive and the process hangs
    // after the work is finished, which hides a passing audit behind a timeout.
    await browser.close()
}

writeFileSync(`${output}/theme-audit.json`, JSON.stringify(results, null, 2))

// A theme is colour only. Compare each node's radius across themes within the
// same Filament major; a difference means a theme changed component shape.
const shapes = new Map()
for (const run of results.runs)
    for (const stage of run.stages)
        for (const [name, node] of Object.entries(stage.nodes)) {
            if (!node.radius) continue
            const key = `filament${run.major} ${stage.stage} ${name}`
            if (!shapes.has(key)) shapes.set(key, new Set())
            shapes.get(key).add(node.radius)
        }
const unstable = [...shapes].filter(([, radii]) => radii.size > 1)
for (const [key, radii] of unstable)
    console.log(`SHAPE ${key}: ${[...radii].join(' vs ')}`)

const failed = results.runs.filter(
    (run) => run.failures.length || run.errors.length,
)
console.log(
    `\n${results.runs.length - failed.length}/${results.runs.length} theme/version runs clean at ${threshold}:1 (${browserName}); ${unstable.length} shape mismatches`,
)
process.exitCode = failed.length > 0 || unstable.length > 0 ? 1 : 0
