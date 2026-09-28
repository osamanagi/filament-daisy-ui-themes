;(() => {
    if (window.filamentDaisyThemes) return
    let config
    let selected
    const key = () => `filament-daisy-theme:${config.panel}`
    const read = () => {
        try {
            return localStorage.getItem(key())
        } catch {
            return null
        }
    }
    const apply = () => {
        if (!config) return
        const mode = config.themes[selected]
        document.documentElement.dataset.theme = selected
        document.documentElement.classList.toggle('dark', mode === 'dark')
        document.documentElement.style.colorScheme = mode
        window.dispatchEvent(
            new CustomEvent('filament-daisy-theme-changed', {
                detail: selected,
            }),
        )
        // Filament 4/5 internal bridge: theme-changed writes its global storage key.
        // Set only the appearance store, leaving that unrelated preference intact.
        if (window.Alpine?.store('theme') !== undefined)
            window.Alpine.store('theme', mode)
    }
    const select = (value) => {
        selected = Object.hasOwn(config.themes, value) ? value : config.default
        try {
            localStorage.setItem(key(), selected)
        } catch {
            /* Keep the current selection when persistence is unavailable. */
        }
        apply()
    }
    const activate = (next) => {
        config = next
        select(read())
    }
    window.filamentDaisyThemes = {
        activate,
        select,
        apply,
        current: () => selected,
    }
    const initialize = () => {
        apply()
        // Register after Filament so its system-preference listener cannot win.
        matchMedia('(prefers-color-scheme: dark)').addEventListener(
            'change',
            apply,
        )
    }
    if (window.Alpine?.store('theme') !== undefined) initialize()
    else
        document.addEventListener('alpine:initialized', initialize, {
            once: true,
        })
    document.addEventListener('livewire:navigated', () =>
        queueMicrotask(() => {
            const node = document.getElementById('filament-daisy-theme-state')
            if (node) activate(JSON.parse(node.textContent))
            else if (config) {
                config = null
                delete document.documentElement.dataset.theme
                document.documentElement.style.removeProperty('color-scheme')
                const native = localStorage.getItem('theme') || 'system'
                const dark =
                    native === 'dark' ||
                    (native === 'system' &&
                        matchMedia('(prefers-color-scheme: dark)').matches)
                window.Alpine?.store('theme', dark ? 'dark' : 'light')
                document.documentElement.classList.toggle('dark', dark)
            }
        }),
    )
})()
