# Filament / daisyUI compatibility findings

Investigation date: 2026-09-28. Scope: **Milestone 1 only**.

## Gate and exact versions

Cupcake and Dracula render coherent native tables, forms, sidebar/topbar,
action modals, body-teleported modals, and login on the two pinned versions below.
The shared probe preserves appearance through actual Livewire navigation,
refresh, browser back, and OS preference changes. This is a Chromium desktop
compatibility result, not a completed plugin or a blanket 4.x/5.x support claim.

| Fixture | Filament | Livewire | Laravel | Tailwind | daisyUI | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Separate `filament4` host | 4.14.0 | 3.8.9 | 12.69.2 | 4.1.18 | 5.7.46 | Pass, stock and custom host CSS |
| Separate `filament5` host | 5.9.0 | 4.4.6 | 12.69.2 | 4.1.18 | 5.7.46 | Pass, stock and custom host CSS |

Runtime: PHP 8.4.8, Node 25.4.0, Playwright 1.58.2, Chromium 145.0.7632.6.
Full dependency inventory and compared-source SHA-256 hashes:
[`compatibility/versions.json`](compatibility/versions.json).

The package remains a Composer library. `src/`, its public API, and its release
Composer constraint are unchanged. Test apps are outside the repository at
`/tmp/daisy-filament-milestone1/filament4` and `filament5`. The v5 host uses a path
repository; v4 uses fixture-only dependency metadata overriding the package's
current `^5.0` requirement. **A normal v4 release installation is not yet supported
or claimed.** Only setup scripts, native component fixtures, and the prototype
adapter live in `tests/Compatibility/`.

## Template inspection and references

Starting commit: `4c1435babb57e8329be4be1a7bc2f0031458d8f0`. The template already
implements `Filament\Contracts\Plugin`, has a package service provider, and uses
Pest with Orchestra Testbench. Its two tests pass (4 assertions), but only test
a placeholder assertion and forbidden debugging functions. The Testbench base
uses `WithWorkbench`; no configured workbench or runnable example existed.
`bin/build.js` only bundles JavaScript with esbuild; the CSS file imports Filament,
and the provider's asset registrations are commented out.

Consulted local daisyUI install/config/color/usage guidance and the official
[daisyUI configuration documentation](https://daisyui.com/docs/config/).
No callable daisyUI MCP tool was exposed in this session; installed package
definitions and browser measurements supplied implementation evidence.
The integration follows Filament's
[panel-plugin contract](https://filamentphp.com/docs/5.x/plugins/panel-plugins),
[panel-scoped asset registration](https://filamentphp.com/docs/5.x/plugins/building-a-panel-plugin),
and [documented CSS hooks](https://filamentphp.com/docs/5.x/styling/css-hooks).

## Native browser evidence

Screenshots use 1440×1000 Chromium viewports. The full sets also contain dropdown,
select, and body-portal captures. These are native Filament controls, not daisyUI
demo markup.

| Version / theme | Login | Table and navigation | Form | Action modal | Body portal |
| --- | --- | --- | --- | --- | --- |
| 4 / Cupcake | [Image](compatibility/adapter/filament4-cupcake-login.png) | [Image](compatibility/adapter/filament4-cupcake-table.png) | [Image](compatibility/adapter/filament4-cupcake-form.png) | [Image](compatibility/adapter/filament4-cupcake-modal.png) | [Image](compatibility/adapter/filament4-cupcake-portal-modal.png) |
| 4 / Dracula | [Image](compatibility/adapter/filament4-dracula-login.png) | [Image](compatibility/adapter/filament4-dracula-table.png) | [Image](compatibility/adapter/filament4-dracula-form.png) | [Image](compatibility/adapter/filament4-dracula-modal.png) | [Image](compatibility/adapter/filament4-dracula-portal-modal.png) |
| 5 / Cupcake | [Image](compatibility/adapter/filament5-cupcake-login.png) | [Image](compatibility/adapter/filament5-cupcake-table.png) | [Image](compatibility/adapter/filament5-cupcake-form.png) | [Image](compatibility/adapter/filament5-cupcake-modal.png) | [Image](compatibility/adapter/filament5-cupcake-portal-modal.png) |
| 5 / Dracula | [Image](compatibility/adapter/filament5-dracula-login.png) | [Image](compatibility/adapter/filament5-dracula-table.png) | [Image](compatibility/adapter/filament5-dracula-form.png) | [Image](compatibility/adapter/filament5-dracula-modal.png) | [Image](compatibility/adapter/filament5-dracula-portal-modal.png) |

Identical representative computed results in both versions:

| Measurement | Cupcake | Dracula |
| --- | --- | --- |
| `.dark` / `color-scheme` | absent / light | present / dark |
| Body background | `oklch(0.93982 0.007 61.449)` | `oklch(0.24787 0.019 277.508)` |
| Table, topbar, login, modal, input-wrapper surfaces | `oklch(0.97788 0.004 56.375)` | `oklch(0.28822 0.022 277.508)` |
| Form input text contrast | 15.92:1 | 14.24:1 |
| Primary action text contrast | 5.20:1 | 8.29:1 |

The harness asserts actual surface RGB values equal the selected daisyUI
`base-100`, alongside contrast ≥4.5:1 for sampled text, navigation, badges, and
primary actions. Focus and hover are sampled. This is representative contrast
measurement, not a complete accessibility audit (for example, placeholder and
control-boundary contrast still belong in Milestone 2).

Raw evidence includes DOM ancestry, computed colors, shadows, stylesheet order,
navigation counts, root state, and paint/frame timings:
[stock CSS](compatibility/adapter/evidence.json),
[custom host CSS](compatibility/host/evidence.json),
[initial-paint and collision probes](compatibility/investigations/evidence.json).
Both primary suites cover 13 states × 2 themes × 2 versions, with no browser
page errors or HTTP failures in the final runs.

## Dark state, first paint, and navigation

The installed `filament/resources/views/components/layout/base.blade.php`,
`filament/resources/js/dark-mode.js`, and `HasDarkMode.php` are byte-identical
between the two fixtures. No version branch is warranted by the observations.

The head bootstrap reads the global `localStorage.theme`, falls back to the
panel default, and checks `prefers-color-scheme` for `system`. Its ordinary path
adds `.dark` to `<html>`; it does not remove an existing class. Alpine's theme
store subsequently owns add/remove behavior. Filament listens for
`theme-changed`, writes storage, and updates the store; OS changes matter when
the stored mode is `system`. `themeSwitcher(false)` removes the native UI while
`darkMode()` retains internal dark styling. `data-theme` and `color-scheme`
alone do not update that store or class.

The probe sets theme, mode, and the storage bridge at `HEAD_START`, before
Filament's own initialization. Pinned daisyUI definitions explicitly classify
Cupcake as light and Dracula as dark. Twelve login scenarios combine both
versions/themes with missing, system, and opposing saved preferences, opposing
OS preferences, and 200ms stylesheet delays. Every sampled visible frame had
the intended root mode **and native login surface**. Paint timings are retained;
this does not establish identical first-paint behavior in other browser engines.

Livewire 3.8.9 and 4.4.6 replace HTML attributes on navigation. Identical head
scripts are not a reliable reinitialization mechanism. The first head-only probe
lost `data-theme` after navigation: see the
[failure screenshot](compatibility/failures/filament4-cupcake-navigation.png) and
[measurements](compatibility/failures/navigation-before-sync.json).
The corrected probe renders per-response state through `BODY_START` and applies
it on `livewire:navigated`, synchronizing `.dark` and dispatching Filament's
existing `theme-changed` event. Navigation counts confirm SPA navigation rather
than only full reloads. The listener is installed once.

The `theme-changed` event and global storage key are observed Filament behavior,
not a promised version-independent public JavaScript API. Isolate this bridge
and retain regression checks when implementing Milestone 4. The current global
storage write is **prototype-only**: final preference storage must be namespaced
per panel, with cross-panel/public-page cleanup tested before release.

## CSS, palettes, collisions, and overlays

The published token and adapter assets load through `$panel->assets()` before
the panel theme. Filament also emits palette variables in an inline `:root`
style. Using `$panel->colors()` supplies real numeric palettes to both its CSS
variables and server-side contrast calculations; arbitrary CSS `var(...)`
strings are not a substitute for colors that PHP must parse.

Palette changes cannot replace literal compiled `bg-white` surfaces. The shared
33-line adapter uses documented `fi-*` hooks for surfaces and the primary
button pair, with no `!important`, DOM-position selectors, or copied views.
It is unlayered, so it also overrides Filament's layered component declarations
when the host theme loads later. Both independently built host themes include
an actual 4.5rem topbar customization, asserted in the browser; the adapter
preserves that customization. Arbitrary conflicting host CSS is not certified.

The first generated shade-palette approach produced a Dracula button with white
text at only 4.37:1. The [failed screenshot](compatibility/failures/filament4-dracula-button-contrast.png)
and [computed result](compatibility/failures/generated-palette-contrast.json) are
retained. Using daisyUI's explicit primary/primary-content pair for the primary
button fixes this in both versions without a theme-specific exception. Other
semantic roles use generated Filament shade palettes. The neutral ramp is an
experimental mapping, not the finalized Milestone 3 strategy.

The pinned npm package exposes theme objects separately. The build emits only
their declarations under explicit root theme selectors, with no daisyUI reset
or component stylesheet. Injecting full `daisyui.css` on login, table, and modal
changed root foreground/background and inherited scrollbar colors in all four
combinations. The sampled native component geometry/backgrounds did not change;
this does not prove universal collision safety. Omitting those unrelated global
styles is the smaller and more predictable core integration.

The resource action modal remains inside the page's DOM. A second native modal
uses `teleport="body"`; its actual ancestors end at `<body>` outside `.fi-layout`
and the topbar. Its input and surface remain themed. A dropdown's `teleport`
option only sets fixed positioning in these installed releases; it does not
reparent the node. Root-level tokens cover both cases. Scoping tokens only to
`.fi-main` would miss topbar and body portals.

## Recommended architecture and remaining work

Keep one shared adapter unless future browser/source evidence proves a version
difference. The production package should eventually:

1. Build pinned daisyUI token CSS and validated palette data in development;
   distribute compiled assets, with its MIT notice, so consumers need no npm
   daisyUI dependency for included themes.
2. Register assets and render hooks through `Plugin::register(Panel $panel)`;
   use the service provider for package discovery/views and supported publishing.
3. Retain Filament dark styling, hide its switcher, and apply one allowlisted
   theme with explicit appearance metadata before paint and after navigation.
4. Keep the small CSS-hook bridge for literal surfaces and semantic button pairs;
   test every additional native component before expanding selectors.

No fragile overrides or view copies were needed for this gate. Release blockers
remain intentionally outside Milestone 1: switcher, final persistence/isolation,
all component states/mobile, other browser engines, finalized palette/radius
mapping, clean v4 Composer support, package asset extraction, and all-theme
coverage. Global storage access also needs a failure strategy for restricted
storage environments. Do not treat the hard-coded probe as production code.

## Commands and next decision

Executed setup, per-app Composer installs, migrations and fixture seeding,
`php artisan filament:assets`, the pinned Tailwind CLI via `build.mjs`,
`browser.mjs` in adapter/tokens/host modes, and `investigate.mjs`.
Package Pest: 2 passed / 4 assertions. Fixture PHP was formatted with Pint.
Exact repeatable commands are in the
[probe README](../tests/Compatibility/README.md).

The tokens-only diagnostic completed but **failed visual compatibility** on both
versions: opposing stored modes remained active and navigation removed the
theme attribute. An early custom-theme URL also returned 404 until passed as an
absolute URL to `Panel::theme()`. A concurrent browser rerun timed out after
login; run suites sequentially against these shared fixture applications.

**Decision after milestone 1:** use this shared approach for Milestone 2's full
native component/state coverage, or revise the mapping after reviewing these
screenshots. The milestone 2 follow-up below supersedes this earlier next step;
the switcher remains unimplemented.

## Milestone 2 follow-up

The expanded desktop/mobile fixtures expose additional issues beyond the narrow
milestone 1 gate. See [milestone 2 findings](compatibility/milestone2-findings.md)
for baseline comparisons, Nord classification, extended controls, corrected
failures, and the passed pinned desktop/mobile visual gate. The earlier milestone 1 pass does not establish full theme coverage.

## Milestone 3 follow-up

The shared adapter now has reproducible compiled assets and numeric palette
data. See [adapter findings](compatibility/milestone3-findings.md) for verified
radius mappings, same-DOM theme changes, badge CSS isolation, and the
cross-panel SPA initialization issue reserved for milestone 4.


## Milestone 4 follow-up

The [state findings](compatibility/milestone4-findings.md) replace the original
fixed-theme/global-storage probe with allowlisted, per-panel persisted selection.
Both pinned versions pass 188 combined desktop/mobile state captures and 30
first-paint scenarios. Cross-panel SPA navigation between shared-default fixture
panels passes; the report documents the isolated internal Alpine bridge and
unrelated-layout boundary. Milestone 5 has not started.


## Milestone 5 follow-up

The [public-plugin findings](compatibility/milestone5-findings.md) document the
Composer plugin API, native topbar selector, compiled asset publication, clean
Filament 4/5 installations without npm, and state/first-paint regressions. The
prototype's global name and fixture subclass have been replaced by package code.
Milestone 6 remains the release verification step.
