# daisyUI themes for Filament

A Composer panel plugin that applies daisyUI themes to native Filament
components and adds a topbar theme selector. Every built-in daisyUI 5.7.46
theme can be enabled by name; the chosen theme controls Filament's internal
light/dark appearance and persists per panel in the browser.

## Installation

In an existing Filament application:

```sh
composer require nagi/filament-daisy-ui-themes
```

Enable the plugin in your panel provider:

```php
use Nagi\FilamentDaisyUiThemes\FilamentDaisyUiThemesPlugin;

return $panel
    // Your existing panel configuration...
    ->plugin(
        FilamentDaisyUiThemesPlugin::make()
            ->themes(['cupcake', 'nord', 'dracula'])
            ->defaultTheme('nord')
    );
```

Publish assets after installing or upgrading:

```sh
php artisan filament:assets
```

Run that command in your deployment workflow after Composer installation.
No npm installation, custom Tailwind theme, view copying, migration, or User
model changes are required for the included themes. The package ships compiled
CSS and JavaScript. During development before a published release, use a
Composer path repository pointing to this checkout and require the package
with `@dev`; the remaining installation steps are identical.

## Configuration and behavior

`themes()` sets the panel's available choices; `defaultTheme()` must belong to
that list. Defaults are all three themes and Cupcake. Empty lists, unsupported
names, and excluded defaults throw configuration errors. Configure a separate
plugin instance on each panel. Place the plugin after conflicting panel color
or appearance configuration; it owns the semantic palettes and appearance mode.

The switcher renders at the end of the topbar by default, where Filament's own
switcher would sit. Pass any render hook to move it:

```php
->themeSwitcherHook(PanelsRenderHook::SIDEBAR_FOOTER)
```

Any `Filament\View\PanelsRenderHook` case is accepted, as is a string hook name.

A panel that allows a single theme does not need the selector. Hide it with
`themeSwitcher(false)`; the theme still applies and persists:

```php
->themeSwitcher(false)
```

Hiding the switcher also makes `themeSwitcherHook()` irrelevant, so the hook
renders nothing.

The palette icon opens a native Filament dropdown. Use Enter or Space
to open it, Tab to move through choices, Enter to select, and Escape to dismiss.
Each choice previews its own colours the way daisyUI's picker does — the theme's
`base-content`, `primary`, `secondary` and `accent` on its own `base-100`, so
the menu shows what every theme looks like before you pick it. The current choice
has a check mark and an accessible pressed state. The list is capped at
`min(24rem, 60vh)` and scrolls, so a wide allowlist such as `allThemes()` stays
inside the viewport instead of running past the bottom of the screen. Login uses
the saved choice or panel default; its simple layout has no topbar selector.
Panels without a topbar likewise have no selector.

Preferences use `filament-daisy-theme:<panel-id>` in localStorage. Unknown or
removed choices fall back to the panel default. Logout preserves the preference;
it is browser-local, not an account setting. Filament's native light/dark/system
switcher is hidden, and OS preference changes do not override the chosen theme.
The native Filament `theme` preference remains untouched.

## Themes

Any of the 35 built-in daisyUI 5.7.46 themes can be enabled by name, for
example `->themes(['business', 'abyss', 'wireframe'])->defaultTheme('business')`.
`defaultTheme()` must belong to the list, and only allowlisted themes appear in
the topbar selector. A panel inlines just the themes it allows, so enabling a
few themes does not add every shipped stylesheet to its responses.

Three helpers allow whole groups at once instead of listing names:

```php
->allThemes()       // all 35 shipped themes
->allLightThemes()  // the 21 light themes
->allDarkThemes()   // the 14 dark themes
```

They replace the list set by `themes()`. If the current default is not in the
resulting list it resets to that list's first entry, so `allDarkThemes()` works
without also calling `defaultTheme()`. `cupcake` is included by `allThemes()` and
`allLightThemes()`, so the default stays; `allDarkThemes()` moves it to `abyss`.
A default you set afterwards that the list excludes still throws.

Allowing many themes inlines a stylesheet for each. The default three cost about
3 KB gzipped, while all 35 cost about 20 KB on every full page load. That is fine
for a theme gallery and noticeable on a slow connection, so allowlist what a
normal panel actually needs.

All 35 shipped themes pass the milestone 7 audit: native tables and forms on
both Filament majors in Chromium, Firefox, and WebKit — 210 engine runs, none
below 4.5:1. The build clamps generated muted-text stops and the primary button
pair to a contrast target above 4.5:1, using shared mappings rather than
per-theme exceptions. Cupcake, Nord, and Dracula have deeper certification: they
also pass the component matrix, which adds stock and custom Tailwind CSS, the
state and first-paint suites, and the navigation and isolation checks. See the
milestone 7 findings for the exact scope.

A theme is colour only. Buttons, inputs, panels, badges, and checkboxes keep
Filament's own border radii and do not follow each daisyUI theme's `--radius-*`
tokens, so switching themes never changes component shape.

Surfaces follow daisyUI's own elevation. The page uses `base-200`; cards,
tables, forms, modals, dropdowns and the topbar use `base-100`, so a panel is
always one step above the background instead of Filament's untinted white. That
matters most on the tinted themes — Retro's `base-100` sits 0.084 lightness below
white, so a white card reads as a different theme entirely. Ten light themes
(Bumblebee, CMYK, Corporate, Emerald, Fantasy, Light, LoFi, Pastel, Winter and
Wireframe) have a `base-100` that is already pure white and look unchanged.
Input wrappers sit on `base-200` so they stay distinguishable from the card
beneath them. Dark themes need no adapter rules at all, because Filament's own
dark styles already resolve through the generated ramp, where `--gray-900` is
`base-100`.

daisyUI 5.7.46 ships these 35 themes. Classification comes from each theme's own
`color-scheme` token, not from its name:

- **Light (21):** acid, autumn, bumblebee, caramellatte, cmyk, corporate,
  cupcake, cyberpunk, emerald, fantasy, garden, lemonade, light, lofi, nord,
  pastel, retro, silk, valentine, winter, wireframe
- **Dark (14):** abyss, aqua, black, business, coffee, dark, dim, dracula,
  forest, halloween, luxury, night, sunset, synthwave

## Compatibility and limits

Composer accepts Filament `^4.14 || ^5.9`. Verified development versions are:

| Filament | Livewire | Laravel |
| --- | --- | --- |
| 4.14.0 | 3.8.9 | 12.69.2 |
| 5.9.0 | 4.4.6 | 12.69.2 |

The shared assets use daisyUI 5.7.46. Custom Filament CSS should use Tailwind
4.1+; optional custom CSS can override the adapter, so verify your own changes.
The release workflow tests both dependency lanes in Chromium, Firefox, and
WebKit with stock CSS and custom Tailwind themes. See the milestone 6 findings
for executed checks and remaining certification work.

Core assets contain theme tokens and the native Filament adapter, not daisyUI
component styles or resets. Adding `btn` or other daisyUI classes to custom
markup requires your own separate component CSS.

The plugin uses an isolated bridge to Filament's Alpine `theme` store. A small
observer corrects native bootstrap changes to the root `.dark` class before
paint while a plugin panel is active. All
plugin panels share the native system default so their SPA head scripts match;
the selected daisyUI theme sets the actual mode. Use full page navigation across
unrelated layouts or panels with different native initialization. Enabled panels
load the styles; public pages and other panels do not receive global asset tags.

Compiled CSS and the small JavaScript bootstrap are rendered inline through
panel hooks. This prevents first-entry Livewire navigation from displaying a
new panel before external assets arrive. CSS follows the host Filament theme;
the adapter controls semantic palettes while unrelated host customizations
remain effective. This adds the compiled asset bytes to each panel response.
Strict CSP policies must accommodate inline styles/scripts and Filament/Alpine
itself; strict-CSP operation is not certified.

## Development and verification

```sh
composer verify        # workflow lint, lint, static analysis, tests, assets, archive
composer verify -- --browser   # additionally run the local browser suites
composer test
composer test:lint
composer analyse
npm ci
npm run build
npm run check:js
npm run build:themes
npm run check:themes
node bin/audit-themes.mjs
```

`composer verify` is the local equivalent of the automatic `tests` workflow.

`npm` is needed to rebuild assets only. Commit `resources/dist/` with source
changes. `bin/audit-themes.mjs` statically checks daisyUI's own semantic colour
pairs for every theme. See [fixture instructions](tests/Compatibility/README.md)
for clean Composer installs, the manifest-driven
[browser theme audit](tests/Compatibility/theme-audit.mjs), screenshots, and
exact dependency pins. Browser suites run on pull requests and default-branch
pushes; they can also be run locally against the disposable fixtures.
[Compatibility findings](docs/compatibility/milestone6-findings.md) record the
release matrix and gate status; the
[milestone 7 findings](docs/compatibility/milestone7-findings.md) record the
expanded theme coverage and its verification scope.

## License and contributing

MIT; see [LICENSE.md](LICENSE.md). The distributed daisyUI theme data includes
its [MIT attribution](resources/dist/DAISYUI-LICENSE.txt).
See [contributing guidelines](.github/CONTRIBUTING.md) and the
[security policy](.github/SECURITY.md).
