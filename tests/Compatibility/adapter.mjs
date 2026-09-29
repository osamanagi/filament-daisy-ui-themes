import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { measure } from './measure.mjs'

const fixtures = resolve(process.argv[2] || '/tmp/daisy-filament-milestone1')
const output = resolve('docs/compatibility/milestone3')
const manifest = JSON.parse(readFileSync('resources/dist/theme-data.json'))
const { chromium } = await import(
    pathToFileURL(`${fixtures}/node_modules/playwright/index.mjs`)
)
const browser = await chromium.launch()
const evidence = { browser: browser.version(), runs: [] }
mkdirSync(output, { recursive: true })
try {
    for (const major of [4, 5])
        for (const mobile of [false, true]) {
            if (
                process.env.M3_FILTER &&
                !`${major}-${mobile ? 'mobile' : 'desktop'}`.includes(
                    process.env.M3_FILTER,
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
            })
            const page = await context.newPage()
            page.setDefaultTimeout(15000)
            await context.addInitScript(() => {
                window.__navigations = 0
                document.addEventListener(
                    'livewire:navigated',
                    () => window.__navigations++,
                )
            })
            const run = {
                major,
                viewport: mobile ? 'mobile' : 'desktop',
                errors: [],
                stages: [],
            }
            evidence.runs.push(run)
            page.on('pageerror', (error) => run.errors.push(error.message))
            page.on('response', (response) => {
                if (response.status() >= 400)
                    run.errors.push(`${response.status()} ${response.url()}`)
            })
            const origin = `http://127.0.0.1:810${major}`
            async function navigate(path) {
                // Different fixture panels have different Filament head initialization.
                // Cross-panel SPA state belongs to milestone 4; load each panel normally.
                if (
                    new URL(page.url()).pathname.split('/')[1] !==
                    path.split('/')[1]
                ) {
                    await page.goto(`${origin}${path}`)
                    return
                }
                const before = await page.evaluate(() => window.__navigations)
                await page.evaluate(
                    (url) => Livewire.navigate(url),
                    `${origin}${path}`,
                )
                await page.waitForURL(`${origin}${path}`)
                await page.waitForFunction(
                    (before) => window.__navigations > before,
                    before,
                )
            }
            async function closeModal() {
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
            }
            async function settleColors() {
                await page.evaluate(async () => {
                    // Inherited color transitions can start child transitions on later frames.
                    for (let attempt = 0; attempt < 20; attempt++) {
                        await new Promise((resolve) =>
                            requestAnimationFrame(() =>
                                requestAnimationFrame(resolve),
                            ),
                        )
                        const animations = document
                            .getAnimations()
                            .filter(
                                (animation) =>
                                    animation.playState === 'running' &&
                                    Number.isFinite(
                                        animation.effect.getComputedTiming()
                                            .endTime,
                                    ),
                            )
                        if (!animations.length) return
                        await Promise.all(
                            animations.map((animation) =>
                                animation.finished.catch(() => {}),
                            ),
                        )
                    }
                    throw new Error('Native color transitions did not settle')
                })
            }
            async function capture(theme, stage, index) {
                await page.waitForTimeout(350)
                await settleColors()
                const data = await measure(page, stage)
                data.contract = await page.evaluate((palettes) => {
                    const probe = document.createElement('span')
                    document.body.append(probe)
                    const normalize = (property, value) => {
                        probe.style[property] = value
                        return getComputedStyle(probe)[property]
                    }
                    const mismatches = []
                    for (const [color, shades] of Object.entries(palettes))
                        for (const [shade, value] of Object.entries(shades)) {
                            const actual = normalize(
                                'color',
                                `var(--${color}-${shade})`,
                            )
                            const expected = normalize('color', value)
                            if (actual !== expected)
                                mismatches.push(
                                    `${color}-${shade}: ${actual} != ${expected}`,
                                )
                        }
                    probe.remove()
                    return { mismatches }
                }, manifest.themes[theme].palettes)
                assert.equal(data.theme, theme)
                assert.equal(
                    data.dark,
                    manifest.themes[theme].appearance === 'dark',
                )
                assert.equal(data.scheme, manifest.themes[theme].appearance)
                assert.equal(data.themeSwitchers, 0)
                assert.deepEqual(
                    data.contract.mismatches,
                    [],
                    'CSS variables and server palettes must agree',
                )
                for (const node of ['table', 'modal', 'inputWrapper']) {
                    if (data.nodes[node])
                        assert.deepEqual(
                            data.nodes[node].backgroundRgb,
                            data.expectedSurfaceRgb,
                        )
                }
                for (const node of [
                    'cell',
                    'input',
                    'label',
                    'button',
                    'modalInput',
                    'modalButton',
                    'navigation',
                    'badge',
                ]) {
                    if (data.nodes[node])
                        assert.ok(
                            data.nodes[node].contrast >= 4.5,
                            `${theme}/${stage}/${node} contrast`,
                        )
                }
                const optionalCss = page.locator(
                    'link[href*="compatibility-badge-demo"]',
                )
                assert.ok(
                    await optionalCss.count(),
                    'Optional badge CSS must be present for collision comparison',
                )
                await optionalCss.evaluateAll((links) =>
                    links.forEach((link) => {
                        link.disabled = true
                    }),
                )
                await settleColors()
                const coreOnly = await measure(page, stage)
                const native = [
                    'table',
                    'cell',
                    'input',
                    'inputWrapper',
                    'label',
                    'button',
                    'modal',
                    'modalInput',
                    'modalButton',
                    'navigation',
                    'badge',
                    'topbar',
                ]
                for (const key of native) {
                    if (data.nodes[key])
                        assert.deepEqual(
                            coreOnly.nodes[key],
                            data.nodes[key],
                            `Optional badge CSS changed native ${key}`,
                        )
                }
                data.optionalBadgeCollision = 'none in sampled native nodes'
                await optionalCss.evaluateAll((links) =>
                    links.forEach((link) => {
                        link.disabled = false
                    }),
                )
                await page.screenshot({
                    path: `${output}/switch-${major}-${run.viewport}-${index}-${theme}-${stage}.png`,
                    fullPage: true,
                    animations: 'disabled',
                })
                run.stages.push(data)
                writeFileSync(
                    `${output}/switching.json`,
                    JSON.stringify(evidence, null, 2),
                )
            }
            try {
                await page.goto(`${origin}/cupcake/login`)
                await page
                    .getByLabel('Email address')
                    .fill('tester@example.test')
                await page
                    .locator('input[type=password]')
                    .fill('fixture-password')
                await page
                    .getByRole('button', { name: 'Sign in', exact: true })
                    .click()
                await page.waitForURL(`${origin}/cupcake`)
                for (const [index, theme] of [
                    'cupcake',
                    'nord',
                    'dracula',
                    'cupcake',
                ].entries()) {
                    await navigate(`/${theme}/products`)
                    await page.locator('.fi-ta-row').first().waitFor()
                    await capture(theme, 'table', index)
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
                    await capture(theme, 'modal', index)
                    await closeModal()
                    await navigate(`/${theme}/products/create`)
                    await page.locator('.filepond--root').waitFor()
                    await capture(theme, 'form', index)
                    await navigate(`/${theme}`)
                    await page
                        .getByText('Catalog entries', { exact: true })
                        .waitFor()
                    await capture(theme, 'dashboard', index)
                }
                // Change the adapter's input on an existing DOM: no reload, no demo-only markup.
                // This is a browser probe, not the future user-facing state/switcher implementation.
                await navigate('/cupcake/products')
                for (const stage of ['table', 'modal', 'form']) {
                    if (stage === 'modal') {
                        await page
                            .getByRole('button', {
                                name: 'Inspect',
                                exact: true,
                            })
                            .first()
                            .click()
                        await page
                            .getByRole('heading', {
                                name: 'Inspect product',
                                exact: true,
                            })
                            .waitFor()
                    }
                    if (stage === 'form') {
                        await closeModal()
                        await navigate('/cupcake/products/create')
                        await page.locator('.filepond--root').waitFor()
                    }
                    for (const theme of ['cupcake', 'nord', 'dracula']) {
                        await page.evaluate(
                            ({ theme, mode }) => {
                                document.documentElement.dataset.theme = theme
                                document.documentElement.classList.toggle(
                                    'dark',
                                    mode === 'dark',
                                )
                                window.dispatchEvent(
                                    new CustomEvent('theme-changed', {
                                        detail: mode,
                                    }),
                                )
                            },
                            { theme, mode: manifest.themes[theme].appearance },
                        )
                        await capture(theme, stage, 'direct')
                    }
                }
                assert.equal(run.errors.length, 0, run.errors.join('\n'))
                run.completed = true
                console.log(
                    `Filament ${major} ${run.viewport}: ${run.stages.length} theme-change states passed`,
                )
            } catch (error) {
                run.failure = error.message
                await page
                    .screenshot({
                        path: `${output}/switch-${major}-${run.viewport}-failure.png`,
                        fullPage: true,
                    })
                    .catch(() => {})
                process.exitCode = 1
                console.error(
                    `Filament ${major} ${run.viewport}: ${error.message}`,
                )
            } finally {
                writeFileSync(
                    `${output}/switching.json`,
                    JSON.stringify(evidence, null, 2),
                )
                await context.close()
            }
        }
} finally {
    await browser.close()
}
