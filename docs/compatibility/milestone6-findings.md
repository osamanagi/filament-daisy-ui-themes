# Milestone 6: Release verification

## Status and scope

Verification is in progress. The remote CI gate is **not yet passed**. This
milestone adds release automation and tests the three existing themes; it does
not expand theme coverage or begin milestone 7.

## Installed versions and distribution

| Fixture | Filament | Livewire | Laravel |
| --- | --- | --- | --- |
| Filament 4 | 4.14.0 | 3.8.9 | 12.69.2 |
| Filament 5 | 5.9.0 | 4.4.6 | 12.69.2 |

At verification, the newest stable Filament 4/5 releases equal these declared
minimums. The automated latest lane resolves again on each run. Both fixtures
use identical compiled daisyUI **5.7.46** assets. Browser tooling is Playwright
**1.58.2**: Chromium **145.0.7632.6**, Firefox **146.0.1**, WebKit **26.0**.
Custom host CSS is built separately with Tailwind **4.1.0** and **4.3.3**.
Local PHP is **8.4.8**; the installed PHP 8.3 binary also runs package tests.

Both `/tmp/daisy-filament-milestone6/filament{4,5}` applications install a
Composer ZIP, without source symlinks, dependency metadata overrides, or npm
installation. `filament:assets` publishes the package assets. Fixture resources
are host test content, separately autoloaded from `tests/Compatibility`.
[Installation evidence](milestone6/install-evidence.json) records versions,
archive size/hash, and byte comparisons against the package runtime.

The original Composer archive included development dependencies (62 MB and
22,407 entries). Explicit archive exclusions now produce 32 entries, about
19 KB compressed, retaining source, views, translations, compiled assets, and
license attribution. `check-archive.py` checks runtime bytes and exclusions.

## Failures investigated and changes

- **First SPA entry could precede CSS arrival.** WebKit entering a themed panel
  from a fresh native baseline exposed an unthemed table before external CSS
  loaded. A `data-theme` attribute alone did not establish correct rendering.
  The plugin now emits its existing compiled theme CSS followed by adapter CSS
  synchronously at `STYLES_AFTER`. The compiled JS already uses the same inline
  approach. No CSS rules, Filament views, or version-specific adapter branches
  were added. This costs inline asset bytes per response and requires CSP
  accommodation; it removes the extra asset fetch from the first-entry path.
- **Cross-engine color serialization differed.** WebKit serializes an OKLCH hue
  as `260.730988` where Chromium reports `260.731`. Expected color strings are
  now normalized by the same engine. Native surface RGB and contrast assertions
  remain unchanged.
- **Settled captures could sample native transitions.** Component measurements
  now await finite animations. First-paint checks still sample visible frames
  without this wait. The harness also waits for modal closure before navigating
  away; previously the unthemed baseline could emit Livewire teardown errors.
- **Static analysis configuration was incomplete.** Loading the installed
  Larastan extension makes the existing options valid. The current-panel plugin
  getter now checks its returned instance, resolving the actual return-type
  finding without suppressing it.

Initial failures and incomplete diagnostic runs remain under
`milestone6/stock/`, `milestone6/retests/`, and `milestone6/diagnostics/`.
They are not passing certification evidence.

## Automated coverage

Pest verifies plugin registration, isolated panel options, invalid allowlists
and defaults, asset registration, native switcher removal, encoded panel state,
selector output, synchronous compiled CSS, and absence of hooks on unconfigured
panels. Stored-value fallback is client behavior and is tested in browsers.

Each browser/CSS lane covers both Filament majors at desktop 1440×1000 and
mobile 390×844, with Cupcake, Nord, and Dracula:

- Delayed-CSS first paint, invalid/removed preferences, native light/dark/system.
- Keyboard selection, focus, pressed state, refresh, and mobile positioning.
- Livewire navigation, history, light/dark transitions, OS changes, logout,
  independent panels, public-page isolation, and fresh entry from a native panel.
- Native tables, forms, validation, controls, uploads, pagination, filtering,
  selection, notifications, tooltips, dropdowns, and body-teleported modals.

Reports include computed surfaces, foreground/background contrast, palette
values, appearance state, browser errors, and screenshot paths. Custom CSS lanes
also assert the host's 72px topbar survives while the plugin palette takes
precedence. Screenshots supplement these checks; they are not pixel-baseline
certification or a complete accessibility audit.

## Commands and reproducibility

See [fixture instructions](../../tests/Compatibility/README.md) for archive
installation, browser tooling, servers, and custom CSS builds. Principal checks:

```sh
vendor/bin/pest
vendor/bin/pint --test
vendor/bin/phpstan analyse --no-progress
npm run check:js
npm run check:themes
composer validate --strict
composer archive --format=zip --dir=/tmp/daisy-dist --file=themes
python3 tests/Compatibility/check-archive.py /tmp/daisy-dist/themes.zip
node tests/Compatibility/release.mjs
```

The browser workflow has 18 lanes: minimum/latest dependencies × three CSS
modes × three engines. Each lane independently installs both Filament majors.
The package workflow has six lanes across PHP 8.2/Laravel 11, PHP 8.3/Laravel 12,
and PHP 8.4/Laravel 13, with each Filament major. Workflow syntax is checked with
Actionlint. Local checks do not certify unexecuted remote dependency lanes.
