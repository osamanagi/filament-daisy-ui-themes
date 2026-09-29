// Shared OKLCH helpers for build-time theme analysis.
//
// Build-time contrast maths run on the generated token values, which are plain
// `oklch()` strings. WCAG contrast is defined on sRGB relative luminance, so
// values are converted to linear sRGB before measuring.

// daisyUI source tokens use percentages; generated values use 0-1 fractions.
export const parseOklch = (value) => {
    const parts = String(value).match(/[\d.]+/g)
    if (!parts) return null
    const [l, c, h] = parts.map(Number)
    return { l: l > 1 ? l / 100 : l, c, h: h || 0 }
}

export const formatOklch = (l, c, h) =>
    `oklch(${+l.toFixed(6)} ${+c.toFixed(6)} ${+h.toFixed(6)})`

const oklchToLinearSrgb = (l, c, h) => {
    const a = c * Math.cos((h * Math.PI) / 180)
    const b = c * Math.sin((h * Math.PI) / 180)
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b
    const s_ = l - 0.0894841775 * a - 1.291485548 * b
    const l3 = l_ ** 3
    const m3 = m_ ** 3
    const s3 = s_ ** 3
    return [
        4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
        -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
        -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
    ]
}

const inGamut = (rgb) =>
    rgb.every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4)

// OKLCH -> linear sRGB (the space WCAG relative luminance is defined on).
// Out-of-gamut colours are chroma-reduced the way CSS Color 4 gamut mapping
// does, so the offline maths agrees with what the browser actually renders.
export const toLinearSrgb = (value) => {
    const parsed = parseOklch(value)
    if (!parsed) return [0, 0, 0]
    const { l, h } = parsed
    let { c } = parsed
    let rgb = oklchToLinearSrgb(l, c, h)
    if (!inGamut(rgb)) {
        let lo = 0
        let hi = c
        for (let step = 0; step < 24; step++) {
            const mid = (lo + hi) / 2
            if (inGamut(oklchToLinearSrgb(l, mid, h))) lo = mid
            else hi = mid
        }
        rgb = oklchToLinearSrgb(l, lo, h)
    }
    return rgb
}

export const luminance = (value) => {
    const [r, g, b] = toLinearSrgb(value).map((channel) =>
        Math.min(1, Math.max(0, channel)),
    )
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (foreground, background) => {
    const a = luminance(foreground)
    const b = luminance(background)
    const [light, dark] = a > b ? [a, b] : [b, a]
    return (light + 0.05) / (dark + 0.05)
}

// Move lightness only until the pair meets `target`. Contrast against a fixed
// background is V-shaped in the foreground's lightness, bottoming out near the
// background's own lightness, so both sides are solved and the boundary closest
// to the original colour wins. Returns the original value when it already
// passes, or `null` when neither lightness extreme reaches the target (which
// happens for mid-lightness, high-chroma backgrounds such as some daisyUI
// `primary` colours).
export const clampContrast = (color, background, target) => {
    if (contrast(color, background) >= target) return color
    const { l, c, h } = parseOklch(color)
    const backgroundLightness = parseOklch(background).l

    const solve = (failing, extreme) => {
        // Nearest passing lightness on the way out to `extreme`, or null.
        if (contrast(formatOklch(extreme, c, h), background) < target)
            return null
        let fail = failing
        let pass = extreme
        for (let step = 0; step < 40; step++) {
            const mid = (fail + pass) / 2
            if (contrast(formatOklch(mid, c, h), background) >= target)
                pass = mid
            else fail = mid
        }
        return pass
    }

    const options = [solve(backgroundLightness, 0), solve(backgroundLightness, 1)]
        .filter((value) => value !== null)
    if (!options.length) return null
    const chosen = options.reduce((a, b) =>
        Math.abs(a - l) <= Math.abs(b - l) ? a : b,
    )
    return formatOklch(chosen, c, h)
}

// Ensure a foreground/background pair meets `target`. Either side may move, and
// the option with the smaller combined lightness change wins, so a button keeps
// its intended foreground whenever the background only needs a slight nudge.
export const clampPair = (background, foreground, target) => {
    if (contrast(foreground, background) >= target)
        return { background, foreground }
    const adjustedForeground = clampContrast(foreground, background, target)
    const adjustedBackground = clampContrast(background, foreground, target)
    const options = []
    if (adjustedForeground)
        options.push({ background, foreground: adjustedForeground })
    if (adjustedBackground)
        options.push({ background: adjustedBackground, foreground })
    if (!options.length)
        throw new Error(
            `Contrast clamp unreachable for ${foreground} on ${background}`,
        )
    const lightness = (value) => parseOklch(value).l
    const delta = (pair) =>
        Math.abs(lightness(pair.background) - lightness(background)) +
        Math.abs(lightness(pair.foreground) - lightness(foreground))
    return options.reduce((a, b) => (delta(a) <= delta(b) ? a : b))
}
