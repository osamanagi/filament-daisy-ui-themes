# Changelog

All notable changes to `filament-daisy-ui-themes` will be documented in this
file.

## Unreleased

- Adds `themeSwitcher(false)` to hide the theme selector, for panels that allow a
  single theme. The theme still applies and persists, and the switcher render
  hook stays empty.
- Adds `allThemes()`, `allLightThemes()`, and `allDarkThemes()` to allow a whole
  group of shipped themes without listing names. A default theme excluded by the
  new list resets to its first entry, so `allDarkThemes()` works on its own.
- Caps the switcher dropdown at `min(24rem, 60vh)` with its own scrollbar, so a
  wide allowlist no longer runs past the bottom of the screen.
- Paints Filament's light-mode surfaces with the theme's `base-100` instead of
  Filament's literal white, so cards, stat widgets, tables, forms, modals,
  dropdowns and the topbar match the theme. The theme previously reached only the
  page underlay, so those surfaces read as untinted white — 0.084 lightness adrift
  on Retro, and enough to make Caramellatte look subtly wrong. Input wrappers use
  `base-200` to stay distinguishable. Dark themes were already correct.

## 1.0.0 - 2026-09-29

First release.

- Applies any of the 35 built-in daisyUI 5.7.46 themes to native Filament
  components, chosen per panel with `themes()` and `defaultTheme()`.
- Adds a keyboard-accessible theme selector and hides Filament's native
  light/dark/system switcher for the panel. Its position is configurable with
  `themeSwitcherHook()`, defaulting to the end of the topbar. Each choice
  previews its own colours, as daisyUI's picker does: `base-content`, `primary`,
  `secondary` and `accent` on that theme's `base-100`.
- Keeps Filament's own border radii. daisyUI's per-theme `--radius-*` tokens are
  not applied, so switching themes never changes component shape.
- Paints only the off-canvas sidebar, and otherwise leaves Filament's own
  surface colours alone. Light themes keep the literal white Filament compiles,
  with the themed page underlay behind it, so a light theme tints the page,
  accents and charts. A dark theme re-skins the panel, because Filament's dark
  rules resolve through the generated ramp (`--gray-900` is `base-100`). Input
  wrappers and the FilePond root keep Filament's own fills, which are translucent
  in dark themes.
- Treats the selected theme as the source of truth for Filament's internal
  light/dark styling, so the operating system preference cannot override it.
- Stores the choice per panel under `filament-daisy-theme:<panel-id>`; unknown or
  removed values fall back to the panel default.
- Supports Filament `^4.14 || ^5.9`. Verified on Filament 4.14.0 with Livewire
  3.8.9 and Filament 5.9.0 with Livewire 4.4.6, both on Laravel 12.69.2 and
  PHP 8.4.
- Ships compiled CSS and JavaScript, so no npm install, custom Tailwind theme,
  view copying, migration, or User model change is needed.
- Clamps generated muted-text stops and the primary button pair to a contrast
  target above 4.5:1 using shared mappings, with no per-theme CSS exceptions.
- Generates Filament's neutral `gray-100` one ladder rung below the page colour
  instead of reusing it, so uncoloured chart areas, icon wells and active
  sidebar items stay distinguishable from the background. Colour accents that
  sit on those fills are clamped to the same target.
- Inlines only the themes a panel allowlists, so a wide allowlist does not
  inflate other panels' responses.

Known limits are documented in the README. Strict-CSP operation is not
certified.
