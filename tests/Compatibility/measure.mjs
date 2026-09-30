export async function measure(page, stage) {
    return page.evaluate((stage) => {
        const root = document.documentElement
        const selectors = {
            body: 'body',
            topbar: '.fi-topbar',
            sidebar: '.fi-sidebar',
            table: '.fi-ta-ctn',
            cell: '.fi-ta-text-item',
            heading: 'h1',
            input: '.fi-input',
            inputWrapper: '.fi-input-wrp',
            label: '.fi-fo-field-label-content',
            modal: '.fi-modal-window',
            modalHeading: '.fi-modal-heading',
            login: '.fi-simple-main',
            modalInput: '.fi-modal-open .fi-input',
            modalInputWrapper: '.fi-modal-open .fi-input-wrp',
            modalButton: '.fi-modal-open .fi-btn.fi-color-primary',
            button: '.fi-btn.fi-color-primary',
            dropdown: '.fi-dropdown-panel',
            themeChoice: '.fi-dropdown-panel [aria-pressed]',
            navigation: '.fi-sidebar-item-label',
            badge: '.fi-badge',
            selectOption: '.fi-select-input-option',
            section: '.fi-section',
            stat: '.fi-wi-stats-overview-stat-value',
            checkbox: '.fi-checkbox-input',
            radio: '.fi-radio-input',
            toggle: '.fi-toggle',
            datePanel: '.fi-fo-date-time-picker-panel',
            dateDay: '.fi-fo-date-time-picker-calendar-day',
            uploadSize: '.filepond--file-info-sub',
            uploadHint: '.filepond--file-status-sub',
            uploadName: '.filepond--file-info-main',
            uploadStatus: '.filepond--file-status-main',
            uploadPanel: '.filepond--panel-center.filepond--item-panel',
            fileUpload: '.filepond--root',
            uploadLabel: '.filepond--drop-label label',
            helper: '.fi-sc-text',
            error: '.fi-fo-field-wrp-error-message',
            notification: '.fi-no-notification',
            notificationTitle: '.fi-no-notification-title',
            notificationBody: '.fi-no-notification-body',
            infolist: '.fi-in-text-item',
            tooltip: '.tippy-box',
            daisyBadge: '[data-testid="daisy-sample"]',
            disabledInput: 'input:disabled',
            disabledButton: '.fi-btn:disabled',
        }
        const canvas = document
            .createElement('canvas')
            .getContext('2d', { willReadFrequently: true })
        function rgb(color) {
            canvas.clearRect(0, 0, 1, 1)
            canvas.fillStyle = color
            canvas.fillRect(0, 0, 1, 1)
            return [...canvas.getImageData(0, 0, 1, 1).data]
        }
        function surface(el) {
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
                (el) =>
                    el.getClientRects().length &&
                    getComputedStyle(el).visibility !== 'hidden',
            )
            if (!el) continue
            const css = getComputedStyle(el)
            // FilePond paints a sibling panel behind its file text.
            const background = surface(
                el.closest('.filepond--file')
                    ? el
                          .closest('.filepond--item')
                          .querySelector(
                              '.filepond--panel-center.filepond--item-panel',
                          )
                    : el,
            )
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
                selector,
                color: css.color,
                background: css.backgroundColor,
                backgroundRgb: rgb(css.backgroundColor),
                effectiveBackground: background,
                border: css.borderColor,
                shadow: css.boxShadow,
                radius: css.borderRadius,
                contrast: +(
                    (Math.max(fg, bg) + 0.05) /
                    (Math.min(fg, bg) + 0.05)
                ).toFixed(2),
                width: el.getBoundingClientRect().width,
                height: el.getBoundingClientRect().height,
                position: css.position,
                ancestors: [
                    ...(function* () {
                        for (let p = el.parentElement; p; p = p.parentElement)
                            yield p.tagName.toLowerCase() + '.' + p.className
                    })(),
                ],
            }
        }
        return {
            stage,
            url: location.href,
            theme: root.dataset.theme,
            inlineThemeStyles: document
                .querySelector('[data-daisy-theme-styles]')
                ?.getAttribute('data-daisy-theme-styles'),
            dark: root.classList.contains('dark'),
            scheme: getComputedStyle(root).colorScheme,
            storedMode: localStorage.getItem('theme'),
            // A light theme's surfaces are painted base-100. A dark theme's come
            // from the ramp, where gray-900 is the surface one step above the
            // base-100 page.
            expectedSurfaceRgb: rgb(
                getComputedStyle(root).getPropertyValue(
                    root.classList.contains('dark')
                        ? '--gray-900'
                        : '--color-base-100',
                ),
            ),
            expectedUploadRgb: rgb(
                getComputedStyle(root).getPropertyValue(
                    stage === 'upload-error'
                        ? '--color-error'
                        : '--color-success',
                ),
            ),
            alpineTheme: window.Alpine?.store('theme'),
            navigations: window.__navigations,
            paints: performance
                .getEntriesByType('paint')
                .map((p) => ({ name: p.name, time: p.startTime })),
            frames: window.__themeFrames,
            nodes,
            stylesheets: [
                ...document.querySelectorAll('link[rel=stylesheet]'),
            ].map((el) => el.getAttribute('href')),
            tokens: Object.fromEntries(
                [
                    '--color-base-100',
                    '--color-base-content',
                    '--primary-600',
                    '--gray-950',
                ].map((key) => [
                    key,
                    getComputedStyle(root).getPropertyValue(key),
                ]),
            ),
            themeSwitchers:
                document.querySelectorAll('.fi-theme-switcher').length,
            topbarHeight: getComputedStyle(document.body)
                .getPropertyValue('--topbar-height')
                .trim(),
            viewport: {
                width: innerWidth,
                height: innerHeight,
                documentWidth: document.documentElement.scrollWidth,
            },
        }
    }, stage)
}

// Compare CSS values after the current engine's serialization, not Chromium's decimals.
export async function normalizeColor(page, color) {
    return page.evaluate((value) => {
        const probe = document.createElement('span')
        probe.style.backgroundColor = value
        document.body.append(probe)
        const normalized = getComputedStyle(probe).backgroundColor
        probe.remove()
        return normalized
    }, color)
}

export async function settleStyles(page) {
    await page.evaluate(async () => {
        // Native color transitions can start inherited transitions on later frames.
        for (let attempt = 0; attempt < 20; attempt++) {
            await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
            )
            const animations = document
                .getAnimations()
                .filter(
                    (animation) =>
                        animation.playState === 'running' &&
                        Number.isFinite(
                            animation.effect.getComputedTiming().endTime,
                        ),
                )
            if (!animations.length) return
            await Promise.all(
                animations.map((animation) =>
                    animation.finished.catch(() => {}),
                ),
            )
        }
        throw new Error('Native styles did not settle')
    })
}
