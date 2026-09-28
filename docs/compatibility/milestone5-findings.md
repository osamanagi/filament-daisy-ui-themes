# Milestone 5: Public panel plugin and theme selector

## Delivered package

`FilamentDaisyUiThemesPlugin::make()->themes([...])->defaultTheme(...)` now
registers the tested adapter, state handling, and a native Filament topbar
dropdown. The selector has a labelled palette icon, allowed theme buttons,
current-choice check mark/pressed state, keyboard activation, Escape dismissal,
and focus return. No additional frontend framework, model trait, or migration
was introduced. The fixture-only prototype and duplicate controller were removed.

The service provider registers compiled CSS/JS with Filament as loaded-on-request
assets. Panel render hooks emit the CSS only for enabled panels, after the host's
styles. `filament:assets` publishes them under the package namespace, with
Filament package-version URLs. The compiled bootstrap is inserted inline with a
content hash: see the loading-order finding below. No runtime npm dependency or
custom Tailwind build is needed by a consuming app.

Configuration errors reject empty lists, unsupported/non-string values, and
excluded defaults. Each panel gets its own plugin instance and browser storage
key. The existing tested appearance mapping, native-key isolation, and fallback
behavior are retained. Login gets the stored/default theme; the selector appears
in the topbar, which the simple authentication layout does not have.

## Two clean Composer installations

Created new applications under `/tmp/daisy-filament-milestone5`, separately from
the earlier workbenches. Both use real Composer path repositories against the
package. The Filament 4 metadata override is gone. Package constraints are now
`^4.14 || ^5.9`, with these verified floors:

| App | Filament | Livewire | Laravel |
| --- | --- | --- | --- |
| Filament 4 | 4.14.0 | 3.8.9 | 12.69.2 |
| Filament 5 | 5.9.0 | 4.4.6 | 12.69.2 |

The shared compiled themes remain daisyUI 5.7.46. The clean apps have no
`node_modules` or manually populated `public/compatibility` directory. No npm or
Tailwind command ran in either app. Host resource fixtures are autoloaded as test
content; no package asset or view was manually copied. Composer's source symlink
is a development installation, not a published Packagist release.

[Installation evidence](milestone5/installation.json) records dependency
versions, repositories, absence of npm/manual asset directories, and SHA-256
checks proving published assets match the shipped package artifacts.

## Browser checks and commands

```sh
python3 tests/Compatibility/install.py /tmp/daisy-filament-milestone5 \
    --composer 'php /tmp/daisy-composer.phar'
# Start the two servers as described in tests/Compatibility/README.md.
node tests/Compatibility/switcher.mjs
node tests/Compatibility/state.mjs
node tests/Compatibility/state-paint.mjs
vendor/bin/pest
vendor/bin/pint --test
npm run check:js
npm run check:themes
php /tmp/daisy-composer.phar validate --strict
vendor/bin/phpstan analyse --no-progress
```

Chromium 145.0.7632.6 / Playwright 1.58.2, desktop 1440×1000 and mobile 390×844.
The selector suite uses actual buttons and keyboard input, checks native table
and modal styles, viewport/dropdown bounds, allowlists, refresh, pressed state,
and focus. The state suite reruns milestone 4 behavior against the public plugin:
initial login, theme changes, persistence, SPA navigation, history, modals,
login/logout, cross-panel preferences, fallbacks, OS changes, and unthemed pages.
The delayed-CSS suite inspects the first visible login/input surfaces.

Final pinned Chromium gate:

| Lane | Selector captures | State captures | First-paint scenarios | Browser errors |
| --- | --- | --- | --- | --- |
| Filament 4 / Livewire 3 | 40 passed | 94 passed | 15 passed | 0 |
| Filament 5 / Livewire 4 | 40 passed | 94 passed | 15 passed | 0 |

The selector checks also assert its native dropdown surface and choice-text
contrast. There are 298 successful screenshot captures across the three suites.

Evidence:

- [Selector results](milestone5/switcher.json)
- [State regression](milestone5/state.json)
- [First-paint results](milestone5/first-paint.json)
- [Filament 4 mobile Cupcake selector](milestone5/switcher-4-mobile-8-open-menu-cupcake.png)
- [Filament 5 mobile Dracula selector](milestone5/switcher-5-mobile-2-open-menu-dracula.png)
- [Filament 5 desktop Nord selector](milestone5/switcher-5-desktop-14-open-menu-nord.png)

Representative screenshots were inspected visually. The native surfaces retain
milestone 4's base-100 values: Cupcake `oklch(0.97788 0.004 56.375)`, Nord
`oklch(0.95127 0.007 260.731)`, Dracula `oklch(0.28822 0.022 277.508)`.
Text samples require at least 4.5:1 contrast. This gate measures native Filament
components, not just theme attributes or a daisyUI sample button.

## Findings and corrections

- An external head bootstrap raced inline initialization when Livewire first
  entered a themed panel from a fresh unthemed page. Installed Livewire's head
  merger appends inline scripts without waiting for newly inserted external
  scripts. The resulting undefined controller and visible-frame mismatch were
  real regressions. Inlining the small compiled bootstrap restores synchronous
  initialization without hiding the page, polling, or copying a Filament view.
  Its JS file is also registered/published; runtime execution uses the inline
  copy rather than making a blocking network request.
- PHP arrow functions did not capture variables referenced only by `compact()`
  strings. Explicit view-data arrays fixed the initial render error; a package
  render-hook test now exercises this path.
- Blade component attribute strings preserved literal `@js(...)` directives.
  Interpolating the already allowlisted built-in key fixes the Alpine expression;
  the render test rejects leftover directives. Panel configuration JSON uses
  hexadecimal HTML escaping.
- Focus return uses an explicit Alpine `$refs.themeTrigger`. Calling the native
  dropdown's `getTrigger()` from an item expression bound `$el` to that item,
  returning null.
- Reopening the native dropdown before its close transition completed produced
  Alpine `isFromCancelledTransition` rejections in the first test. The browser
  driver now waits for the close transition before its next action. The
  [diagnostic](milestone5/diagnostics/cancelled-transition.json) is preserved.
  No native dropdown views, animation code, or CSS were replaced. Rapid transition
  cancellation is not claimed as fixed by this package.

## Verification limits and next milestone

Pest: 9 tests / 28 assertions passed. Pint, Composer validation, compiled-JS
consistency, and compiled-theme consistency passed. PHPStan still cannot start
because the pre-existing configuration contains unsupported
`checkOctaneCompatibility` and `checkModelProperties` parameters.

No additional themes were added. Firefox/WebKit, the broader dependency range,
CI release lanes, and a distribution-archive install remain milestone 6 work.
Stock Filament CSS was used in the clean apps; custom-theme investigation from
milestone 1 is retained, not represented as a new full-matrix rerun here.
The internal Alpine appearance bridge and unrelated-layout navigation boundary
remain documented in [milestone 4 findings](milestone4-findings.md).

The implementation follows Filament's
[panel-plugin API](https://filamentphp.com/docs/5.x/plugins/panel-plugins) and
[asset registration workflow](https://filamentphp.com/docs/5.x/advanced/assets),
verified against both installed versions. Milestone 6 has not started.
