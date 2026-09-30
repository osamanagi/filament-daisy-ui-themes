import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
const engines = await import(
    pathToFileURL(
        `${process.env.PLAYWRIGHT_DIR || '/tmp/daisy-filament-milestone1'}/node_modules/playwright/index.mjs`,
    )
)
const fixtures = process.env.COMPAT_FIXTURES || '/tmp/daisy-filament-milestone5'
import { measure, normalizeColor, settleStyles } from './measure.mjs'
const output = process.env.COMPAT_OUTPUT || 'docs/compatibility/milestone5'
mkdirSync(output, { recursive: true })
const browserName = process.env.COMPAT_BROWSER || 'chromium'
const browser = await engines[browserName].launch()
const evidence = { browser: browser.version(), runs: [] }
try {
    for (const major of [4, 5])
        for (const mobile of [false, true]) {
            if (
                process.env.M5_FILTER &&
                !`${major}-${mobile ? 'mobile' : 'desktop'}`.includes(
                    process.env.M5_FILTER,
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
            const run = { major, mobile, errors: [], captures: [] }
            evidence.runs.push(run)
            page.on('pageerror', (e) => run.errors.push(e.stack || e.message))
            page.on('response', (r) => {
                if (r.status() >= 400)
                    run.errors.push(`${r.status()} ${r.url()}`)
            })
            const origin = `http://127.0.0.1:810${major}`
            const trigger = page.getByRole('button', {
                name: 'Choose theme',
                exact: true,
            })
            async function capture(theme, stage) {
                await page.waitForTimeout(400)
                await settleStyles(page)
                const data = await measure(page, stage)
                assert.equal(data.theme, theme)
                assert.equal(data.dark, theme === 'dracula')
                assert.equal(
                    data.alpineTheme,
                    theme === 'dracula' ? 'dark' : 'light',
                )
                // The plugin paints no surfaces, so Filament's own input
                // wrapper fill is not a theme surface to assert here.
                for (const node of ['table', 'modal', 'dropdown'])
                    if (data.nodes[node])
                        assert.deepEqual(
                            data.nodes[node].backgroundRgb,
                            data.expectedSurfaceRgb,
                        )
                for (const node of [
                    'cell',
                    'input',
                    'button',
                    'navigation',
                    'themeChoice',
                ])
                    if (data.nodes[node])
                        assert.ok(
                            data.nodes[node].contrast >= 4.5,
                            `${node} contrast`,
                        )
                assert.ok(
                    await page.evaluate(
                        () =>
                            document.documentElement.scrollWidth <= innerWidth,
                    ),
                    'Document overflows viewport',
                )
                const screenshot = `${output}/switcher-${major}-${mobile ? 'mobile' : 'desktop'}-${run.captures.length}-${stage}-${theme}.png`
                await page.screenshot({
                    path: screenshot,
                    fullPage: true,
                    animations: 'disabled',
                })
                run.captures.push({ ...data, screenshot })
            }
            async function choose(theme) {
                await trigger.click()
                const choice = page.getByRole('button', {
                    name: theme[0].toUpperCase() + theme.slice(1),
                    exact: true,
                })
                await choice.waitFor({ state: 'visible' })
                await choice.click()
                await choice.waitFor({ state: 'hidden' })
                await page.waitForFunction(
                    (theme) => document.documentElement.dataset.theme === theme,
                    theme,
                )
                await page.waitForFunction(
                    () =>
                        document.activeElement?.getAttribute('aria-label') ===
                        'Choose theme',
                )
            }
            try {
                await page.goto(origin + '/cupcake/login')
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
                await trigger.focus()
                await page.keyboard.press('Enter')
                const first = page.getByRole('button', {
                    name: 'Cupcake',
                    exact: true,
                })
                await first.waitFor({ state: 'visible' })
                assert.equal(await first.getAttribute('aria-pressed'), 'true')
                await page.waitForFunction(() =>
                    document.activeElement?.textContent
                        .trim()
                        .startsWith('Cupcake'),
                )
                await page.keyboard.press('Tab')
                await page.keyboard.press('Enter')
                await capture('nord', 'keyboard-selected')
                await trigger.focus()
                await page.keyboard.press('Space')
                await first.waitFor({ state: 'visible' })
                await page.keyboard.press('Escape')
                await first.waitFor({ state: 'hidden' })
                await page.waitForFunction(
                    () =>
                        document.activeElement?.getAttribute('aria-label') ===
                        'Choose theme',
                )
                await page.waitForFunction(
                    () =>
                        document
                            .querySelector('[data-daisy-theme-switcher] button')
                            ?.getAttribute('aria-expanded') === 'false',
                )
                assert.equal(
                    await trigger.getAttribute('aria-expanded'),
                    'false',
                )
                for (const theme of ['dracula', 'cupcake', 'nord']) {
                    await choose(theme)
                    await capture(theme, 'dashboard')
                    await trigger.click()
                    const selected = page.getByRole('button', {
                        name: theme[0].toUpperCase() + theme.slice(1),
                        exact: true,
                    })
                    assert.equal(
                        await selected.getAttribute('aria-pressed'),
                        'true',
                    )
                    // Every option previews its own colours (daisyUI's picker),
                    // so the selected one must show the surface in use.
                    const preview = await selected.evaluate((node) => {
                        const swatch = node.querySelector(
                            '[data-daisy-theme-swatch]',
                        )
                        return swatch
                            ? {
                                  theme: swatch.dataset.daisyThemeSwatch,
                                  dots: swatch.children.length,
                                  background:
                                      getComputedStyle(swatch).backgroundColor,
                              }
                            : null
                    })
                    assert.deepEqual(
                        preview,
                        {
                            theme,
                            dots: 4,
                            background: await normalizeColor(
                                page,
                                'var(--color-base-100)',
                            ),
                        },
                        `${theme}: option preview`,
                    )
                    const box = await selected
                        .locator(
                            'xpath=ancestor::*[contains(@class,"fi-dropdown-panel")]',
                        )
                        .boundingBox()
                    assert.ok(
                        box.x >= 0 &&
                            box.x + box.width <= page.viewportSize().width,
                        'Dropdown outside viewport',
                    )
                    await capture(theme, 'open-menu')
                    await page.keyboard.press('Escape')
                    await first.waitFor({ state: 'hidden' })
                    await page
                        .getByRole('link', { name: 'Products', exact: true })
                        .first()
                        .evaluate((el) => el.click())
                    await page.waitForURL(origin + '/cupcake/products')
                    await capture(theme, 'table')
                    await choose(theme === 'dracula' ? 'cupcake' : 'dracula')
                    await capture(
                        theme === 'dracula' ? 'cupcake' : 'dracula',
                        'changed-table',
                    )
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
                    await capture(
                        theme === 'dracula' ? 'cupcake' : 'dracula',
                        'modal',
                    )
                    await page.reload()
                    await capture(
                        theme === 'dracula' ? 'cupcake' : 'dracula',
                        'refresh',
                    )
                }
                await page.goto(origin + '/restricted/products')
                await trigger.click()
                assert.equal(
                    await page
                        .getByRole('button', { name: 'Cupcake', exact: true })
                        .count(),
                    0,
                )
                assert.equal(
                    await page
                        .getByRole('button', { name: 'Dracula', exact: true })
                        .count(),
                    0,
                )
                await page
                    .getByRole('button', { name: 'Nord', exact: true })
                    .waitFor({ state: 'visible' })
                await capture('nord', 'restricted')
                assert.deepEqual(run.errors, [])
                run.passed = true
                console.log(
                    `Filament ${major} ${mobile ? 'mobile' : 'desktop'} switcher passed`,
                )
            } catch (e) {
                run.failure = e.stack
                process.exitCode = 1
                console.error(e)
                await page.screenshot({
                    path: `${output}/switcher-${major}-${mobile ? 'mobile' : 'desktop'}-failure.png`,
                })
            } finally {
                writeFileSync(
                    `${output}/switcher.json`,
                    JSON.stringify(evidence, null, 2),
                )
                await context.close()
            }
        }
} finally {
    await browser.close()
}
