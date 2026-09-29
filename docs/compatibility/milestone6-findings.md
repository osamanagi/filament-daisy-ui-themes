# Milestone 6: Release verification

## Gate status

**Passed.** The final implementation passed local first-paint and root-state
regression checks, and the complete release matrix finished green. Every lane
of the package CI and the 18-lane browser matrix succeeded on the final commit.
Milestone 7 has not started.

The repository remains a Composer panel plugin. Fixtures, databases, browser
binaries, and host npm dependencies live in disposable external applications.
The review branch is `milestone-6-verification`; nothing is merged or released.

## Installed versions

| Fixture | Filament | Livewire | Laravel |
| --- | --- | --- | --- |
| Filament 4 | 4.14.0 | 3.8.9 | 12.69.2 |
| Filament 5 | 5.9.0 | 4.4.6 | 12.69.2 |

At verification, these Filament versions are both the declared minimum and
newest stable release in their major. CI resolves the latest lane afresh.
Both fixtures share daisyUI **5.7.46** compiled assets. Host CSS is independently
built using Tailwind **4.1.0** and **4.3.3**. Playwright **1.58.2** supplies
Chromium **145.0.7632.6**, Firefox **146.0.1**, and WebKit **26.0**.
Local PHP is **8.4.8**; package CI additionally covers PHP 8.2 and 8.3.

## Distribution and installation

`install.py --archive` installs the actual Composer ZIP into two clean apps,
without source symlinks, dependency overrides, npm, or manual package-asset
copying. It runs `filament:assets`. Fixture resource classes are host test
content autoloaded separately; the released package does not depend on them.
Custom-theme lanes subsequently build the host's own CSS using external tooling
and remove the temporary npm-resolution symlink.

The original archive accidentally contained vendor/npm dependencies: 62 MB and
22,407 entries. Explicit exclusions reduce it to 32 files, about 19 KB compressed,
while retaining source, views, translations, compiled assets, and licenses.
`check-archive.py` compares required runtime files with the workspace and rejects
development dependencies. [Local archive evidence](milestone6/install-evidence.json)
records the earlier ZIP installation; final CI installs the updated distribution.

## Runtime changes and recommended architecture

The same adapter and controller serve both Filament majors. No copied Filament
views, new CSS overrides, or version-specific branches were needed.

1. **Synchronous compiled CSS:** WebKit first entering a themed panel from a
   fresh native baseline could display the new body before external CSS arrived.
   The package now renders existing theme CSS followed by adapter CSS through
   the panel's `STYLES_AFTER` hook. Its small compiled JavaScript already renders
   synchronously. Native host CSS remains first; unrelated host customization
   survives, while plugin semantic palettes take precedence.
2. **Root appearance guard:** Both installed Filament versions initialize the
   Alpine theme store from their native preference and call a native bootstrap
   that can re-add `.dark` between render hooks. A small `MutationObserver`
   checks only the root class and reapplies the selected appearance when it
   disagrees. It repairs the class in a microtask before the next rendering
   opportunity. The existing Alpine-store bridge remains isolated; the native
   `theme` storage preference is untouched. The guard is inactive when the
   controller leaves a configured panel.
3. **Typed current-plugin lookup:** PHPStan exposed a real return-type issue;
   the getter now validates the returned plugin instance. Loading the installed
   Larastan extension also fixes previously unrecognized configuration options.

Inline delivery adds roughly 17 KB of CSS and 1.6 KB of JS to panel responses.
Strict CSP needs to accommodate inline styles/scripts and Filament/Alpine;
strict-CSP operation is not certified. Assets remain registered and publishable.
Consumers still require no daisyUI/npm installation for included themes.

## Verification matrix

Each browser/CSS/dependency lane independently installs both Filament majors
and checks Cupcake, Nord, and Dracula at desktop 1440×1000 and mobile 390×844.

| Suite | Cases/captures per lane | Coverage |
| --- | ---: | --- |
| First paint | 30 | Delayed CSS; native light/dark/system; valid, unknown, and removed preferences |
| Selector | 80 | Real keyboard/mouse selection, focus, pressed state, refresh, mobile bounds |
| State/navigation | 200 | Refresh, Livewire/history, OS changes, per-panel storage, logout, isolation, first entry, deliberate native-class overrides |
| Native components | 404 | Tables, forms, validation, controls, uploads, filters, selection, pagination, notifications, tooltips, dropdowns, body-teleported modals, login |

The release workflow has **18 lanes**: minimum/latest dependencies × stock,
Tailwind 4.1.0, and latest Tailwind CSS × Chromium, Firefox, and WebKit. Package
CI has six lanes: PHP 8.2/Laravel 11, PHP 8.3/Laravel 12, and PHP 8.4/Laravel 13,
with each Filament major. No blanket claim about every Filament component or
complete accessibility conformance is made.

Pest checks plugin registration, panel-option isolation, allowlists/defaults,
asset registration, native switcher removal, safe configuration encoding,
selector output, inline compiled CSS, and absence of unconfigured-panel hooks.
Stored-value fallback belongs to the browser checks.

## Failures investigated

- **Asynchronous CSS arrival:** fixed by synchronous compiled styles, as above.
- **Native startup class drift:** a Chromium capture showed `.dark = true` at
  269.3 ms, corrected at 276.9 ms, with first paint reported at 288 ms. Paint
  timestamps alone do not establish which pixels reached the screen. Instead
  of accepting a filtered sample, the final implementation prevents the state
  drift and retains assertions over **every sampled frame**.
  [Original samples](milestone6/diagnostics/ci-chromium-before-paint.json).
- **Empty first-paint data:** one WebKit job had no animation frames or paint
  entries when a fixed 250 ms wait expired. The harness now waits at most ten
  seconds for data, then observes another 250 ms. Missing evidence still fails.
  [Original empty capture](milestone6/diagnostics/ci-webkit-empty-first-paint.json).
- **Color serialization:** WebKit reports OKLCH hue `260.730988` where Chromium
  reports `260.731`. Expected CSS strings are normalized by the same engine;
  RGB surface and contrast checks remain unchanged.
- **Native transitions:** settled measurements now wait for finite animations.
  The harness waits for modal closure before navigation; otherwise even native
  unthemed baselines could emit Livewire teardown errors. Paint checks do not
  wait for transitions or filter incorrect frames.
- **Concurrent cache clears:** file-cache directory deletion raced between local
  browser workers. Disposable fixtures now use Laravel's database cache.
- **CI tooling:** unused Pest Livewire helpers blocked PHP 8.2/Livewire 4 and were
  removed. PCOV supplies the coverage driver requested by PHPUnit. Zizmor runs
  in normal CI mode because repository code scanning is disabled. Intentional
  write-workflow credentials and matrix tooling installs have scoped, documented
  exceptions; the audit itself remains enabled.

Failed and superseded diagnostic runs are retained separately. The earlier
local stock matrix passed 2,106 captures/cases before the final root guard;
[local indexes](milestone6/local-results.json) identify successful retests rather
than rewriting failed logs. The final guard separately passed **90 local
first-paint scenarios** and **50 Filament 5 desktop state checks**, including
pre-frame correction for all three themes. Final CI is the release evidence
for the updated runtime.

## Native computed-style and screenshot evidence

Representative Filament 5 / WebKit stock form measurements (unchanged CSS):

| Theme | Native input wrapper background | Input text contrast | Primary button contrast | Mode |
| --- | --- | ---: | ---: | --- |
| Cupcake | `oklch(0.97788 0.004 56.375)` | 15.92 | 5.20 | light |
| Nord | `oklch(0.95127 0.007 260.730988)` | 10.84 | 5.04 | light |
| Dracula | `oklch(0.28822 0.022 277.507996)` | 14.24 | 8.29 | dark |

Custom CSS checks assert the host's **72px** topbar remains active while native
surfaces and overlays match the selected theme. Earlier full CI artifacts were
inspected in all three engines, with no component findings or browser errors.
These reference screenshots show actual native components:

- [Cupcake portal / Filament 4 / Chromium](milestone6/stock-final/chromium/4-cupcake-desktop-portal-modal.png)
- [Cupcake mobile table / Filament 4 / Firefox](milestone6/stock-final/firefox/4-cupcake-mobile-table.png)
- [Dracula form / Filament 4 / WebKit](milestone6/stock-final/webkit/4-dracula-desktop-edit.png)
- [Nord mobile portal / Filament 5 / WebKit](milestone6/stock-final/webkit/5-nord-mobile-portal-modal.png)
- [Cupcake custom Tailwind 4.3.3 form](milestone6/ci-samples/chromium-tailwind-4.3.3-filament4-cupcake-form.png)
- [Nord custom Tailwind 4.1.0 form](milestone6/ci-samples/firefox-tailwind-4.1.0-filament5-nord-form.png)
- [Dracula custom Tailwind 4.1.0 portal](milestone6/ci-samples/webkit-tailwind-4.1.0-filament5-dracula-portal.png)

Adjacent CI sample JSON contains computed styles. Full reports/screenshots stay
local or in CI artifacts; selected evidence is committed to limit repository size.

## Commands and reproducibility

See [fixture instructions](../../tests/Compatibility/README.md) for archive
installation, servers, browser tooling, custom CSS builds, and diagnostic filters.

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

Local Pest passes **12 tests / 38 assertions**; Pint, PHPStan, compiled-asset
checks, Composer validation, archive checks, and Actionlint pass.

## Final CI results

Final commit `862a188c13a1bfeaf2d6349d0de3f328f8f6dbef` on
`milestone-6-verification`. All workflows completed successfully.

| Workflow | Lanes | Result | Run |
| --- | ---: | --- | --- |
| `browser compatibility` | 18 (Chromium/Firefox/WebKit × stock/Tailwind 4.1.0/latest × minimum/latest) | success | [#36470567321](https://github.com/osamanagi/filament-daisy-ui-themes/actions/runs/36470567321) |
| `tests` | 6 (PHP 8.2/8.3/8.4 × Laravel 11/12/13 × Filament 4.14/5.9) | success | [#36470567206](https://github.com/osamanagi/filament-daisy-ui-themes/actions/runs/36470567206) |
| `zizmor` | workflow audit | success | [#36470567255](https://github.com/osamanagi/filament-daisy-ui-themes/actions/runs/36470567255) |

The browser matrix ran first-paint, selector, state/navigation, and native
component suites for every shipped theme (Cupcake, Nord, Dracula) at desktop
and mobile sizes. The package lanes each ran Pest, PHPStan, and Pint. This
closes the milestone 6 gate; the release matrix remains a pinned verification
baseline, not a blanket claim for every Filament component or full
accessibility conformance.
