# Compatibility fixtures

This directory supplies native Filament resources and browser checks for the
Composer plugin. Applications, databases, and host dependencies stay outside
this repository. `FixtureProvider` now uses the public plugin API; the milestone
1–4 `ProbePlugin` and duplicate state controller were removed during extraction.

## Clean installation gate (milestone 5)

Requirements: PHP 8.4 with Laravel/Filament extensions, Composer 2, Python 3.
From the repository root, choose a new directory:

```sh
python3 tests/Compatibility/install.py /tmp/daisy-filament-milestone5
# Alternative Composer executable:
# ... --composer 'php /path/to/composer.phar'
```

This installs Laravel 12.69.2 with Filament 4.14.0 / Livewire 3.8.9 and Filament
5.9.0 / Livewire 4.4.6. Both resolve the real package metadata using a Composer
path repository. There is no Filament 4 metadata override, npm installation,
CSS compilation, or manual copying of plugin assets into either app. The only
publication command is `php artisan filament:assets`. Source changes are shared
through Composer's development symlink; republish when compiled CSS changes.

The fixture resource classes are host test content, autoloaded separately from
`tests/Compatibility`. The package runtime does not import them.

Start the two servers in separate terminals:

```sh
cd /tmp/daisy-filament-milestone5/filament4
php artisan serve --host=127.0.0.1 --port=8104
```

```sh
cd /tmp/daisy-filament-milestone5/filament5
php artisan serve --host=127.0.0.1 --port=8105
```

Visit `/cupcake/login`, `/nord/login`, or `/dracula/login`; each allows all three
themes and has the named default. `/restricted` allows only Nord. `/allthemes`
allowlists every shipped theme. `/baseline` is native Filament without the
plugin; `/compatibility-public` is a plain page.
Login: `tester@example.test` / `fixture-password`. Keep servers on localhost.

## Browser checks

Playwright belongs to the test tooling, not the consuming apps. The earlier
fixture setup already installed it in `/tmp/daisy-filament-milestone1`.
Alternatively, install separate browser tooling:

```sh
npm install --prefix /tmp/daisy-browser-tools playwright@1.58.2
/tmp/daisy-browser-tools/node_modules/.bin/playwright install chromium
export PLAYWRIGHT_DIR=/tmp/daisy-browser-tools
```

Run from the repository root, sequentially because authentication rate limits
are shared within each fixture:

```sh
node tests/Compatibility/switcher.mjs
node tests/Compatibility/state.mjs
node tests/Compatibility/state-paint.mjs
```

Defaults: host directory `/tmp/daisy-filament-milestone5`, ports 8104/8105,
reports/screenshots `docs/compatibility/milestone5/`. Set `COMPAT_FIXTURES` for
another host directory. `M5_FILTER=4-desktop` filters the selector suite;
`M4_FILTER=5-mobile` filters the state suite. The latter preserves its old filter
name for convenience. `COMPAT_OUTPUT` overrides the state/first-paint report path.

The selector suite uses real buttons, keyboard navigation, focus checks, and
native tables/modals. The state suite also calls the package controller directly
for login and invalid-value scenarios; those calls are test inputs, not a second
user-facing selector. The first-paint suite delays CSS and records visible frames.

## Earlier investigations and asset development

[Milestone 1](../../docs/compatibility-findings.md),
[milestone 2](../../docs/compatibility/milestone2-findings.md),
[milestone 3](../../docs/compatibility/milestone3-findings.md), and
[milestone 4](../../docs/compatibility/milestone4-findings.md) retain historical
reports and screenshots. Their prototype-specific scripts and assumptions are
historical, not the current installation gate.

`setup.py` / `build.mjs` remain development utilities for the external npm/Tailwind
fixture pipeline. New setups use the real Composer constraint for both versions.
Use the root `npm run build`, `npm run check:js`, `npm run build:themes`, and
`npm run check:themes` commands to rebuild or verify package artifacts. The
clean-install script never invokes those commands.

## Release matrix (milestone 6)

Test a real distribution, without a source symlink:

```sh
composer archive --format=zip --dir=/tmp/daisy-dist --file=themes
python3 tests/Compatibility/check-archive.py /tmp/daisy-dist/themes.zip
python3 tests/Compatibility/install.py /tmp/daisy-filament-milestone6 \
  --archive /tmp/daisy-dist/themes.zip
# Add --latest to resolve the newest supported Filament/Livewire versions.
```

Start those apps on the same ports as above. Set
`PHP_CLI_SERVER_WORKERS=4` before `php artisan serve --no-reload` when running
multiple browsers locally. These fixtures use database cache so concurrent
limiter resets do not race over deleted file-cache directories. Install all engines with `playwright install
chromium firefox webkit`, then run:

```sh
COMPAT_OUTPUT=docs/compatibility/milestone6/stock \
  node tests/Compatibility/release.mjs
```

The runner defaults to the milestone 6 apps and executes first-paint, selector,
state/navigation, and full native-component suites for all three browsers.
`COMPAT_BROWSERS=webkit` or `COMPAT_SUITES=state,visual` narrows a diagnostic run.
Reports retain computed styles, contrast measurements, screenshots, and errors.
First-paint checks sample visible frames; settled component checks wait for
finite native transitions to finish before comparing colors.

For custom host CSS, build outside the package asset pipeline:

```sh
npm install --prefix /tmp/daisy-tailwind tailwindcss@4.1.0 @tailwindcss/cli@4.1.0
TAILWIND_DIR=/tmp/daisy-tailwind node tests/Compatibility/host-theme.mjs
```

Restart both application servers with `COMPAT_HOST_THEME=1`, then run the release
runner with `COMPAT_HOST_THEME=1` and a separate `COMPAT_OUTPUT`. Repeat with
`tailwindcss@latest` / `@tailwindcss/cli@latest`. The temporary host build uses
external npm tooling and removes its resolution symlink afterward. The plugin
itself needs no npm installation. A custom 72px topbar proves that the host CSS
is active while plugin palette and overlay checks prove adapter precedence.

`.github/workflows/compatibility.yml` automates both dependency lanes, three
engines, and all three CSS modes. The package workflow separately resolves
PHP 8.2/Laravel 11, PHP 8.3/Laravel 12, and PHP 8.4/Laravel 13 for both Filament
majors. Successful local browser runs do not substitute for those CI results.

Manual workflow dispatch defaults to all suites. `suites=state-paint` or
`suites=state-paint,state` reruns the affected checks across the same 18-lane
dependency/CSS/browser matrix without repeating already-passed component
interactions. Paint checks wait for actual frame/paint data and check every
sampled frame. The state suite also deliberately flips the native `.dark`
class and verifies correction before the next animation frame.

## Milestone 7: expanded theme coverage

Every built-in daisyUI theme is now generated into
`resources/dist/themes/<name>.css`. `FixtureProvider` exposes an `/allthemes`
panel that allowlists all of them (the theme list is read from the shipped
`theme-data.json`), and the plugin assembles inline styles lazily, so this panel
adds no per-request cost to the other panels. The milestone 1–6 suites still
describe the original three themes; the milestone 7 audit is manifest driven
instead:

```sh
node bin/audit-themes.mjs                       # static semantic-pair contrast
COMPAT_OUTPUT=/tmp/daisy-audit \
  node tests/Compatibility/theme-audit.mjs      # rendered audit + screenshots
```

The browser suites run automatically on pull requests, on default-branch pushes,
and on demand. Standard GitHub-hosted runners are free for public repositories,
so the 18-lane component matrix does not consume paid minutes; it can also be
run locally against the disposable fixtures, which gives a faster loop than
waiting for CI.

The rendered audit forces the OS colour preference to the opposite of each
theme's appearance, proves the explicit theme still wins, and checks rendered
text contrast (≥ 4.5:1) on native tables and forms, measuring every variant of
each selector (for example each badge colour) and keeping the worst. It
converts `oklch()` computed colours through a canvas, because regex parsing of
computed colours yields `NaN` and would pass silently. `COMPAT_BROWSER`,
`COMPAT_MAJORS`, and `COMPAT_THEMES` narrow a diagnostic run. The `theme-audit`
job in `.github/workflows/compatibility.yml` gates on this across both Filament
majors and every engine the component matrix uses (Chromium, Firefox, WebKit);
the milestone 1–6 suites remain the full component matrix.

Every suite here launches one browser and must close it in a `finally` block.
Playwright keeps Node's event loop alive while a browser is open, so a script
that reaches its last line without `await browser.close()` prints its results and
then hangs indefinitely — in CI that only ends when the job's `timeout-minutes`
fires, which looks like a slow job rather than a broken one. `composer verify`
runs each step under a timeout, so a hang is reported as `TIMEOUT`.
