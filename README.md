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

The topbar palette icon opens a native Filament dropdown. Use Enter or Space
to open it, Tab to move through choices, Enter to select, and Escape to dismiss.
The current choice has a check mark and an accessible pressed state. Login uses
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

All 35 themes passed the milestone 7 Chromium verification of native tables and
forms on both Filament majors. The build clamps generated muted-text stops and
the primary button pair to a contrast target above 4.5:1, using shared mappings
rather than per-theme exceptions. Cupcake, Nord, and Dracula have deeper
certification: they also pass the full release matrix in Chromium, Firefox, and
WebKit with stock and custom Tailwind CSS, plus the state and first-paint
suites. See the milestone 7 findings for the exact scope and remaining work.

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
composer verify        # lint, static analysis, tests, assets, archive
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
