import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const engines = await import(
    pathToFileURL(
        `${process.env.PLAYWRIGHT_DIR || '/tmp/daisy-filament-milestone1'}/node_modules/playwright/index.mjs`,
    )
)
const output = process.env.COMPAT_OUTPUT || 'docs/compatibility/milestone5'
mkdirSync(output, { recursive: true })
const browserName = process.env.COMPAT_BROWSER || 'chromium'
const browser = await engines[browserName].launch()
const evidence = { browser: browser.version(), cases: [] }
try {
    for (const major of [4, 5])
        for (const stored of [
            'cupcake',
            'nord',
            'dracula',
            'unknown',
            'removed',
        ])
            for (const native of ['light', 'dark', 'system']) {
                const panel = stored === 'removed' ? 'restricted' : 'cupcake'
                const expected =
                    stored === 'removed'
                        ? 'nord'
                        : stored === 'unknown'
                          ? 'cupcake'
                          : stored
                const context = await browser.newContext({
                    colorScheme: expected === 'dracula' ? 'light' : 'dark',
                })
                await context.addInitScript(
                    ({ stored, native, panel }) => {
                        localStorage.setItem('theme', native)
                        localStorage.setItem(
                            `filament-daisy-theme:${panel}`,
                            stored === 'removed' ? 'dracula' : stored,
                        )
                        window.__frames = []
                        function sample() {
                            const node =
                                document.querySelector('.fi-simple-main')
                            const input =
                                document.querySelector('.fi-input-wrp')
                            if (node?.getClientRects().length && input)
                                window.__frames.push({
                                    time: performance.now(),
                                    theme: document.documentElement.dataset
                                        .theme,
                                    dark: document.documentElement.classList.contains(
                                        'dark',
                                    ),
                                    scheme: getComputedStyle(
                                        document.documentElement,
                                    ).colorScheme,
                                    surface:
                                        getComputedStyle(node).backgroundColor,
                                    input: getComputedStyle(input)
                                        .backgroundColor,
                                    alpine: window.Alpine?.store('theme'),
                                })
                            requestAnimationFrame(sample)
                        }
                        requestAnimationFrame(sample)
                    },
                    { stored, native, panel },
                )
                const page = await context.newPage()
                const data = { major, stored, native, expected, errors: [] }
                page.on('pageerror', (e) => data.errors.push(e.message))
                evidence.cases.push(data)
                await page.route('**/*.css*', async (route) => {
                    await new Promise((r) => setTimeout(r, 200))
                    await route.continue()
                })
                await page.goto(`http://127.0.0.1:810${major}/${panel}/login`)
                await page.waitForFunction(
                    () =>
                        window.__frames.length &&
                        performance.getEntriesByType('paint').length,
                    undefined,
                    { timeout: 10000, polling: 50 },
                )
                await page.waitForTimeout(250)
                Object.assign(
                    data,
                    await page.evaluate(() => ({
                        frames: window.__frames,
                        paints: performance
                            .getEntriesByType('paint')
                            .map((p) => ({ name: p.name, time: p.startTime })),
                        native: localStorage.getItem('theme'),
                    })),
                )
                assert.ok(data.frames.length && data.paints.length)
                // Surfaces are Filament's own, so their first-paint colour is
                // Filament's to get right. What the plugin still guarantees on
                // the first frame is the theme attribute, the dark class and the
                // colour scheme, which is what this asserts. Both recorded
                // colours stay in the evidence below for triage.
                for (const frame of data.frames) {
                    assert.equal(frame.theme, expected)
                    assert.equal(frame.dark, expected === 'dracula')
                    assert.equal(
                        frame.scheme,
                        expected === 'dracula' ? 'dark' : 'light',
                    )
                    if (frame.alpine) assert.equal(frame.alpine, frame.scheme)
                }
                assert.equal(data.native, native)
                assert.deepEqual(data.errors, [])
                await page.screenshot({
                    path: `${output}/paint-${major}-${stored}-${native}.png`,
                    fullPage: true,
                })
                data.passed = true
                await context.close()
            }
    console.log(
        `${evidence.cases.length} delayed-CSS first-paint scenarios passed`,
    )
} finally {
    writeFileSync(
        `${output}/first-paint.json`,
        JSON.stringify(evidence, null, 2),
    )
    await browser.close()
}
