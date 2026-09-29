# Milestone 2: expanded native Filament fixtures

## Scope and versions

The repository remains a Composer package. Shared fixture classes live in
`tests/Compatibility/`; two disposable Laravel applications, databases, vendors,
and compiled assets live under `/tmp/daisy-filament-milestone1/`.
No switcher or released theme adapter was implemented in this milestone.

| Fixture | Filament | Livewire | Laravel |
| --- | --- | --- | --- |
| `filament4` | 4.14.0 | 3.8.9 | 12.69.2 |
| `filament5` | 5.9.0 | 4.4.6 | 12.69.2 |

Both use daisyUI **5.7.46**, Tailwind CSS/CLI **4.1.18**, Playwright **1.58.2**,
and Chromium **145.0.7632.6**. Nord declares `color-scheme: light` in the
installed daisyUI theme object; Cupcake is light and Dracula is dark.
The version inventory from milestone 1 remains [available](versions.json).

## Fixture coverage

The same PHP fixture implements dashboards with statistics, navigation, a searchable
and filterable table, pagination, row selection, bulk actions, empty results,
create/edit forms, infolists, status badges, action/confirmation modals, dropdowns,
tooltips, persistent notifications, and login. Forms include text, numeric input,
textarea, JavaScript select/date picker, checkbox, radio, toggle, disabled input,
file upload, helper text, and server validation. Browser checks exercise keyboard
focus, hover, disabled and delayed Livewire loading states. Registration and password
reset are not enabled. The custom daisyUI badge imports only the badge module;
no daisyUI preflight or component bundle is added to the native panel.

Baselines use the same resource without `ProbePlugin`, in native light and dark
modes. Themed checks run Cupcake, Nord, and Dracula at 1440×1000 and 390×844.
Screenshots and JSON include rendered surfaces, computed colors, text contrast,
appearance state, asset URLs, viewport overflow, and real navigation counts.
Horizontal scrolling inside native mobile tables is expected; document overflow
is checked separately. Baseline captures cover eight desktop or nine mobile
states; themed flows cover 27 states on either viewport (sidebar replaces tooltip
on mobile). Desktop pointer tooltips are not claimed as mobile coverage.

## Validation and limitations

Run `node tests/Compatibility/visual.mjs`; `M2_MAJOR=4` or `M2_MAJOR=5` selects an
independent app, and `M2_FILTER=4-cupcake-mobile` selects one case. The script exits
nonzero for recorded failures. See the [fixture README](../../tests/Compatibility/README.md)
for setup, builds, asset publication, and server commands.

Package Pest tests pass (2 tests, 4 assertions). JavaScript syntax checks pass.
PHPStan does not run: the existing configuration contains rejected
`checkOctaneCompatibility` and `checkModelProperties` options. This is separate
from the browser results. PHP emits an existing duplicate `grpc` module warning.

This is sampled Chromium coverage, not a full accessibility audit or a claim
about every Filament release, browser, or daisyUI theme. The prototype still uses
the global Filament `theme` storage key; final persistence and panel isolation
remain deferred. Filament 4 uses fixture-only dependency metadata; the released
Composer constraint is unchanged.

## Initial failures (before corrections)

The broader fixture invalidates any assumption that the milestone 1 palette
prototype is ready for release. These are observed failures, not hypothetical
reasons for extra abstraction.

| Native text/state | Cupcake | Nord | Required review |
| --- | --- | --- | --- |
| Active dashboard navigation | 4.04:1 | No sampled failure | Primary foreground on tinted active surface |
| Validation message | 4.07:1 | 3.78:1 | Light-mode `danger-600` |
| Form helper text | No sampled failure | 3.79:1 | Neutral foreground ramp |
| Upload label | No sampled failure | 4.37:1 | Neutral text on stock white upload surface |
| Notification body | 3.83:1 | 3.38:1 | Neutral text on notification surface |
| Primary action hover | No sampled failure | 4.32:1 | Current 92% primary / 8% content mix |

These initial results reproduced on Filament 4 and 5. The original JSON and
representative screenshots are preserved in [before-fixes](milestone2/before-fixes/summary.json). Nord's unhovered primary action is
5.04:1; keeping semantic foreground/background pairs is necessary but does not
automatically make derived hover states safe. Nord helper text computes to
`oklch(0.57513 0.007 260.731)`, and its notification body computes to
`oklch(0.63782 0.007 260.731)`. The failing hover background computes to
`oklab(0.556312 -0.0198243 -0.0692586)` against
`oklch(0.11887 0.015 254.027)` foreground.

In both light themes, the date picker and FilePond upload area compute to
`rgb(255, 255, 255)` rather than the theme's base surface. Notification cards
also retain stock white. Screenshots confirm these visible surface differences.
FilePond's completed upload uses its own green state color. The expanded fixture
therefore exposes additional third-party surface/state integration decisions.

## Shared corrections

The fixture adapter now uses stronger light-mode neutral text stops, and maps
semantic stops 600/700/800 to the next darker generated stop. This repairs
Filament's native helper, notification, active navigation, and validation colors
through its palette API instead of adding per-component text overrides. Dark
palette generation is unchanged. The primary hover mix uses 96% primary and
4% primary-content; the previous 92/8 mix failed on Nord. These are verified
three-theme prototype rules, not a finalized all-theme generator.

The existing surface rule now includes the native date picker, notification,
and enabled FilePond root. Upload state backgrounds use semantic success/error colors, with neutral base
colors while pending. Success keeps its matching content color. The new rejected
upload check found Cupcake's error/content pair is only 4.12:1, so error text
uses 75% of the error-content OKLCH lightness, retaining its hue/chroma. This
shared derived foreground is tested on all three pinned themes. FilePond
secondary labels retain full opacity so their text keeps the pair's contrast.
The selectors are shared across both versions, with no copied views,
`!important`, DOM-position selectors, or version branches.

FilePond documents its [color and state styling hooks](https://pqina.nl/filepond/docs/api/style/).
The secondary-label opacity hooks were additionally verified in the installed
Filament-bundled FilePond CSS. The browser measurement reads the painted center
panel behind file text: the outer panel is intentionally transparent. It also
composites text alpha and the sampled element's opacity when measuring contrast.

Regression checks now require themed date/upload/notification surfaces, upload
success/error background tokens, and readable filename, status, size, and hint
text. A real rejected PDF upload on a fresh form exercises the invalid state. Each
sidebar navigation must increment the Livewire navigation counter, including
after the reload that isolates this upload scenario. Capture waits for
FilePond initialization and successful processing before navigating away.

## Corrected contrast evidence

Both installed Filament versions return the same values for these repaired
desktop states. All ratios below include the rendered surface behind the text.

| Native text/state | Cupcake before → after | Nord before → after |
| --- | --- | --- |
| Active dashboard navigation | 4.04 → 5.56 | Passing → 6.28 |
| Validation message | 4.07 → 5.73 | 3.78 → 5.30 |
| Form helper | Passing → 8.14 | 3.79 → 5.81 |
| Upload drop label | Passing → 8.14 | 4.37 → 5.81 |
| Notification body | 3.83 → 6.74 | 3.38 → 4.93 |
| Primary hover | Passing → 4.92 | 4.32 → 4.64 |
| Rejected-upload text | 4.12 → 4.68 | Newly checked: 5.06 |

The new upload-error failure was found during these corrections; it is separate
from the original 380-state matrix. Current screenshots and JSON include the
rejected-upload state, and the original failure evidence remains preserved.

## Final matrix result

All **20 cases completed**, producing **392 state captures**, with **zero browser
errors** in the final run. Both baseline modes passed all sampled checks on both
viewports. Each themed case completed 27 states, including upload completion,
Livewire navigation, and refresh. Theme state remained correct throughout.

| Filament / Livewire | Cupcake desktop/mobile | Nord desktop/mobile | Dracula desktop/mobile |
| --- | --- | --- | --- |
| 4.14.0 / 3.8.9 | PASS / PASS | PASS / PASS | PASS / PASS |
| 5.9.0 / 4.4.6 | PASS / PASS | PASS / PASS | PASS / PASS |

**Milestone 2 visual gate: PASSED for this pinned Chromium matrix.** The
recorded contrast and surface failures are resolved. Both light and dark
baselines remain unchanged, all themed flows complete without browser errors,
and theme state survives actual Livewire navigation and refresh. No
version-specific implementation was required.

The next decision is to proceed to milestone 3's formal adapter design using
this evidence. Milestones 3–7 remain unstarted; there is no switcher, released
asset pipeline, or expanded Composer compatibility declaration yet.

The first upload test could navigate while uploading and produced transient
Livewire/Alpine errors. Waiting for FilePond's actual `processing-complete` state
eliminated those errors in the final full run. Those initial errors are not
reported as a Filament-version compatibility defect.

The [combined summary](milestone2/summary.json) lists every case and failure.
Per-case JSON contains computed-style evidence and asset/navigation state;
screenshots use `<major>-<theme>-<viewport>-<state>.png`. Representative review:

| Evidence | Filament 4 | Filament 5 |
| --- | --- | --- |
| Stock light table | [Desktop](milestone2/4-baseline-light-desktop-table.png) | [Desktop](milestone2/5-baseline-light-desktop-table.png) |
| Stock dark form | [Mobile](milestone2/4-baseline-dark-mobile-edit.png) | [Mobile](milestone2/5-baseline-dark-mobile-edit.png) |
| Cupcake validation | [Desktop](milestone2/4-cupcake-desktop-validation.png) | [Mobile](milestone2/5-cupcake-mobile-validation.png) |
| Cupcake notifications | [Desktop](milestone2/4-cupcake-desktop-notifications.png) | [Desktop](milestone2/5-cupcake-desktop-notifications.png) |
| Nord form/surfaces | [Mobile](milestone2/4-nord-mobile-edit.png) | [Desktop](milestone2/5-nord-desktop-edit.png) |
| Nord hover styles | [JSON](milestone2/4-nord-desktop.json) | [JSON](milestone2/5-nord-desktop.json) |
| Dracula date picker | [Desktop](milestone2/4-dracula-desktop-date-picker.png) | [Desktop](milestone2/5-dracula-desktop-date-picker.png) |
| Dracula action modal | [Mobile](milestone2/4-dracula-mobile-action-modal.png) | [Mobile](milestone2/5-dracula-mobile-action-modal.png) |
| Themed upload success | [Cupcake desktop](milestone2/4-cupcake-desktop-file-upload.png) | [Dracula desktop](milestone2/5-dracula-desktop-file-upload.png) |
| Rejected upload | [Cupcake desktop](milestone2/4-cupcake-desktop-upload-error.png) | [Nord mobile](milestone2/5-nord-mobile-upload-error.png) |
| Dracula login | [Mobile](milestone2/4-dracula-mobile-login.png) | [Mobile](milestone2/5-dracula-mobile-login.png) |

Commands executed for this expansion: `node tests/Compatibility/build.mjs`,
fixture `seed.php`, `php artisan filament:assets`, fixture cache clearing and
localhost servers on 8104/8105, `M2_MAJOR=4 node tests/Compatibility/visual.mjs`,
`M2_MAJOR=5 node tests/Compatibility/visual.mjs`, `vendor/bin/pest`,
`vendor/bin/pint --test`, `vendor/bin/phpstan analyse --no-progress`, and
`node --check` on changed JavaScript modules. Pest (2 tests, 4 assertions), Pint, syntax checks, and both final browser
processes pass. PHPStan retains the previously documented configuration blocker;
it was not changed or rerun for these CSS/palette/test corrections.
