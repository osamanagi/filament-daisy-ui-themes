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

const tableSelectors = {
    heading: '.fi-header-heading',
    cell: '.fi-ta-text-item-label',
    badge: '.fi-badge',
    button: '.fi-btn',
    navigation: '.fi-sidebar-item-label',
}
const formSelectors = {
    label: '.fi-fo-field-wrp label',
    input: '.fi-input',
    helper: '.fi-fo-field-wrp-helper-text',
    button: '.fi-btn',
}

const measure = (page, selectors) =>
    page.evaluate((selectors) => {
        const rgb = (value) => {
            const parts = value.match(/[\d.]+/g)
            return parts ? parts.map(Number) : [0, 0, 0, 0]
        }
        const surface = (el) => {
            const layers = []
            for (let node = el; node; node = node.parentElement)
                layers.unshift(rgb(getComputedStyle(node).backgroundColor))
            return layers.reduce(
                (bg, fg) =>
                    fg
                        .slice(0, 3)
                        .map(
                            (c, i) =>
                                (c * fg[3]) / 255 + bg[i] * (1 - fg[3] / 255),
                        ),
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
            const el = [...document.querySelectorAll(selector)].find(
                (candidate) =>
                    candidate.getClientRects().length &&
                    getComputedStyle(candidate).visibility !== 'hidden' &&
                    candidate.textContent.trim().length,
            )
            if (!el) continue
            const css = getComputedStyle(el)
            const background = surface(el)
            const foreground = rgb(css.color)
            foreground[3] *= Number(css.opacity)
            const fg = luminance(
                foreground
                    .slice(0, 3)
                    .map(
                        (c, i) =>
                            (c * foreground[3]) / 255 +
                            background[i] * (1 - foreground[3] / 255),
                    ),
            )
            const bg = luminance(background)
            nodes[name] = {
                text: el.textContent.trim().slice(0, 48),
                color: css.color,
                background: css.backgroundColor,
                contrast: +(
                    (Math.max(fg, bg) + 0.05) /
                    (Math.min(fg, bg) + 0.05)
                ).toFixed(2),
            }
        }
        return {
            theme: document.documentElement.dataset.theme,
            dark: document.documentElement.classList.contains('dark'),
            scheme: document.documentElement.style.colorScheme,
            nodes,
        }
    }, selectors)

const results = { browser: browser.version(), threshold, runs: [] }

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
        const run = { major, theme, appearance, failures: [], errors: [], stages: [] }
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
                    localStorage.setItem('filament-daisy-theme:allthemes', value),
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
                    run.failures.push(`${stage}: color-scheme ${data.scheme}`)
                for (const [name, node] of Object.entries(data.nodes))
                    if (node.contrast < threshold)
                        run.failures.push(
                            `${stage}: ${name} contrast ${node.contrast}`,
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
        for (const failure of run.failures) console.log(`       ↳ ${failure}`)
        for (const error of run.errors.slice(0, 3))
            console.log(`       ! ${error}`)
    }
    await context.close()
}

writeFileSync(`${output}/theme-audit.json`, JSON.stringify(results, null, 2))
const failed = results.runs.filter(
    (run) => run.failures.length || run.errors.length,
)
console.log(
    `\n${results.runs.length - failed.length}/${results.runs.length} theme/version runs clean at ${threshold}:1 (${browserName})`,
)
process.exitCode = failed.length > 0 ? 1 : 0
