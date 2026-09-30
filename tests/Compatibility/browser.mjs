import { measure } from './measure.mjs'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const fixtures = resolve(process.argv[2] || '/tmp/daisy-filament-milestone1')
const probe = process.argv[3] || 'adapter'
const output = resolve('docs/compatibility', probe)
mkdirSync(output, { recursive: true })
const { chromium } = await import(pathToFileURL(`${fixtures}/node_modules/playwright/index.mjs`))
const browser = await chromium.launch({ headless: true })
const results = { browser: browser.version(), probe, runs: [] }


try {
    for (const major of [4, 5]) {
        for (const theme of ['cupcake', 'dracula']) {
            const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: theme === 'dracula' ? 'light' : 'dark' })
            await context.addInitScript(({ theme }) => {
                if (!sessionStorage.getItem('compat-seeded')) {
                    localStorage.setItem('theme', theme === 'dracula' ? 'light' : 'dark')
                    sessionStorage.setItem('compat-seeded', 'true')
                }
                window.__navigations = 0
                window.__themeFrames = []
                document.addEventListener('livewire:navigated', () => window.__navigations++)
                function sample() {
                    if (document.body && document.querySelector('.fi-simple-main, .fi-topbar')) {
                        const state = {
                            theme: document.documentElement.dataset.theme,
                            dark: document.documentElement.classList.contains('dark'),
                            scheme: getComputedStyle(document.documentElement).colorScheme,
                            body: getComputedStyle(document.body).backgroundColor,
                        }
                        const previous = window.__themeFrames.at(-1)
                        if (!previous || previous.state !== JSON.stringify(state)) window.__themeFrames.push({ time: performance.now(), state: JSON.stringify(state) })
                    }
                    requestAnimationFrame(sample)
                }
                requestAnimationFrame(sample)
            }, { theme })
            const page = await context.newPage()
            page.setDefaultTimeout(15000)
            page.setDefaultNavigationTimeout(15000)
            const run = { major, theme, errors: [], stages: [] }
            results.runs.push(run)
            page.on('pageerror', error => run.errors.push(error.message))
            page.on('response', response => { if (response.status() >= 400) run.errors.push(`${response.status()} ${response.url()}`) })
            const port = (probe === 'tokens' ? 8200 : probe === 'host' ? 8300 : 8100) + major
            const base = `http://127.0.0.1:${port}/${theme}`
            async function capture(stage, screenshot = true) {
                await page.locator('body').waitFor()
                await page.waitForTimeout(400)
                const result = await measure(page, stage)
                run.stages.push(result)
                if (screenshot) await page.screenshot({ path: `${output}/filament${major}-${theme}-${stage}.png`, fullPage: true, animations: 'disabled' })
                writeFileSync(`${output}/evidence.json`, JSON.stringify(results, null, 2))
                if (probe !== 'tokens') {
                    assert.equal(result.theme, theme, stage)
                    assert.equal(result.dark, theme === 'dracula', stage)
                    assert.equal(result.scheme, theme === 'dracula' ? 'dark' : 'light', stage)
                    assert.equal(result.themeSwitchers, 0, stage)
                    if (probe === 'host') assert.equal(result.topbarHeight, '4.5rem', 'Host custom theme must actually load')
                    // Input wrappers are Filament's own fill, not a theme
                    // surface: dark themes render them as a 5% white wash.
                    for (const key of ['topbar', 'table', 'modal', 'login', 'dropdown']) {
                        if (result.nodes[key]) assert.deepEqual(result.nodes[key].backgroundRgb, result.expectedSurfaceRgb, `${major}/${theme}/${stage}/${key}: must use daisyUI surface`)
                    }
                    for (const key of ['cell', 'heading', 'input', 'label', 'modalHeading', 'modalInput', 'modalButton', 'button', 'navigation', 'badge']) {
                        if (result.nodes[key]) assert.ok(result.nodes[key].contrast >= 4.5, `${major}/${theme}/${stage}/${key}: contrast ${result.nodes[key].contrast}`)
                    }
                }
                return result
            }
            await page.goto(`${base}/login`)
            await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor()
            await capture('login')
            await page.getByLabel('Email address').fill('tester@example.test')
            await page.locator('input[type="password"]').fill('fixture-password')
            await page.getByRole('button', { name: 'Sign in', exact: true }).click()
            await page.waitForURL(url => !url.pathname.endsWith('/login'))
            await page.getByRole('link', { name: 'Products', exact: true }).click()
            await page.waitForURL(`${base}/products`)
            const table = await capture('table')
            assert.ok(table.nodes.table && table.nodes.cell && table.nodes.topbar && table.nodes.sidebar)
            await page.getByRole('button', { name: 'Overlay probe', exact: true }).click()
            await page.getByText('Teleported native menu').waitFor()
            const overlay = await capture('overlay')
            assert.ok(overlay.nodes.dropdown)
            assert.equal(overlay.nodes.dropdown.position, 'fixed')
            await page.keyboard.press('Escape')
            await page.getByRole('button', { name: 'Portal modal', exact: true }).click()
            await page.getByRole('heading', { name: 'Teleported modal', exact: true }).waitFor()
            const portal = await capture('portal-modal')
            assert.ok(portal.nodes.modal)
            assert.ok(!portal.nodes.modal.ancestors.some(value => value.startsWith('nav.fi-topbar') || value.startsWith('div.fi-layout')), 'Modal must teleport to body')
            await page.locator('.fi-modal-close-btn:visible').click()
            await page.getByRole('button', { name: 'Inspect', exact: true }).first().click()
            await page.getByRole('heading', { name: 'Inspect product' }).waitFor()
            const modal = await capture('modal')
            assert.ok(modal.nodes.modal && modal.nodes.input)
            await page.getByRole('button', { name: 'Cancel', exact: true }).click()
            await page.getByRole('link', { name: 'New product', exact: true }).click()
            await page.waitForURL(`${base}/products/create`)
            const form = await capture('form')
            assert.ok(form.nodes.input && form.navigations > table.navigations, 'Must use real Livewire navigation')
            await page.locator('.fi-select-input-btn').click()
            await capture('select')
            await page.keyboard.press('Escape')
            await page.getByRole('button', { name: 'Create', exact: true }).hover()
            await capture('button-hover', false)
            await page.getByRole('textbox', { name: /Name/ }).fill('Unsaved compatibility product')
            await page.getByRole('textbox', { name: /Name/ }).focus()
            await capture('focus', false)
            await page.emulateMedia({ colorScheme: theme === 'dracula' ? 'dark' : 'light' })
            await capture('os-change', false)
            await page.reload()
            await capture('refresh', false)
            await page.getByRole('link', { name: 'Products', exact: true }).first().click()
            await page.waitForURL(`${base}/products`)
            await capture('navigated-table', false)
            await page.goBack()
            await page.waitForURL(`${base}/products/create`)
            await capture('back', false)
            if (probe !== 'tokens') {
                for (const stage of run.stages) for (const frame of stage.frames) {
                    const state = JSON.parse(frame.state)
                    assert.equal(state.theme, theme, `Frame theme at ${stage.stage}/${frame.time}`)
                    assert.equal(state.dark, theme === 'dracula', `Frame mode at ${stage.stage}/${frame.time}`)
                }
            }
            assert.deepEqual(run.errors, [])
            console.log(`Filament ${major} / ${theme}: ${run.stages.length} stages checked (${probe})`)
            await context.close()
        }
    }
} finally {
    writeFileSync(`${output}/evidence.json`, JSON.stringify(results, null, 2))
    await browser.close()
}
