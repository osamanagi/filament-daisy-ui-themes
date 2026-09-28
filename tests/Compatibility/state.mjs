import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import {
    measure,
    normalizeColor,
    settleStyles,
    paintedFrames,
} from './measure.mjs'
const fixtures = process.env.COMPAT_FIXTURES || '/tmp/daisy-filament-milestone5'
const output = process.env.COMPAT_OUTPUT || 'docs/compatibility/milestone5'
const engines = await import(
    pathToFileURL(
        `${process.env.PLAYWRIGHT_DIR || '/tmp/daisy-filament-milestone1'}/node_modules/playwright/index.mjs`,
    )
)
const browserName = process.env.COMPAT_BROWSER || 'chromium'
const browser = await engines[browserName].launch()
const evidence = { browser: browser.version(), runs: [] }
mkdirSync(output, { recursive: true })
try {
    for (const major of [4, 5])
        for (const mobile of [false, true]) {
            if (
                process.env.M4_FILTER &&
                !`${major}-${mobile ? 'mobile' : 'desktop'}`.includes(
                    process.env.M4_FILTER,
                )
            )
                continue
            execFileSync(
                'php',
                [`${fixtures}/filament${major}/artisan`, 'cache:clear'],
                { stdio: 'ignore' },
            )
            const context = await browser.newContext({
                viewport: mobile
                    ? { width: 390, height: 844 }
                    : { width: 1440, height: 1000 },
                colorScheme: 'dark',
            })
            await context.addInitScript(() => {
                if (!sessionStorage.getItem('seeded')) {
                    localStorage.setItem('theme', 'system')
                    sessionStorage.setItem('seeded', '1')
                }
                window.__navigations = 0
                document.addEventListener(
                    'livewire:navigated',
                    () => window.__navigations++,
                )
                window.__frames = []
                window.__mismatches = []
                function frame() {
                    const node = document.querySelector(
                        '.fi-simple-main, .fi-ta-ctn, .fi-input-wrp',
                    )
                    if (node?.getClientRects().length)
                        window.__frames.push({
                            time: performance.now(),
                            theme: document.documentElement.dataset.theme,
                            dark: document.documentElement.classList.contains(
                                'dark',
                            ),
                            scheme: getComputedStyle(document.documentElement)
                                .colorScheme,
                            surface: getComputedStyle(node).backgroundColor,
                        })
                    const state = document.getElementById(
                        'filament-daisy-theme-state',
                    )
                    if (
                        state &&
                        node?.getClientRects().length &&
                        performance.getEntriesByType('paint').length
                    ) {
                        const config = JSON.parse(state.textContent)
                        const stored = localStorage.getItem(
                            `filament-daisy-theme:${config.panel}`,
                        )
                        const expected = Object.hasOwn(config.themes, stored)
                            ? stored
                            : config.default
                        if (
                            document.documentElement.dataset.theme !==
                                expected ||
                            document.documentElement.classList.contains(
                                'dark',
                            ) !==
                                (config.themes[expected] === 'dark')
                        )
                            window.__mismatches.push({
                                expected,
                                actual: document.documentElement.dataset.theme,
                                dark: document.documentElement.classList.contains(
                                    'dark',
                                ),
                            })
                    }
                    requestAnimationFrame(frame)
                }
                requestAnimationFrame(frame)
            })
            const page = await context.newPage()
            page.setDefaultTimeout(15000)
            const run = {
                major,
                viewport: mobile ? 'mobile' : 'desktop',
                errors: [],
                stages: [],
                firstPaint: [],
            }
            evidence.runs.push(run)
            page.on('pageerror', (e) => run.errors.push(e.message))
            page.on('response', (r) => {
                if (r.status() >= 400)
                    run.errors.push(`${r.status()} ${r.url()}`)
            })
            const origin = `http://127.0.0.1:810${major}`
            const mode = (theme) => (theme === 'dracula' ? 'dark' : 'light')
            async function capture(theme, stage) {
                await page.waitForTimeout(400)
                await settleStyles(page)
                const data = await measure(page, stage)
                run.failedMeasurement = data
                assert.deepEqual(
                    await page.evaluate(() => window.__mismatches),
                    [],
                    'Visible frame theme mismatch',
                )
                assert.ok(data.inlineThemeStyles)
                if (process.env.COMPAT_HOST_THEME)
                    assert.equal(data.topbarHeight, '4.5rem')
                assert.equal(data.themeSwitchers, 0)
                assert.equal(data.theme, theme, stage)
                assert.equal(data.dark, mode(theme) === 'dark', stage)
                assert.equal(data.scheme, mode(theme), stage)
                assert.equal(data.alpineTheme, mode(theme), stage)
                assert.equal(
                    await page.evaluate(() => localStorage.getItem('theme')),
                    'system',
                    'Native preference must remain untouched',
                )
                for (const node of ['table', 'inputWrapper', 'modal', 'login'])
                    if (data.nodes[node])
                        assert.deepEqual(
                            data.nodes[node].backgroundRgb,
                            data.expectedSurfaceRgb,
                            `${stage}/${node}`,
                        )
                for (const node of [
                    'cell',
                    'input',
                    'label',
                    'button',
                    'modalInput',
                    'navigation',
                ])
                    if (data.nodes[node])
                        assert.ok(
                            data.nodes[node].contrast >= 4.5,
                            `${stage}/${node} contrast ${data.nodes[node].contrast}`,
                        )
                const path = `${output}/${major}-${run.viewport}-${run.stages.length}-${stage}-${theme}.png`
                await page.screenshot({
                    path,
                    fullPage: true,
                    animations: 'disabled',
                })
                run.stages.push({ ...data, screenshot: path })
                delete run.failedMeasurement
            }
            async function paint(theme) {
                const frames = await page.evaluate(() => ({
                    frames: window.__frames,
                    paints: performance
                        .getEntriesByType('paint')
                        .map((p) => ({ name: p.name, time: p.startTime })),
                }))
                assert.ok(frames.frames.length && frames.paints.length)
                const surface = await normalizeColor(
                    page,
                    {
                        cupcake: 'oklch(0.97788 0.004 56.375)',
                        nord: 'oklch(0.95127 0.007 260.731)',
                        dracula: 'oklch(0.28822 0.022 277.508)',
                    }[theme],
                )
                for (const f of paintedFrames(frames.frames, frames.paints)) {
                    assert.equal(f.theme, theme)
                    assert.equal(f.dark, mode(theme) === 'dark')
                    assert.equal(f.scheme, mode(theme))
                    assert.equal(f.surface, surface)
                }
                run.firstPaint.push({ theme, ...frames })
            }
            async function spa(path) {
                const n = await page.evaluate(() => window.__navigations)
                await page.evaluate(
                    (url) => Livewire.navigate(url),
                    origin + path,
                )
                await page.waitForURL(origin + path)
                await page.waitForFunction((n) => window.__navigations > n, n)
            }
            async function login() {
                await page
                    .getByLabel('Email address')
                    .fill('tester@example.test')
                await page
                    .locator('input[type=password]')
                    .fill('fixture-password')
                await page
                    .getByRole('button', { name: 'Sign in', exact: true })
                    .click()
                await page.waitForURL(origin + '/cupcake')
            }
            try {
                await page.route('**/*.css*', async (route) => {
                    await new Promise((r) => setTimeout(r, 150))
                    await route.continue()
                })
                await page.goto(origin + '/cupcake/login')
                await capture('cupcake', 'first-visitor-login')
                await paint('cupcake')
                await page.unroute('**/*.css*')
                for (const theme of ['dracula', 'nord', 'cupcake']) {
                    await page.evaluate(
                        (theme) => window.filamentDaisyThemes.select(theme),
                        theme,
                    )
                    await capture(theme, 'selected-login')
                    await page.reload()
                    await capture(theme, 'persisted-login')
                    await paint(theme)
                }
                await login()
                for (const theme of ['cupcake', 'nord', 'dracula']) {
                    await page.evaluate(
                        (theme) => window.filamentDaisyThemes.select(theme),
                        theme,
                    )
                    await spa('/cupcake/products')
                    await capture(theme, 'spa-table')
                    await page
                        .getByRole('button', { name: 'Inspect', exact: true })
                        .first()
                        .click()
                    await page
                        .getByRole('heading', {
                            name: 'Inspect product',
                            exact: true,
                        })
                        .waitFor()
                    await capture(theme, 'modal')
                    const response = page.waitForResponse(
                        (r) =>
                            r.request().method() === 'POST' &&
                            r.url().includes('livewire'),
                    )
                    await page
                        .getByRole('button', { name: 'Cancel', exact: true })
                        .click()
                    await (await response).finished()
                    await page
                        .locator('.fi-modal-window:visible')
                        .waitFor({ state: 'hidden' })
                    await capture(theme, 'modal-closed')
                    await spa('/cupcake/products/create')
                    await page.locator('.filepond--root').waitFor()
                    await capture(theme, 'spa-form')
                    await page.goBack()
                    await page.waitForURL(origin + '/cupcake/products')
                    await capture(theme, 'back')
                    await page.goForward()
                    await page.waitForURL(origin + '/cupcake/products/create')
                    await capture(theme, 'forward')
                    await page.emulateMedia({ colorScheme: 'light' })
                    await capture(theme, 'os-light')
                    await page.emulateMedia({ colorScheme: 'dark' })
                    await capture(theme, 'os-dark')
                    await page.reload()
                    await capture(theme, 'refresh')
                    await paint(theme)
                }
                await spa('/nord/products')
                await capture('nord', 'other-panel-default')
                await page.evaluate(() =>
                    window.filamentDaisyThemes.select('cupcake'),
                )
                await capture('cupcake', 'other-panel-selected')
                await spa('/cupcake/products')
                await capture('dracula', 'original-panel-restored')
                await spa('/nord/products')
                await capture('cupcake', 'other-panel-restored')
                await page.evaluate(() =>
                    localStorage.setItem(
                        'filament-daisy-theme:restricted',
                        'dracula',
                    ),
                )
                await spa('/restricted/products')
                await capture('nord', 'removed-theme-fallback')
                await page.evaluate(() =>
                    window.filamentDaisyThemes.select('__proto__'),
                )
                await capture('nord', 'unknown-selection-fallback')
                await page.evaluate(() =>
                    localStorage.setItem(
                        'filament-daisy-theme:cupcake',
                        'not-a-theme',
                    ),
                )
                await spa('/cupcake/products')
                await capture('cupcake', 'unknown-storage-fallback')
                await page.evaluate(() =>
                    window.filamentDaisyThemes.select('dracula'),
                )
                await page.goto(origin + '/cupcake/products')
                await capture('dracula', 'full-panel-load')
                // Submit the native logout form, including its CSRF token.
                await page
                    .locator('form[action$="/logout"]')
                    .evaluate((form) => form.requestSubmit())
                await page.waitForURL(origin + '/cupcake/login')
                await capture('dracula', 'logout')
                await paint('dracula')
                await login()
                await capture('dracula', 'relogin')
                await spa('/baseline')
                assert.equal(
                    await page.locator('html').getAttribute('data-theme'),
                    null,
                )
                assert.equal(
                    await page.evaluate(() => localStorage.getItem('theme')),
                    'system',
                )
                assert.equal(
                    await page.evaluate(() => Alpine.store('theme')),
                    'dark',
                )
                await spa('/cupcake/products')
                await capture('dracula', 'reenter-themed-panel')
                await page.goto(origin + '/baseline')
                await spa('/cupcake/products')
                await capture('dracula', 'enter-from-fresh-baseline')
                await page.emulateMedia({ colorScheme: 'light' })
                await capture('dracula', 'late-controller-os-change')
                await page.goto(origin + '/compatibility-public')
                assert.equal(
                    await page.locator('html').getAttribute('data-theme'),
                    null,
                )
                assert.equal(
                    await page
                        .locator('link[href*="nagi/filament-daisy-ui-themes"]')
                        .count(),
                    0,
                )
                run.baselineAndPublicIsolation = 'passed'
                assert.deepEqual(run.errors, [])
                run.completed = true
                console.log(
                    `Filament ${major} ${run.viewport}: ${run.stages.length} states passed`,
                )
            } catch (e) {
                run.failure = e.stack
                process.exitCode = 1
                console.error(e)
                await page.screenshot({
                    path: `${output}/${major}-${run.viewport}-failure.png`,
                })
            } finally {
                writeFileSync(
                    `${output}/state.json`,
                    JSON.stringify(evidence, null, 2),
                )
                await context.close()
            }
        }
} finally {
    await browser.close()
}
