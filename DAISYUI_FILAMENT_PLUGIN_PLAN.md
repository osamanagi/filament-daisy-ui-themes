# daisyUI Themes for Filament: Implementation Plan

## Goal

Build a Filament panel plugin that lets each panel user choose a daisyUI theme
from a topbar selector. The chosen theme must produce a coherent appearance
across native Filament components, including tables, forms, navigation, modals,
notifications, and authentication pages.

Target both compatibility lines:

- Filament 4 with its compatible Livewire 3 version.
- Filament 5 with Livewire 4.
- Tailwind CSS 4.1+ for both.
- One pinned daisyUI 5 version shared by both development fixtures.

Pin exact development versions in the test application and record them here.
Use compatible Composer constraints for the released package only after testing.

The deliverable remains a Laravel Composer package, enabled per panel through
`FilamentDaisyUiThemesPlugin::make()`. Disposable host applications are test
infrastructure outside this repository, not part of the package deliverable.

## Milestone status and tested versions

Milestone 1 investigation: see [compatibility findings](docs/compatibility-findings.md)
for browser evidence, failures, and the narrowly scoped gate result. Milestone 2
expands the external fixtures; see [visual findings](docs/compatibility/milestone2-findings.md).
Milestone 2's pinned Chromium desktop/mobile gate passed after the shared
palette, surface, and upload-state corrections: 20 cases, 392 captures, no
recorded failures or browser errors. This is not a release-wide compatibility claim.
Milestone 3's adapter gate passed for the same pinned matrix; see
[adapter findings](docs/compatibility/milestone3-findings.md). Generated assets,
PHP-readable palettes, and radius mappings are verified in both fixtures.
Milestone 4's pinned Chromium state gate passed: 188 desktop/mobile state
captures and 30 delayed-CSS first-paint scenarios across both fixtures. See
[state findings](docs/compatibility/milestone4-findings.md) for per-panel storage,
allowlist fallback, isolated Alpine synchronization, and the cross-panel SPA
head-script fix. Milestone 5's pinned clean-install and selector gate passed; see
[package findings](docs/compatibility/milestone5-findings.md). The public plugin,
native selector, compiled assets, and Composer installs were checked in both
versions. Milestones 6–7 have not started.

| Separate fixture | Filament | Livewire | Laravel | Tailwind | daisyUI |
| --- | --- | --- | --- | --- | --- |
| `filament4` | 4.14.0 | 3.8.9 | 12.69.2 | 4.1.18 | 5.7.46 |
| `filament5` | 5.9.0 | 4.4.6 | 12.69.2 | 4.1.18 | 5.7.46 |

Tests use PHP 8.4.8 and Chromium 145.0.7632.6 (Playwright 1.58.2).
The full installed dependency inventory is in
[`docs/compatibility/versions.json`](docs/compatibility/versions.json).
Reproduction instructions: [`tests/Compatibility/README.md`](tests/Compatibility/README.md).
These pins establish a baseline, not support for every minor release.

## Product rules

1. daisyUI themes are the only user-facing appearance choices.
2. Hide Filament's light/dark/system switcher.
3. A selected daisyUI theme determines whether Filament renders its light or
   dark component styles internally.
4. Do not allow the operating system's color preference to override an
   explicit theme selection.
5. Theme changes must apply immediately and persist across refreshes and
   Livewire navigation.
6. A first-time visitor and the login page must have a coherent default theme.
7. The plugin must style native Filament UI, not merely elements that happen to
   use daisyUI classes.
8. A clean host application should not need to install daisyUI through npm
   just to use the themes shipped by this plugin.
9. Themes configured for one Filament panel must not change another panel or
   the application's public website.
10. Do not promise support for every daisyUI theme until every shipped theme
    has passed the acceptance matrix.

## The critical compatibility problem

daisyUI and Filament do not share a complete theme system.

daisyUI chooses a theme using `data-theme` and provides semantic variables
such as `--color-base-100`, `--color-base-content`, and `--color-primary`.

Filament renders its own components and uses its own palettes, surfaces, and
light/dark styling. Its dark styles can depend on `.dark`.

Therefore:

- Setting `data-theme="dracula"` alone does not fully theme Filament.
- Hiding Filament's switcher alone does not disable its internal mode styling.
- Mapping only daisyUI's `primary` color is not enough.
- Loading all daisyUI component CSS may cause conflicts with Filament.
- The implementation must test color contrast and component states.

Treat the selected daisyUI theme as the source of truth. An explicit, tested
per-theme appearance classification controls Filament's internal dark styling.
Do not classify a theme as dark merely because its name sounds dark. Inspect
the pinned theme definition and test its rendered result.

Do not call `->darkMode(false)` as a shortcut unless a prototype proves that
dark daisyUI themes still render all Filament components correctly. The intended
configuration hides Filament's switcher while retaining the internal styling
needed by dark themes.

## Starting repository

Use the new Filament plugin template repository supplied by the maintainer.

Inspected starting commit: `4c1435babb57e8329be4be1a7bc2f0031458d8f0`.
The template has a `Plugin` implementation, package service provider, Pest /
Testbench scaffolding, and a JavaScript-only esbuild pipeline. It had no runnable
example app or configured workbench. The existing two tests passed but did not
exercise theming. CSS/JS asset registration was commented out.

Before changing its structure:

1. Read its README, Composer constraints, test setup, asset build pipeline,
   service provider, and plugin class.
2. Identify what the template already supplies.
3. Keep its conventions unless a concrete requirement makes a change necessary.
4. Record the template version and starting commit in this document.

Maintain two separate disposable host applications outside the repository.
Keep only their reproducible setup, native component fixtures, and compatibility
probe in `tests/Compatibility/`. Install this package as a Composer dependency
and exercise Filament's asset publication. Do not add an application bootstrap,
database, host dependencies, or host vendor directory to the package itself.

Milestones 1–4 kept the root Composer requirement at `^5.0` and used a
fixture-only metadata override for Filament 4. Milestone 5 replaces that override
with real package constraints `^4.14 || ^5.9`, using the tested versions as floors.
Both new applications install through normal Composer path repositories without
metadata overrides. Wider dependency/browser certification remains milestone 6.

## Agent reference material

The development environment may have:

- daisyUI MCP configured for Codex.
- daisyUI's Codex skill or equivalent documentation support.
- Official Filament documentation.

Use those tools to find current APIs and theme definitions. The pinned
installed packages and actual browser output remain the authority for
implementation details.

Keep credentials for any MCP service outside the repository. Do not commit
tokens or personal configuration.

Relevant documentation:

- Filament styling:
  https://filamentphp.com/docs/5.x/styling/overview
- Filament colors:
  https://filamentphp.com/docs/5.x/styling/colors
- Filament render hooks:
  https://filamentphp.com/docs/5.x/advanced/render-hooks
- Filament assets:
  https://filamentphp.com/docs/5.x/advanced/assets
- Filament plugin development:
  https://filamentphp.com/docs/5.x/plugins/build-a-panel-plugin
- daisyUI themes:
  https://daisyui.com/docs/themes/
- daisyUI configuration:
  https://daisyui.com/docs/config/
- daisyUI theme variables:
  https://daisyui.com/docs/utilities/
- daisyUI MCP for Codex:
  https://daisyui.com/docs/mcp/codex/
- daisyUI skill for Codex:
  https://daisyui.com/docs/skill/codex/
- Livewire navigation:
  https://livewire.laravel.com/docs/4.x/navigate

Check these against the installed versions before copying example code.

## Milestone 1: Compatibility investigation

Do not begin with the finished plugin.

Set up the two isolated hosts listed above, with the same pinned daisyUI version.
Render native resource tables, forms, navigation, topbar, action modals, a
body-teleported modal, and login in each. Hard-code Cupcake, then Dracula; no
user-facing theme selector. Test both stock Filament CSS and separately compiled
Tailwind 4.1+ host custom themes. Keep prototype integration in the test harness.

Investigate and document:

- How Filament initializes and stores light/dark mode.
- Which DOM element receives `.dark`.
- Whether Filament changes that class on navigation or when its boot script runs.
- Where its color variables are emitted and whether a later stylesheet can
  override them reliably.
- Which components consume variables versus compiled color declarations.
- Whether daisyUI theme CSS changes browser `color-scheme`.
- CSS cascade order when plugin assets and a host custom theme are both present.
- Whether `.dark` and `data-theme` can be synchronized before first paint.
- Whether a Livewire navigation can overwrite the chosen attributes.
- Whether overlays or portals render outside a scoped panel container.
- Whether daisyUI resets or component selectors affect Filament.

Create a brief `docs/compatibility-findings.md` with screenshots and concrete
observations. Do not treat assumptions as findings.

### Gate

Proceed only when Cupcake and Dracula each render tables, forms, navigation,
modals, and login coherently in BOTH Filament 4 / Livewire 3 and Filament 5 /
Livewire 4, including after actual Livewire navigation. Require screenshots,
computed native surface colors, foreground contrast, and first-paint evidence.
`data-theme` changes alone do not pass this gate. Mark visual behavior unverified
if a real browser cannot run.

If this cannot be achieved through supported Filament extension points and
manageable CSS, report the blocker before building a switcher.

The tested prototype shares its palette data, small CSS-hook adapter, and
render-hook synchronization across both versions. No version-specific behavior
or copied Filament views was needed. Keep the failures and limitations in the
findings: head-only initialization loses attributes during navigation, generated
button palettes can fail contrast, and the global Filament `theme` storage key
is unsuitable as the final per-panel preference store.

## Milestone 2: Build the visual test application

Expand both disposable fixtures with realistic examples covering:

- Dashboard, sidebar, and topbar.
- Resource table, filters, search, pagination, selection, and empty state.
- Create and edit forms.
- Text input, textarea, select, checkbox, radio, toggle, date picker,
  file upload, and validation errors.
- Infolist, badges, and status colors.
- Action and confirmation modals.
- Dropdowns, tooltips, and notifications.
- Login, registration if enabled, and password reset if enabled.
- Loading, disabled, hover, focus, and error states.
- One custom element using daisyUI classes.
- Desktop and narrow mobile layouts.

Start with three themes whose differences reveal failures:

- Cupcake: light.
- Nord: inspect its actual pinned theme definition and classify accordingly.
- Dracula: dark.

Do not assume the classification of Nord from its name.

Capture baseline screenshots of Filament without the plugin and screenshots
after applying each theme.

### Gate

The two light/dark extremes and the third distinct theme must look coherent
on the full test application before packaging the integration.

Passed for Cupcake, Nord (light), and Dracula on both pinned Filament fixtures
at desktop and narrow mobile sizes. The findings preserve the initial failures,
corrected computed styles, and screenshots. Milestone 3 follows this completed milestone 2 work; its result is recorded below.

## Milestone 3: Define the theme adapter

Use the pinned daisyUI theme definitions as input. Produce the CSS variables
and any build-time data needed by the plugin.

Map semantic daisyUI tokens to Filament needs:

| daisyUI token | Intended Filament role |
| --- | --- |
| `base-100` | Main page surface |
| `base-200` | Raised or secondary surface |
| `base-300` | Borders or stronger separation |
| `base-content` | Primary text |
| `primary` / `primary-content` | Primary action and readable foreground |
| `info`, `success`, `warning`, `error` | Status colors |
| Radius tokens | Applicable controls and surfaces |

This table is a starting hypothesis. Verify each mapping in the browser.

Filament's color API uses shade palettes and can select shades for contrast.
daisyUI's semantic colors do not supply an equivalent 50–950 palette. Choose
and document a build-time strategy to generate or explicitly ship appropriate
Filament palettes. Validate foreground and background pairs.

Prefer shared mappings over per-theme CSS exceptions. Add an exception only
when a named theme demonstrates a specific failure. Document every exception
and retain a screenshot that demonstrates why it exists.

Investigate whether loading daisyUI theme definitions without its full set of
components and base resets is possible with the pinned version. Include only
the styles that the plugin actually requires. If the package offers optional
daisyUI component CSS for application authors, keep that separate from the
core Filament adapter and test its collision behavior.

### Gate

Switching the three themes changes native Filament page surfaces, text, input
surfaces, buttons, badges, modal surfaces, borders, and navigation consistently.

Passed on the pinned Filament 4/5 desktop/mobile matrix: 392 full-fixture
captures plus 100 focused adapter captures. The latter verify native styles
while changing adapter inputs on an existing DOM, generated CSS/JSON palette
agreement, radius roles, and isolation from optional badge CSS. Cross-panel SPA
state remains a milestone 4 concern; the findings retain the observed
`loadDarkMode` redeclaration diagnostic, subsequently resolved for the tested
shared-default panels in milestone 4.

## Milestone 4: Theme state and dark-style synchronization

Implement one allowlisted theme key as the source of truth.

For every selected theme, set:

1. Its daisyUI `data-theme` value.
2. Its corresponding Filament internal light/dark state.
3. Any browser color-scheme behavior required for native controls.

Check the selected theme against the panel's allowed list before using it.
Fall back to the panel default for unknown or removed values.

Apply initial state before the first visible paint. Confirm it remains correct
after:

- Full refresh.
- Livewire navigation.
- Browser back/forward.
- Modal opening and closing.
- Login and logout.
- Switching panels.
- Changing the operating system preference.

A client-side storage key is acceptable for the first version. Namespace it
per panel. Avoid introducing a database migration or modifying the host User
model unless cross-device persistence becomes an explicit requirement.

Do not depend on undocumented Filament JavaScript globals if a supported hook
or stable DOM behavior will do. If integrating with an internal behavior is
unavoidable, isolate it, document it, and add a regression test.

### Gate

For each test theme, inspect the DOM and computed styles. The selected theme,
Filament internal appearance, and rendered controls must agree at initial
paint and after navigation.

Passed for Cupcake, Nord, and Dracula on Filament 4.14.0 / Livewire 3.8.9 and
Filament 5.9.0 / Livewire 4.4.6, at desktop and mobile sizes. Each version passes
94 state captures plus 15 delayed-CSS first-paint scenarios, with no recorded
browser errors or visible-frame theme/class mismatches. Per-panel preferences,
unknown/removed fallbacks, refresh, SPA navigation, back/forward, modals,
login/logout, OS changes, and unthemed boundaries are covered. The native
Filament storage key stays unchanged. The internal Alpine `theme` store bridge
is isolated and regression-tested. No new CSS overrides or copied views.

All tested themed panels share the native system default to keep Filament's
head initialization identical; selected themes determine actual appearance.
Full document navigation remains the boundary for unrelated application layouts.
See the findings for the precise scope and the pre-existing PHPStan config blocker.
Milestone 5 follows this completed state milestone.

## Milestone 5: Extract a Filament plugin

Package the tested implementation using the template repository.

Public API, using the template plugin class name:

```php
$panel
    ->plugin(
        \Nagi\FilamentDaisyUiThemes\FilamentDaisyUiThemesPlugin::make()
            ->themes(['cupcake', 'nord', 'dracula'])
            ->defaultTheme('nord')
    );
```

The package should:

- Register compiled, versioned CSS and small JavaScript assets.
- Hide Filament's light/dark/system switcher for its panel.
- Add a keyboard-accessible theme dropdown to a supported topbar render hook.
- Render only themes included in the panel's allowlist.
- Provide understandable errors for invalid package configuration.
- Preserve panel-specific settings when several panels exist.
- Avoid imposing theme styles on public-facing pages.
- Provide an explicit installation step for publishing Filament assets where
  the host's deployment workflow requires it.

Use existing Filament dropdown and button components for the switcher where
possible. Do not build an additional frontend framework for this UI.

Do not add user-model traits, databases, theme-driver abstractions, or a
runtime theme editor in this milestone.

### Gate

Install the plugin into a fresh, separate Filament app using only the
documented installation steps. The switcher and all packaged styles must work
without copying files manually from the plugin development repository.

Passed in two fresh applications under `/tmp/daisy-filament-milestone5`, using
real Composer package metadata and `php artisan filament:assets`, without npm
or manually copied plugin files. Filament 4.14.0 / Livewire 3.8.9 and Filament
5.9.0 / Livewire 4.4.6 each pass 40 selector captures, 94 state captures, and
15 first-paint scenarios. Native menu surfaces/contrast, keyboard operation,
focus return, mobile bounds, allowlists, and per-panel persistence are verified.
No browser errors were recorded in the final runs.

The compiled bootstrap stays inline because external-script loading raced
Livewire's first entry from an unthemed panel. The findings document this,
asset publication, the tested dependency floors, and remaining limitations.
Package tests pass (9 tests / 28 assertions), as do Pint, Composer validation,
and both compiled-asset checks. The existing PHPStan configuration blocker
remains. This milestone 5 result is not the complete release matrix; see
milestone 6 below for the follow-up verification.


## Milestone 6: Automated and browser verification

**In progress.** Release workflows and archive-installed fixtures are implemented.
The shared adapter remains unchanged; compiled CSS now renders synchronously
through the configured panel hook to prevent a first-entry Livewire CSS race.
See [milestone 6 findings](docs/compatibility/milestone6-findings.md) for executed
checks, failures, evidence, and the pending CI gate. Do not start milestone 7
until the full gate passes.

Use Pest for package behavior that can be verified without a browser:

- Plugin registration and per-panel configuration.
- Theme allowlist and default validation.
- Unknown or removed stored theme fallback (browser assertion; storage is client-side).
- Switcher availability and Filament switcher removal.
- Asset registration.
- Persistence-key separation between panels.
- Output encoding of configured theme names.
- No application-wide theme injection outside the configured panel.

Use browser tests for behavior that PHP tests cannot establish:

- First paint has the intended theme without a visible flash.
- Switching themes works without a full refresh.
- Refresh, Livewire navigation, and back/forward keep the selection.
- Switching a dark theme to a light theme removes the prior dark styling.
- Switching a light theme to a dark theme applies every required dark style.
- OS theme changes do not override a manually selected daisyUI theme.
- Modals, dropdowns, notifications, and login use the selected appearance.
- Keyboard navigation and focus states remain usable.
- Mobile dropdown positioning and panel layout remain usable.

Take visual snapshots of the test application for every shipped theme.
Use automated contrast checks on representative foreground/background pairs,
then visually inspect components the checker cannot judge reliably.
Do not approve a theme solely because a screenshot test passes.

Test at least one host application with its own Filament custom theme so
asset order and overrides are understood and documented.

### Release test matrix

| Required lane | Dependencies | Required coverage |
| --- | --- | --- |
| Filament 4 | Supported minimum and newest supported 4.x; compatible Livewire 3; compatible PHP/Laravel | Package tests, clean Composer install, published assets, full visual/navigation matrix |
| Filament 5 | Supported minimum and newest supported 5.x; Livewire 4; compatible PHP/Laravel | Same checks, independently installed dependencies |
| CSS integration, both lanes | Stock Filament CSS and a host custom theme using the supported Tailwind 4.1+ floor and newest supported version | Asset order, palette overrides, native components, overlays, host customizations |
| Theme/browser matrix, both lanes | Identical pinned daisyUI; every shipped theme; Chromium, Firefox, WebKit | Desktop/mobile, contrast, keyboard states, first paint, refresh, navigation and back/forward |
| Isolation, both lanes | Multiple panels plus a public page | Allowlist/defaults, namespaced persistence, no leaked assets or dark state |

Milestone 1 only establishes the exact pinned Chromium desktop baseline above.
Do not advertise the broader release matrix as passed. Rebuild the same daisyUI
assets for both lanes whenever its pin changes. Consumers must be able to use
included themes from published compiled assets without installing daisyUI/npm.

### Gate

CI passes, the clean application works using documented steps, and every
shipped theme passes the visual checklist.

## Milestone 7: Expand daisyUI theme coverage

Only after Milestones 1–6 pass:

1. Record the pinned daisyUI version and its built-in theme names.
2. Add themes through the established build process.
3. Determine each theme's light/dark classification from its actual definition
   and verify the rendered output.
4. Run browser checks and visual snapshots for each proposed theme.
5. Record any theme-specific exceptions.
6. Ship only themes that pass the checks.
7. State the exact shipped theme list in the README.

Do not silently substitute colors or advertise a theme that only changes
the primary button.

When upgrading daisyUI, regenerate packaged assets and rerun the full matrix.
When upgrading Filament, inspect changes to its theme variables, component
markup, dark-mode behavior, and asset loading before changing the supported
Composer version range.

## Release requirements

Before the first release, deliver:

- Working Composer package.
- Clean installation example.
- Pinned development dependencies and appropriate release constraints.
- Documented configuration with a minimal copyable example.
- Exact list of supported daisyUI themes.
- Explanation of interaction with host Filament custom themes.
- Tests and CI instructions.
- Browser comparison screenshots.
- Accessibility and contrast findings.
- Asset build and release procedure.
- daisyUI license and attribution requirements checked against the pinned
  distributed assets.
- A known-limitations section based on observed behavior.

Do not describe the package as a complete daisyUI-to-Filament integration if
its support is limited to palettes.

## Working instructions for Codex

Work through the milestones in order. After each gate:

1. Summarize what was implemented.
2. Show the test command and result.
3. Show relevant screenshots or measured browser findings.
4. List remaining failures.
5. Update this plan with any verified change in approach.

When a gate fails, investigate the root cause before adding overrides.
Do not produce the entire plugin in one pass. Do not replace Filament views
unless the compatibility investigation demonstrates a compelling need and the
maintenance cost is documented.

Prioritize correctness and maintainability over theme count or release speed.
