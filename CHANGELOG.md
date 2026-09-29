# Changelog

All notable changes to `filament-daisy-ui-themes` will be documented in this
file.

## 1.0.0 - 2026-09-29

First release.

- Applies any of the 35 built-in daisyUI 5.7.46 themes to native Filament
  components, chosen per panel with `themes()` and `defaultTheme()`.
- Adds a keyboard-accessible theme selector and hides Filament's native
  light/dark/system switcher for the panel. Its position is configurable with
  `themeSwitcherHook()`, defaulting to the end of the topbar.
- Keeps Filament's own border radii. daisyUI's per-theme `--radius-*` tokens are
  not applied, so switching themes never changes component shape.
- Themes the surfaces Filament paints with a literal white that the generated
  palettes could not reach: widget stat cards, section content, and modal
  headers and footers. Filament's page underlay is left intact, so panels stay
  distinguishable from the background.
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
- Inlines only the themes a panel allowlists, so a wide allowlist does not
  inflate other panels' responses.

Known limits are documented in the README. Strict-CSP operation is not
certified.
