# Milestone 3: shared theme adapter

## Scope and build outputs

The adapter supports exactly Cupcake, Nord, and Dracula from **daisyUI 5.7.46**.
Nord is light. Both external fixtures consume the same generated assets and data;
there are no per-version or per-theme CSS branches. The public plugin API,
switcher, preference persistence, and asset registration remain later milestones.

`npm ci` installs the pinned theme definitions and locked build dependencies.
`npm run build:themes` runs `bin/build-themes.mjs`; `npm run check:themes` fails
if committed outputs differ from a fresh generation. Generation uses the root
Composer installation's **filament/support v5.9.0** and checks that version.
The installed v4.14.0 and v5.9.0 `Color.php` sources are byte-identical; both
fixtures independently validate the generated colors in the browser.

| Artifact | Purpose |
| --- | --- |
| `resources/dist/themes.css` | Original theme variables plus numeric Filament shade variables, scoped by `:root[data-theme]` |
| `resources/dist/adapter.css` | Compiled shared native-component and FilePond adaptations |
| `resources/dist/theme-data.json` | Source versions, light/dark classification, numeric palettes for Filament's PHP color API |
| `resources/dist/DAISYUI-LICENSE.txt` | License accompanying the generated theme data |

The CSS source is `resources/css/adapter.css`. There are no duplicate fixture
palettes or adapter styles. Build-time npm/PHP dependencies are needed by
contributors; consuming these generated files does not require npm or runtime
palette generation. Packaging their public registration is milestone 5.

## Verified mapping policy

| Input | Adapter mapping |
| --- | --- |
| `base-100` | Topbar, table, section, input, modal, dropdown, login, date-picker, notification, enabled upload, and mobile sidebar surfaces |
| `base-200` | Light page underlay / gray 50 and 100; neutral upload state |
| `base-300` | Light gray 200 separation; dark page underlay / gray 950 |
| `base-content` | Main text and neutral-ramp endpoint |
| `primary` / `primary-content` | Exact primary action pair; hover mixes 96% primary with 4% content |
| `info`, `success`, `warning`, `error` | Numeric Filament status ramps; `error` is named `danger` by Filament |
| Success/error content | Upload-state foregrounds; error foreground uses 75% of its OKLCH lightness after Cupcake's original pair failed contrast |
| `radius-field` | Native input wrappers and buttons |
| `radius-box` | Native panels, tables, modals, dropdowns, login, notifications, date picker, upload root |
| `radius-selector` | Native badges and checkboxes |

The plan's suggested page-base mapping was a hypothesis. Browser evidence
supports a secondary underlay with base-100 surfaces, preserving Filament's
existing visual hierarchy. Native border/ring widths and opacity rules remain;
their shade variables derive from the theme. The adapter changes neither
component spacing nor layout to mimic daisyUI markup.

**Amendment for 1.0.0.** The table above records what milestone 3 shipped; two
mappings changed afterwards, both narrowed rather than widened.

- The `radius-field`, `radius-box`, and `radius-selector` rows no longer apply.
  Themes are colour only: components keep Filament's own border radii, so a
  theme switch cannot change component shape.
- The page underlay uses `base-100` instead of `base-200`/`base-300`. The
  secondary underlay was measured as darker than the widget surfaces, which left
  visible gutters between stats widgets in a row — Filament paints widget cards
  with `--gray-900` (which the generated ramp maps to `base-100`) but the dark
  page with `--gray-950`. The panel is now one surface.

The Filament palette helper generates 11 numeric 50–950 shades from each
semantic color's hue, using its own ramp and achromatic detection. These are
not exact daisyUI semantic colors, so primary buttons retain the exact semantic
pair instead. For light themes, stops 600/700/800 use the next darker generated
stop. The neutral ramp interpolates lightness between base and content while
retaining base hue/chroma: light stops from 500 onward use content weights
0.70, 0.76, 0.82, 0.88, 0.94, 1.00. Dark neutral weights run in reverse tenths,
with explicit base/content endpoints. The generated JSON and CSS use the same
numbers, avoiding PHP parsing of CSS `var()` expressions.

The [milestone 2 report](milestone2-findings.md) retains the failures that
motivated these shared corrections, including Cupcake validation/navigation,
Nord helper/hover text, and FilePond text. No named-theme exception is currently
needed. Adding another theme or changing these policies requires new browser
and contrast evidence; automatic acceptance of all daisyUI themes is not claimed.

## Core CSS and optional components

Core generation reads the pinned daisyUI theme objects directly. It does not
invoke daisyUI's component plugin, import Tailwind preflight, or ship daisyUI
base resets, generic component rules, or scrollbar changes. The output contains
scoped variables and Filament/FilePond adapter hooks only.

The fixture's custom badge compiles just the daisyUI badge module into a separate
host stylesheet. That stylesheet is not part of the core distribution. The
focused browser test disables and re-enables it while comparing native component
computed styles. Its findings cover this badge module, not the full daisyUI
component library. The earlier [full-bundle investigation](../compatibility-findings.md)
is documented separately in the milestone 1 report.

## Browser gate and reproduction

Exact tested applications: Filament **4.14.0 / Livewire 3.8.9** and Filament
**5.9.0 / Livewire 4.4.6**, both Laravel **12.69.2**, Tailwind **4.1.18**,
Playwright **1.58.2**, Chromium **145.0.7632.6**. Desktop is 1440×1000 and
mobile is 390×844. This is a pinned Chromium gate, not release-wide support.

After fixture setup, build and publish assets in both apps, start the localhost
servers, then run the suites sequentially per application:

```sh
npm run build:themes
npm run check:themes
node tests/Compatibility/build.mjs
COMPAT_OUTPUT=docs/compatibility/milestone3 node tests/Compatibility/visual.mjs
node tests/Compatibility/adapter.mjs
```

The full native-component matrix writes [summary.json](milestone3/summary.json)
and screenshots. The focused suite visits Cupcake → Nord → Dracula → Cupcake in one
authenticated browser session, rendering a native table, action modal, form,
and dashboard after each change. It uses full document loads between fixture
panels and Livewire navigation within a panel. It also changes the adapter
inputs directly on already-rendered native tables, open modals, and forms,
without reloading, and measures all three themes on that same DOM. It checks all 66 shade variables against
the generated server data, radius mappings, surfaces, contrast, actual Livewire
navigation, and optional badge CSS collisions. This is fixture-driven theme
switching, not an implemented user switcher or preference store.

The within-panel test uses the documented `Livewire.navigate()` API:
[Livewire 3 navigation](https://livewire.laravel.com/docs/3.x/navigate) and
[Livewire 4 navigation](https://livewire.laravel.com/docs/4.x/navigate).

Pest, Pint, and JavaScript syntax checks are also run. PHPStan remains blocked
by the existing rejected `checkOctaneCompatibility` and `checkModelProperties`
configuration options. No unrelated configuration changes are included.

## State issue reserved for milestone 4

An exploratory forced SPA transition between the hard-coded panels with
different Filament `defaultThemeMode` values raised
`Identifier 'loadDarkMode' has already been declared` on both Filament versions.
The head initialization scripts differ between panels and are re-evaluated.
The [diagnostic JSON](milestone3/diagnostics/forced-spa-panels.json) and failure
screenshots preserve that observation. That early test also navigated before
the modal-cancel request finished, producing component teardown errors; the
final test waits for the response and modal closure.

No Filament views or state initialization were changed to hide these findings.
The adapter gate covers rendered colors, radii, and native components; it does
not establish cross-panel SPA state correctness. Milestone 4 must address
initialization, theme authority, per-panel storage, and panel transitions,
including this observed head-script issue.

Color transitions are allowed to finish before optional-stylesheet comparisons;
inherited color transitions can start child transitions on later frames. The
comparison uses settled computed styles rather than rounding away differences.

## Computed radius and surface evidence

The same values are observed in both versions, on desktop and mobile:

| Theme | Input/button radius | Modal radius | Native base surface |
| --- | --- | --- | --- |
| Cupcake | 32px | 16px | `oklch(0.97788 0.004 56.375)` |
| Nord | 4px | 8px | `oklch(0.95127 0.007 260.731)` |
| Dracula | 8px | 16px | `oklch(0.28822 0.022 277.508)` |

Native badges use 16px radius for all three theme definitions. Input border/ring
colors and shadows are retained in each capture, alongside text, background,
contrast, and navigation counts. See the [full matrix](milestone3/summary.json)
and [same-session/DOM checks](milestone3/switching.json).

## Result and next decision

**Milestone 3 adapter gate: PASSED for the pinned matrix.**

| Fixture | Full native matrix | Focused adapter checks |
| --- | --- | --- |
| Filament 4.14.0 / Livewire 3.8.9 | 10 cases, 196 captures, no failures/errors | Desktop/mobile, 50 captures, no failures/errors |
| Filament 5.9.0 / Livewire 4.4.6 | 10 cases, 196 captures, no failures/errors | Desktop/mobile, 50 captures, no failures/errors |

All three themes pass on both viewport sizes. The optional badge stylesheet
changes none of the sampled native node styles. Generation drift checks pass;
Pest passes (2 tests, 4 assertions), Pint passes, and changed JavaScript modules
parse successfully. PHPStan retains the configuration blocker described above.

Representative screenshots: [Cupcake form, v5](milestone3/5-cupcake-desktop-edit.png),
[Nord form, v4](milestone3/4-nord-mobile-edit.png),
[Dracula modal, v5](milestone3/5-dracula-mobile-action-modal.png),
[same-DOM Nord modal, v4](milestone3/switch-4-desktop-direct-nord-modal.png),
[same-DOM Dracula form, v5](milestone3/switch-5-mobile-direct-dracula-form.png).

Next: milestone 4's theme authority and dark-state synchronization, with the
observed cross-panel initialization issue included in its acceptance tests.
No milestone 4 state implementation or milestone 5 switcher was started.
