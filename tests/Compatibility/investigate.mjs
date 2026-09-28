import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const fixtures = resolve(process.argv[2] || '/tmp/daisy-filament-milestone1')
const output = resolve('docs/compatibility/investigations')
mkdirSync(output, { recursive: true })
const { chromium } = await import(pathToFileURL(`${fixtures}/node_modules/playwright/index.mjs`))
const browser = await chromium.launch()
const evidence = { firstPaint: [], collisions: [] }

async function snapshot(page) {
    return page.evaluate(() => {
        const result = {}
        for (const selector of ['html', 'body', '.fi-input-wrp', '.fi-input', '.fi-topbar', '.fi-sidebar', '.fi-ta-ctn', '.fi-modal-window', '.fi-btn.fi-color-primary']) {
            const el = [...document.querySelectorAll(selector)].find(el => el.getClientRects().length)
            if (!el) continue
            const css = getComputedStyle(el)
            result[selector] = Object.fromEntries(['color', 'backgroundColor', 'fontSize', 'lineHeight', 'borderRadius', 'boxShadow', 'scrollbarColor', 'scrollbarGutter'].map(key => [key, css[key]]))
            result[selector].width = el.getBoundingClientRect().width
            result[selector].height = el.getBoundingClientRect().height
        }
        return result
    })
}

try {
    for (const major of [4, 5]) for (const theme of ['cupcake', 'dracula']) {
        for (const stored of [null, 'system', theme === 'dracula' ? 'light' : 'dark']) {
            const context = await browser.newContext({ colorScheme: theme === 'dracula' ? 'light' : 'dark' })
            await context.addInitScript(({ stored }) => {
                if (stored === null) localStorage.removeItem('theme')
                else localStorage.setItem('theme', stored)
                window.__visibleFrames = []
                function sample() {
                    const box = document.querySelector('.fi-simple-main')
                    if (box?.getClientRects().length) window.__visibleFrames.push({
                        time: performance.now(), theme: document.documentElement.dataset.theme,
                        dark: document.documentElement.classList.contains('dark'),
                        scheme: getComputedStyle(document.documentElement).colorScheme,
                        surface: getComputedStyle(box).backgroundColor,
                    })
                    requestAnimationFrame(sample)
                }
                requestAnimationFrame(sample)
            }, { stored })
            const page = await context.newPage()
            await page.route('**/*.css*', async route => {
                await new Promise(resolve => setTimeout(resolve, 200))
                await route.continue()
            })
            await page.goto(`http://127.0.0.1:810${major}/${theme}/login`)
            await page.waitForTimeout(350)
            const timing = await page.evaluate(() => ({ frames: window.__visibleFrames, paints: performance.getEntriesByType('paint').map(p => ({ name: p.name, time: p.startTime })) }))
            assert.ok(timing.frames.length && timing.paints.length)
            for (const frame of timing.frames) {
                assert.equal(frame.theme, theme)
                assert.equal(frame.dark, theme === 'dracula')
                assert.equal(frame.scheme, theme === 'dracula' ? 'dark' : 'light')
                assert.equal(frame.surface, theme === 'dracula' ? 'oklch(0.28822 0.022 277.508)' : 'oklch(0.97788 0.004 56.375)')
            }
            evidence.firstPaint.push({ major, theme, stored, cssDelayMs: 200, ...timing })
            await context.close()
        }

        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
        page.setDefaultTimeout(15000)
        await page.goto(`http://127.0.0.1:810${major}/${theme}/login`)
        async function collision(stage) {
            await page.waitForTimeout(400)
            const before = await snapshot(page)
            const style = await page.addStyleTag({ path: `${fixtures}/node_modules/daisyui/daisyui.css` })
            await page.waitForTimeout(400)
            const after = await snapshot(page)
            const changes = {}
            for (const key of Object.keys(before)) for (const prop of Object.keys(before[key])) {
                if (before[key][prop] !== after[key][prop]) (changes[key] ??= {})[prop] = { before: before[key][prop], after: after[key][prop] }
            }
            evidence.collisions.push({ major, theme, stage, changes })
            if (Object.keys(changes).length) await page.screenshot({ path: `${output}/full-daisy-filament${major}-${theme}-${stage}.png`, fullPage: true, animations: 'disabled' })
            await style.evaluate(el => el.remove())
        }
        await collision('login')
        await page.getByLabel('Email address').fill('tester@example.test')
        await page.locator('input[type=password]').fill('fixture-password')
        await page.getByRole('button', { name: 'Sign in', exact: true }).click()
        await page.getByRole('link', { name: 'Products', exact: true }).click()
        await page.waitForURL(`**/${theme}/products`)
        await collision('table')
        await page.getByRole('button', { name: 'Inspect', exact: true }).first().click()
        await page.getByRole('heading', { name: 'Inspect product' }).waitFor()
        await collision('modal')
        await page.close()
        console.log(`Filament ${major}/${theme}: first-paint scenarios and full-daisy CSS comparison recorded`)
    }
} finally {
    writeFileSync(`${output}/evidence.json`, JSON.stringify(evidence, null, 2))
    await browser.close()
}
