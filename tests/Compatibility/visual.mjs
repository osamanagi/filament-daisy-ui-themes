import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { measure, settleStyles } from './measure.mjs'

const fixtures = resolve(
    process.env.COMPAT_FIXTURES ||
        process.argv[2] ||
        '/tmp/daisy-filament-milestone5',
)
const output = resolve(
    process.env.COMPAT_OUTPUT || 'docs/compatibility/milestone2',
)
mkdirSync(output, { recursive: true })
const engines = await import(
    pathToFileURL(
        `${process.env.PLAYWRIGHT_DIR || '/tmp/daisy-filament-milestone1'}/node_modules/playwright/index.mjs`,
    )
)
const browserName = process.env.COMPAT_BROWSER || 'chromium'
const browser = await engines[browserName].launch()
const results = { browser: browser.version(), runs: [] }
const cases = ['baseline-light', 'baseline-dark', 'cupcake', 'nord', 'dracula']

try {
    for (const major of [4, 5])
        for (const theme of cases)
            for (const viewport of ['desktop', 'mobile']) {
                const id = `${major}-${theme}-${viewport}`
                if (
                    process.env.M2_FILTER &&
                    !id.includes(process.env.M2_FILTER)
                )
                    continue
                if (
                    process.env.M2_MAJOR &&
                    major !== Number(process.env.M2_MAJOR)
                )
                    continue
                const baseline = theme.startsWith('baseline')
                const dark = theme === 'dracula' || theme === 'baseline-dark'
                const context = await browser.newContext({
                    viewport:
                        viewport === 'mobile'
                            ? { width: 390, height: 844 }
                            : { width: 1440, height: 1000 },
                    colorScheme: dark ? 'light' : 'dark',
                })
                await context.addInitScript(
                    ({ dark }) => {
                        localStorage.setItem('theme', dark ? 'dark' : 'light')
                        window.__navigations = 0
                        document.addEventListener(
                            'livewire:navigated',
                            () => window.__navigations++,
                        )
                    },
                    { dark },
                )
                // Each browser case authenticates normally. Reset only this disposable app's limiter.
                execFileSync(
                    'php',
                    [`${fixtures}/filament${major}/artisan`, 'cache:clear'],
                    { stdio: 'ignore' },
                )
                const page = await context.newPage()
                page.setDefaultTimeout(12000)
                page.setDefaultNavigationTimeout(15000)
                const run = {
                    id,
                    major,
                    theme,
                    viewport,
                    failures: [],
                    errors: [],
                    stages: [],
                }
                results.runs.push(run)
                page.on('pageerror', (e) =>
                    run.errors.push(
                        `${run.stages.at(-1)?.stage || 'initial'}: ${e.message}`,
                    ),
                )
                page.on('response', (r) => {
                    if (r.status() >= 400)
                        run.errors.push(`${r.status()} ${r.url()}`)
                })
                const base = `http://127.0.0.1:810${major}/${baseline ? 'baseline' : theme}`
                const save = () =>
                    writeFileSync(
                        `${output}/${id}.json`,
                        JSON.stringify(
                            { browser: results.browser, ...run },
                            null,
                            2,
                        ),
                    )
                async function capture(
                    stage,
                    required = [],
                    screenshot = true,
                ) {
                    if (required.includes('fileUpload'))
                        await page.locator('.filepond--root').waitFor()
                    await page.waitForTimeout(stage === 'loading' ? 50 : 350)
                    if (stage !== 'loading') await settleStyles(page)
                    const data = await measure(page, stage)
                    if (
                        process.env.COMPAT_HOST_THEME &&
                        data.topbarHeight !== '4.5rem'
                    )
                        run.failures.push(
                            `${stage}: host theme customization missing`,
                        )
                    run.stages.push(data)
                    if (screenshot)
                        await page.screenshot({
                            path: `${output}/${id}-${stage}.png`,
                            fullPage: true,
                            animations: 'disabled',
                        })
                    for (const name of required)
                        if (!data.nodes[name])
                            run.failures.push(`${stage}: missing ${name}`)
                    if (baseline) {
                        if (
                            data.theme ||
                            data.inlineThemeStyles ||
                            data.stylesheets.some((url) =>
                                url.includes('/osamanagi/filament-daisy-ui-themes/'),
                            )
                        )
                            run.failures.push(
                                `${stage}: baseline loaded theme integration`,
                            )
                    } else {
                        if (
                            data.theme !== theme ||
                            data.dark !== dark ||
                            data.scheme !== (dark ? 'dark' : 'light')
                        )
                            run.failures.push(`${stage}: theme state mismatch`)
                        if (
                            ['file-upload', 'upload-error'].includes(stage) &&
                            JSON.stringify(
                                data.nodes.uploadPanel?.backgroundRgb,
                            ) !== JSON.stringify(data.expectedUploadRgb)
                        )
                            run.failures.push(
                                `${stage}: upload state does not use the semantic theme color`,
                            )
                        if (data.themeSwitchers !== 0)
                            run.failures.push(
                                `${stage}: native theme switcher visible`,
                            )
                        // The FilePond root is Filament's own fill: white in
                        // light themes, a 5% white wash in dark ones.
                        for (const name of ['datePanel', 'notification']) {
                            if (
                                data.nodes[name] &&
                                JSON.stringify(
                                    data.nodes[name].backgroundRgb,
                                ) !== JSON.stringify(data.expectedSurfaceRgb)
                            )
                                run.failures.push(
                                    `${stage}: ${name} does not use the theme surface`,
                                )
                        }
                    }
                    if (data.viewport.documentWidth > data.viewport.width + 1)
                        run.failures.push(
                            `${stage}: document overflows by ${data.viewport.documentWidth - data.viewport.width}px`,
                        )
                    // Non-text containers and disabled controls are recorded, not treated as text.
                    for (const name of [
                        'heading',
                        'cell',
                        'input',
                        'label',
                        'button',
                        'modalInput',
                        'modalHeading',
                        'modalButton',
                        'navigation',
                        'badge',
                        'helper',
                        'error',
                        'uploadLabel',
                        'notificationTitle',
                        'notificationBody',
                        'infolist',
                        'daisyBadge',
                        'uploadName',
                        'uploadStatus',
                        'uploadSize',
                        'uploadHint',
                    ]) {
                        const node = data.nodes[name]
                        if (node && node.contrast < 4.5)
                            run.failures.push(
                                `${stage}: ${name} contrast ${node.contrast}`,
                            )
                    }
                    save()
                    return data
                }
                async function products() {
                    const navigations = await page.evaluate(
                        () => window.__navigations,
                    )
                    // Native SPA navigation via the sidebar, including its narrow-screen drawer.
                    if (
                        viewport === 'mobile' &&
                        (await page
                            .getByRole('button', {
                                name: 'Expand sidebar',
                                exact: true,
                            })
                            .isVisible())
                    ) {
                        await page
                            .getByRole('button', {
                                name: 'Expand sidebar',
                                exact: true,
                            })
                            .click()
                    }
                    await page
                        .getByRole('link', { name: 'Products', exact: true })
                        .first()
                        .click()
                    await page.waitForURL(`${base}/products`)
                    await page.waitForFunction(
                        (before) => window.__navigations > before,
                        navigations,
                    )
                }
                try {
                    await page.goto(`${base}/login`)
                    await page
                        .getByRole('button', { name: 'Sign in', exact: true })
                        .waitFor()
                    await capture('login', ['login', 'input'])
                    await page
                        .getByLabel('Email address')
                        .fill('tester@example.test')
                    await page
                        .locator('input[type=password]')
                        .fill('fixture-password')
                    await page
                        .getByRole('button', { name: 'Sign in', exact: true })
                        .click()
                    await page.waitForURL(base)
                    await page
                        .getByText('Catalog entries', { exact: true })
                        .waitFor()
                    await capture('dashboard', [
                        'stat',
                        ...(process.env.COMPAT_DEMO ? ['daisyBadge'] : []),
                    ])
                    if (viewport === 'mobile') {
                        await page
                            .getByRole('button', {
                                name: 'Expand sidebar',
                                exact: true,
                            })
                            .click()
                        await capture('sidebar', ['sidebar'])
                    }
                    await products()
                    await page.locator('.fi-ta-row').first().waitFor()
                    await capture('table', ['table', 'cell', 'disabledButton'])
                    await page
                        .getByRole('link', { name: 'View', exact: true })
                        .first()
                        .click()
                    await page.waitForURL(`${base}/products/1`)
                    await capture('infolist', ['infolist', 'badge'])
                    await products()
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
                    await capture('action-modal', ['modal', 'modalInput'])
                    await page
                        .getByRole('button', { name: 'Cancel', exact: true })
                        .click()
                    await page
                        .locator('.fi-modal-window:visible')
                        .waitFor({ state: 'hidden' })
                    await settleStyles(page)
                    await page
                        .getByRole('link', { name: 'Edit', exact: true })
                        .first()
                        .click()
                    await page.waitForURL(`${base}/products/1/edit`)
                    await capture('edit', [
                        'input',
                        'disabledInput',
                        'checkbox',
                        'radio',
                        'toggle',
                        'fileUpload',
                    ])
                    await page
                        .getByRole('textbox', { name: /Available on/ })
                        .click()
                    await capture('date-picker', ['datePanel'])
                    await page.keyboard.press('Escape')
                    await page.getByRole('heading', { name: /Edit/ }).click()
                    await products()
                    await page
                        .getByRole('link', { name: 'New product', exact: true })
                        .click()
                    await page.waitForURL(`${base}/products/create`)
                    await capture('create', [
                        'input',
                        'disabledInput',
                        'fileUpload',
                    ])
                    if (!baseline) {
                        // Trigger actual server-side validation rather than browser constraint bubbles.
                        await page
                            .locator('form')
                            .evaluateAll((forms) =>
                                forms.forEach(
                                    (form) => (form.noValidate = true),
                                ),
                            )
                        await page
                            .getByRole('button', {
                                name: 'Create',
                                exact: true,
                            })
                            .click()
                        await page
                            .locator('.fi-fo-field-wrp-error-message')
                            .first()
                            .waitFor()
                        await capture('validation', ['error'])
                        await page
                            .getByRole('textbox', { name: /Name/ })
                            .fill('Visual draft')
                        await page
                            .getByRole('textbox', { name: /Name/ })
                            .press('Tab')
                        await capture('keyboard-focus', ['input'])
                        await page
                            .getByRole('checkbox', {
                                name: 'Approved for publication',
                            })
                            .check()
                        await page
                            .getByRole('radio', {
                                name: 'Physical',
                                exact: true,
                            })
                            .check()
                        await page
                            .getByRole('switch', {
                                name: 'Featured',
                                exact: true,
                            })
                            .click()
                        await page.locator('.fi-select-input-btn').click()
                        await page
                            .getByRole('option', {
                                name: 'Active',
                                exact: true,
                            })
                            .click()
                        await capture('selected-controls', [
                            'checkbox',
                            'radio',
                            'toggle',
                        ])
                        await page.locator('input[type=file]').setInputFiles({
                            name: 'visual-fixture.txt',
                            mimeType: 'text/plain',
                            buffer: Buffer.from(
                                'Disposable visual test attachment.\n',
                            ),
                        })
                        await page
                            .locator('.filepond--file-info-main')
                            .filter({ hasText: 'visual-fixture.txt' })
                            .waitFor()
                        await page
                            .locator(
                                '.filepond--item[data-filepond-item-state="processing-complete"]',
                            )
                            .waitFor()
                        await capture('file-upload', [
                            'fileUpload',
                            'uploadName',
                            'uploadStatus',
                        ])
                        // Isolate rejected uploads from the preceding file's asynchronous removal.
                        await page.reload()
                        await page.locator('.filepond--root').waitFor()
                        await page.locator('input[type=file]').setInputFiles({
                            name: 'invalid.pdf',
                            mimeType: 'application/pdf',
                            buffer: Buffer.from('Invalid type fixture.'),
                        })
                        await page
                            .locator(
                                '.filepond--item[data-filepond-item-state*="invalid"], .filepond--item[data-filepond-item-state*="error"]',
                            )
                            .waitFor()
                        await capture('upload-error', [
                            'fileUpload',
                            'uploadName',
                            'uploadStatus',
                        ])
                        await products()
                        const search = page.getByPlaceholder('Search', {
                            exact: true,
                        })
                        await search.fill('Sample product 03')
                        await page.waitForFunction(
                            () =>
                                document.querySelectorAll('.fi-ta-row')
                                    .length === 1,
                        )
                        await capture('search', ['cell'])
                        await search.fill('no-matching-product')
                        await page
                            .getByText('No products', { exact: true })
                            .waitFor()
                        await capture('empty')
                        await search.fill('')
                        await page.waitForFunction(
                            () =>
                                document.querySelectorAll('.fi-ta-row')
                                    .length === 10,
                        )
                        await page
                            .getByRole('button', {
                                name: 'Filter',
                                exact: true,
                            })
                            .click()
                        await capture('filters-open')
                        await page
                            .getByLabel('Status', { exact: true })
                            .selectOption('draft')
                        await page
                            .getByRole('button', {
                                name: 'Apply filters',
                                exact: true,
                            })
                            .click()
                        await page.waitForFunction(
                            () =>
                                document.querySelectorAll('.fi-ta-row')
                                    .length === 5,
                        )
                        await capture('filtered', ['cell'])
                        await page
                            .getByRole('heading', {
                                name: 'Products',
                                exact: true,
                            })
                            .click()
                        await page
                            .getByRole('button', {
                                name: 'Remove all filters',
                                exact: true,
                            })
                            .click()
                        await page.waitForFunction(
                            () =>
                                document.querySelectorAll('.fi-ta-row')
                                    .length === 10,
                        )
                        await page
                            .locator('.fi-ta-row')
                            .first()
                            .getByRole('checkbox')
                            .check()
                        await capture('selection', ['checkbox'])
                        await page
                            .getByRole('button', {
                                name: 'Review selected',
                                exact: true,
                            })
                            .click()
                        await page
                            .getByText('1 products selected', { exact: true })
                            .waitFor()
                        await capture('bulk-notification', ['notification'])
                        await page
                            .locator('.fi-no-notification-close-btn')
                            .click()
                        await page
                            .getByRole('button', { name: 'Next', exact: true })
                            .click()
                        await page
                            .getByText('Sample product 11', { exact: true })
                            .waitFor()
                        await capture('pagination', ['cell'])
                        await page
                            .getByRole('button', {
                                name: 'Archive preview',
                                exact: true,
                            })
                            .first()
                            .click()
                        await page
                            .getByRole('heading', {
                                name: 'Archive preview',
                                exact: true,
                            })
                            .waitFor()
                        await capture('confirmation', ['modal', 'modalHeading'])
                        await page
                            .getByRole('button', {
                                name: 'Cancel',
                                exact: true,
                            })
                            .click()
                        if (viewport === 'desktop') {
                            await page
                                .getByRole('button', {
                                    name: 'Inspect',
                                    exact: true,
                                })
                                .first()
                                .hover()
                            await page
                                .getByText(
                                    'Inspect product without leaving the table',
                                    { exact: true },
                                )
                                .waitFor()
                            await capture('tooltip', ['tooltip'])
                            await page.mouse.move(0, 0)
                        }
                        // Hold the real Livewire request so its native loading state is observable.
                        await page.route('**/*', async (route) => {
                            if (
                                route.request().method() === 'POST' &&
                                route.request().url().includes('livewire')
                            )
                                await new Promise((resolve) =>
                                    setTimeout(resolve, 1500),
                                )
                            await route.continue()
                        })
                        await page
                            .getByRole('button', {
                                name: 'Show notifications',
                                exact: true,
                            })
                            .click()
                        await page
                            .locator(
                                '.fi-header-actions-ctn .fi-loading-indicator:visible',
                            )
                            .waitFor()
                        await capture('loading')
                        await page
                            .getByText('Danger notification', { exact: true })
                            .waitFor()
                        await page.unrouteAll({ behavior: 'wait' })
                        await capture('notifications', [
                            'notification',
                            'notificationTitle',
                            'notificationBody',
                        ])
                        await page
                            .locator('.fi-no-notification-close-btn')
                            .evaluateAll((buttons) =>
                                buttons.forEach((button) => button.click()),
                            )
                        await page
                            .getByRole('button', {
                                name: 'Overlay probe',
                                exact: true,
                            })
                            .click()
                        await capture('dropdown', ['dropdown'])
                        await page.keyboard.press('Escape')
                        await page
                            .getByRole('button', {
                                name: 'Portal modal',
                                exact: true,
                            })
                            .click()
                        await page
                            .getByRole('heading', {
                                name: 'Teleported modal',
                                exact: true,
                            })
                            .waitFor()
                        await capture('portal-modal', ['modal', 'modalInput'])
                        await page.keyboard.press('Escape')
                        await page
                            .locator('.fi-modal-window:visible')
                            .waitFor({ state: 'hidden' })
                        await page
                            .getByRole('link', {
                                name: 'New product',
                                exact: true,
                            })
                            .hover()
                        await capture('hover', ['button'])
                        await page.reload()
                        await capture('refresh', ['table'])
                    }
                    run.completed = true
                } catch (error) {
                    run.failures.push(`Interaction failed: ${error.message}`)
                    await page
                        .screenshot({
                            path: `${output}/${id}-interaction-failure.png`,
                            fullPage: true,
                        })
                        .catch(() => {})
                } finally {
                    save()
                    console.log(
                        `${id}: ${run.stages.length} states, ${run.failures.length} findings, ${run.errors.length} browser errors`,
                    )
                    await context.close()
                }
            }
} finally {
    writeFileSync(
        `${output}/summary${process.env.M2_MAJOR ? `-${process.env.M2_MAJOR}` : ''}.json`,
        JSON.stringify(
            results.runs.map(({ stages, ...run }) => ({
                ...run,
                stages: stages.map((s) => s.stage),
            })),
            null,
            2,
        ),
    )
    await browser.close()
}
if (
    results.runs.some(
        (run) => !run.completed || run.failures.length || run.errors.length,
    )
)
    process.exitCode = 1
