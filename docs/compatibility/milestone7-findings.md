# Milestone 7: Expand daisyUI theme coverage

## Gate status

**Passed.** The build, runtime, and fixture work is complete, and the
manifest-driven audit passes for all 35 built-in themes on both Filament majors
and on all three engines: 210 engine runs, none below 4.5:1. The component matrix
— its CSS-mode and dependency lanes and the navigation, state, and first-paint
suites — has not been run against the newly added themes, so the manifest still
marks only the original three as fully verified, and the README says as much.

## Pinned theme inventory

daisyUI **5.7.46** ships **35 built-in themes**. Classification comes from each
theme's own `color-scheme` token, not from its name.

| Appearance | Count | Themes |
| --- | ---: | --- |
| light | 21 | acid, autumn, bumblebee, caramellatte, cmyk, corporate, cupcake, cyberpunk, emerald, fantasy, garden, lemonade, light, lofi, nord, pastel, retro, silk, valentine, winter, wireframe |
| dark | 14 | abyss, aqua, black, business, coffee, dark, dim, dracula, forest, halloween, luxury, night, sunset, synthwave |

The previously shipped three (cupcake, nord, dracula) are the deepest-tested;
the other 32 are new in this milestone.

## Build and runtime changes

1. **Build is theme-list driven.** `bin/build-themes.mjs` now iterates every
   theme in `node_modules/daisyui/theme/object.js` instead of a hard-coded
   three. It emits one stylesheet per theme at `resources/dist/themes/<name>.css`
   plus the combined `resources/dist/themes.css`. The manifest
   (`resources/dist/theme-data.json`) records `appearance`, generated palettes,
   and the `verified` (full matrix) and `audited` (this milestone) lists.
2. **Panels inline only what they allowlist, lazily.** The plugin concatenates
   the allowlisted themes' stylesheets plus the adapter, and builds that string
   inside the `STYLES_AFTER` render hook. Reading it eagerly would run for every
   registered panel on every request, so a fixture panel that allows all 35
   themes would cost every other panel ~290 KB of file reads per request.
   `themes.css` is about **168 KB** for 35 themes; a three-theme panel inlines
   about 15 KB.
3. **Fixtures are manifest driven.** `FixtureProvider` reads the shipped
   manifest and exposes an `/allthemes` panel listing every theme, so audits do
   not need per-theme fixture edits.
4. **A build-time contrast clamp.** See below; it changes the emitted palettes
   for most themes, including the original three, which is why this milestone
   re-verifies them.

## Measurement bug in the first audit

The first audit run reported 70/70 clean, and **that result was invalid**: every
measured contrast was `NaN`. Chromium returns computed colours as `oklch()`,
which the harness parsed with a regex and read as three "RGB" numbers, leaving
the alpha component `undefined`. Because `NaN < 4.5` is `false`, every theme
passed silently — very nearly shipping 20 broken themes.

Two fixes: colours are now resolved by painting them on a 1px canvas (the same
technique the milestone 1–6 `measure.mjs` uses), and a non-finite ratio is
recorded as `0` so it fails loudly. The corrected run reported **30/70 clean**,
which is the real starting point for this milestone. Earlier drafts of this
document and the branch's first commit state the false result.

## Contrast clamp

The corrected audit showed the failures came from two shared causes, not from
individual themes:

1. The generated **neutral ramp** was too low-contrast at muted stops:
   `gray-500`/`600`/`700`/`900` on light themes and `gray-400`/`500`/`600` on
   dark themes (breadcrumbs, helper text, sidebar labels).
2. daisyUI's own **`primary`/`primary-content` pair** is below 4.5:1 for some
   themes (corporate 4.14, dark 4.13, garden 3.84, valentine 3.67, winter 3.62).

`bin/oklch.mjs` adds gamut-aware WCAG contrast maths and two clamps, applied by
`bin/build-themes.mjs`:

- **Muted stops** are moved in lightness until they meet the target against both
  `base-100` and `base-300`, since muted text sits on either surface.
- **The primary button pair** (`clampPair`) is clamped as a pair: either side may
  move, and whichever needs the smaller lightness change wins. This is required
  because some daisyUI primaries are mid-lightness and high-chroma (winter's is
  `oklch(0.5686 0.255 257.57)`), so no foreground lightness reaches the target
  and the background has to move instead. The result is emitted as
  `--daisy-btn-primary-bg` / `--daisy-btn-primary-content`, which the adapter
  uses for primary buttons.

Clamping is a no-op where a theme already passes, and there are **no per-theme
CSS exceptions**. The target is deliberately set above 4.5:1 (currently 5.4:1)
because browsers gamut-map high-chroma `oklch` values and muted text composites
over surfaces that are not `base-100`; offline maths alone under-predicts the
rendered ratio by up to about 1.0. The margin absorbs that.

Aspect worth noting: the clamp slightly changes the original three themes
(their muted stops and, for Nord, the primary button) so they re-enter the audit
rather than relying on the milestone 6 result.

## Shared palette mapping

No per-theme CSS exceptions were added. The build still derives:

- Filament 50–950 palettes from daisyUI's `primary`, `info`, `success`,
  `warning`, and `error` tokens via
  `Filament\Support\Colors\Color::generatePalette()`.
- A neutral `gray` ramp from `base-100`/`base-content`.

Both feed the contrast clamp described above. The documented Cupcake file-upload
adjustment in `adapter.css` remains as a separate, narrower mechanism.

## Static contrast audit

`bin/audit-themes.mjs` computes WCAG 2.1 contrast for daisyUI's own
foreground/background token pairs (for example `base-content` on `base-100`,
`primary-content` on `primary`) across all 35 themes.

**15/35 themes pass every semantic pair at 4.5:1.** The other 20 include pairs
in the 3.0–4.4:1 range (for example `error-content`/`error` on Cupcake at
4.12:1 — the value already documented in the adapter).

This is expected and is **not** a ship/no-ship gate: daisyUI does not design
every semantic pair to meet 4.5:1, and these raw pairs are not all used for
normal-weight body text. The rendered audit below is the deciding check. The
static audit remains useful as a fast triage tool.

## Browser verification

`tests/Compatibility/theme-audit.mjs` launches a real browser, forces the
operating-system colour preference to the *opposite* of the theme's appearance,
and checks that the explicit theme still wins. For each theme it renders the
native products table, the create form and the dashboard (where panel widgets
render) and measures rendered text contrast across headings, cells, badges,
primary and other buttons, breadcrumbs, sidebar labels, labels, inputs, helper
text, section headings, and stats. It measures **every variant** of each
selector (for example each badge colour) and keeps the worst, capturing a
screenshot per page.

Result per engine (Playwright 1.58.2; Chromium 145.0.7632.6), Filament 4.14.0 and
5.9.0, after the contrast clamp. Each engine renders all 35 themes on both
majors:

| Engine | Theme/version runs | `data-theme`, root `.dark`, `color-scheme` | Rendered text contrast | Page, console, HTTP errors |
| --- | --- | --- | --- | --- |
| Chromium | **70/70 clean** | correct for every run | ≥ 4.5:1 for every measured node | none recorded |
| Firefox | **70/70 clean** | correct for every run | ≥ 4.5:1 for every measured node | none recorded |
| WebKit | **70/70 clean** | correct for every run | ≥ 4.5:1 for every measured node | none recorded |

That is **210 engine runs, none below 4.5:1**. The results were first
established on Chromium; Firefox and WebKit were added afterwards and agreed
with no change to the clamp target, including WebKit, which is the engine where
the milestone 6 theme-wiring regression had appeared.

The committed result set [`theme-audit.json`](milestone7/theme-audit.json) is the
Chromium run; the screenshots below are a representative sample (the rest are
large and stay local).

- [Cupcake table / Filament 4](milestone7/4-cupcake-table.png)
- [Night form / Filament 4](milestone7/4-night-form.png)
- [Abyss form / Filament 4](milestone7/4-abyss-form.png)
- [Wireframe table / Filament 5](milestone7/5-wireframe-table.png)
- [Corporate table / Filament 5](milestone7/5-corporate-table.png)
- [Synthwave form / Filament 5](milestone7/5-synthwave-form.png)

### Scope and remaining certification

The milestone 7 audit covers table, form and dashboard pages at desktop width,
and the node types listed above, on all three engines. It does **not** replace
the milestone 6 matrix: the CSS-mode and dependency lanes, and the navigation,
state, and first-paint suites, still run against the three deepest-tested themes
rather than all 35. It is not a blanket claim about every Filament component.

Margins are tight in places: the 5.4:1 build target renders as low as **4.5:1**
for Retro's badge, because the browser gamut-maps high-chroma values and muted
text composites over surfaces other than `base-100`. Raising the target if a
future failure appears is a one-line change; the alternative is to clamp
narrower bands per stop.

The original three themes are included in this audit rather than relying on the
milestone 6 result, because the clamp changed their emitted palettes. Their
milestone 6 contrast numbers therefore no longer describe the shipped values.

The `theme-audit` job in `.github/workflows/compatibility.yml` runs this audit on
each engine across both Filament majors, so a regression in the shared mapping
fails CI on any of them. The manifest's `verified` list still stays limited to
the three themes that have passed the full component matrix, while `audited`
records all 35: widening the audit does not promote the other 32, because the
CSS-mode and dependency lanes and the navigation, state, and first-paint suites
have not run against them.

## Widget fills that painted the page colour

Reported from a consuming app: with the plugin installed, a stat card's sparkline
area looked like the page background showing through the card, where stock
Filament shows a faint fill. Measured on the host page (Cupcake):

| Value | Before | After |
| --- | --- | --- |
| Page (`--gray-50`) | `oklch(0.93982 0.007 61.449)` | unchanged |
| Card | `oklch(0.97788 0.004 56.375)` | `rgb(255, 255, 255)` in light themes |
| Sparkline fill (`--gray-100`) | `oklch(0.93982 0.007 61.449)` | `oklch(0.90176 0.007 61.449)` |
| Fill composited over the card | `rgb(239, 234, 230)` | `rgb(226, 222, 218)` |

Light surfaces are Filament's own literal white rather than `base-100` (see the
surface note below), so the fill now sits below both the card and the page, the
same ordering stock Filament's neutral chart fill has.

Cause: the light-theme branch of `bin/build-themes.mjs` assigned **both** `50`
and `100` to `base-200`. `gray-50` is the page underlay, and `gray-100` is
Filament's neutral fill — chart areas, icon wells and active sidebar items — so
every uncoloured chart area painted the page colour onto the card. Stock
Filament keeps those steps distinct (`gray-50: oklch(0.985 …)`,
`gray-100: oklch(0.967 …)`).

The fix steps `gray-100` down exactly one rung (as far as the page sits below
`base-100`), so the gap scales with each theme's own surface separation: the step
below the page is 0.015–0.070 across the 21 light themes, against 0.006–0.017
for a `base-200 → base-300` mix, which measured as indistinguishable.

Two consequences were handled with the change:

- Darkening the fill lowered the contrast of coloured text that sits on it (the
  active sidebar label is `-700`), which the audit caught as Garden at 4.33:1.
  The build now clamps each palette's `-700` against the same surfaces as the
  muted grays. Darker surfaces cover lighter ones, so a stop clamped this way
  also holds on `base-100`. Only the `-700` stops move; the earlier attempt that
  also clamped `-600` and `-800` compressed those stops to a similar lightness in
  themes with a wide card/page gap, for contrast the audit did not need.
- The audit previously rendered only the table and form pages, where no widgets
  appear, so nothing could observe this. It now renders the dashboard too, and
  fails on a neutral chart fill that resolves to either the page colour or its
  own card's colour. Negative-tested by restoring `100: page`: both themes fail
  with `FADED …: the chart fill is the page colour` and exit 1.

Contrast measurement alone cannot catch this class of defect — identical colours
are perfectly legible. It needs an explicit "these two surfaces must differ"
check, which is what the flat-surface guard and this new fill guard provide.

## Surfaces are painted per appearance

Filament compiles its card surfaces to a literal white, so a palette alone cannot
reach them. Painting them with `base-100` in every theme left light cards sitting
between white and the tinted page, which is what made widgets read as part of the
background, and `state` and `visual` both assert that these surfaces carry the
theme colour, so the override and the assertions have to agree.

The adapter now scopes its surface override to dark themes, with
`:root[data-theme].dark`:

- **Light themes** keep Filament's white. The tinted page underlay is what
  separates a card from the background, exactly as stock Filament reads, so a
  light theme tints the page, accents and charts.
- **Dark themes** paint cards, tables, forms, modals, the topbar, dropdowns, input
  wrappers and file uploads from `base-100`. Several of them (the FilePond root
  and the input wrappers) have no dark rule of their own and fall back to a 5%
  white wash, which reads as a hole in a dark panel.

That leaves one rule the suites can assert: the expected surface is white in a
light theme and `base-100` in a dark one, which is what `expectedSurfaceRgb` in
`measure.mjs` now computes, and what the hardcoded first-paint maps in `state.mjs`,
`state-paint.mjs` and `investigate.mjs` use for their three verified themes. The
off-canvas sidebar is the remaining single-appearance exception, because Filament
gives it no dark rule.

## CI authoring bug found while adding the gate

The first run of the restored `theme-audit` job failed before reaching the audit,
with `install.py: error: unrecognized arguments: npm install ...`. The step was
written as a plain scalar spread over several lines:

```yaml
run:
  python3 tests/Compatibility/install.py "$COMPAT_FIXTURES" --archive /tmp/daisy-dist/themes.zip --latest
  npm install --prefix "$PLAYWRIGHT_DIR" playwright@1.58.2
```

YAML folds a multi-line plain scalar, so all three commands reached the shell as
a single line and `install.py` received the `npm` command as arguments. A second
step carried the related mistake — a comment after a block scalar indicator
(`run: | # zizmor: ignore[...]`) — so that comment moved to its own line above
`run:` in both jobs.

What made this harder to catch than it should have been: `ruby -ryaml` parses
the folded form without complaint, so a spec-compliant local parse is **not**
evidence that GitHub runs what was written. The only reliable evidence is the
engine's own log.

`bin/lint-workflows.mjs` now rejects both forms, and `composer verify` runs it as
the `lint:workflows` check.

## The gate hung instead of finishing

With the YAML fixed, all **18 browser lanes passed** — including
`webkit, 4.1.0, minimum`, the lane that had been failing — and the rendered
audit reported **70/70 clean**. The `theme-audit` job still ended as `cancelled`,
but not because the audit failed: it printed its summary and then sat idle for 27
minutes until the job's `timeout-minutes: 30` fired.

`tests/Compatibility/theme-audit.mjs` was the only suite here that launched a
browser without closing it, so the browser kept Node's event loop alive and the
process never exited. The job log gives it away: the last output line is the
70/70 summary at `13:46:52`, and cleanup then terminates orphan `node` and
`chrome-headless-shell` processes at `14:14:08`.

A minimal reproduction confirms the mechanism: a script that launches Chromium
and reaches its last line hangs indefinitely, while the same script with
`await browser.close()` exits in about one second. The loop is now wrapped in
`try { … } finally { await browser.close() }` like every other suite, and
`composer verify` runs each step under a timeout so a hang reports `TIMEOUT`
instead of blocking the run.

The lesson mirrors the YAML one: a gate that never returns an exit code is
indistinguishable from a passing gate, and only the platform's own log shows the
difference.

## CI cost and latency of the matrix

The browser matrix is the part of CI a reviewer waits on, so its timings are
recorded here rather than remembered. Measured on the slowest lane of run
36585986223 (`webkit, 4.1.0, minimum`, 928s in total):

| Step | Time |
| --- | ---: |
| `release.mjs` suite runs | 794s |
| Install consumers and browser tooling | 99s |
| Shipped-artifact checks and distribution | 14s |
| Runner setup | ~20s |

Inside `release.mjs` the four suites ran one after another while only browsers
were parallel, so the lane's duration was their sum:

| Suite | Time |
| --- | ---: |
| state-paint | 35s |
| switcher | 88s |
| state | 159s |
| visual | 512s |

`visual` alone was 64% of the lane, and the lane is the job's wall clock, so the
matrix's latency was set by that single suite. Reducing the number of lanes would
not have helped at all.

Two constraints shaped the fix. First, this account queues jobs once a run has
more than roughly 17 in flight — PR #3's run showed 17 in progress with 4 queued —
so sharding into more jobs would have made the gate slower rather than faster.
Second, the fixtures are single-threaded `php artisan serve` processes unless
`PHP_CLI_SERVER_WORKERS` is set, so overlapping work only pays off once the
servers can accept concurrent requests.

The runner therefore executes suites concurrently under a bounded pool
(`COMPAT_CONCURRENCY`, default 3, scheduled longest-first) with `visual` split
across both majors inside the same lane, and CI sets `PHP_CLI_SERVER_WORKERS` so
the fixtures keep up.

Measured effect on the slowest lane, `webkit, stock, minimum`:

| Stage | Slowest lane | Jobs per run |
| --- | ---: | ---: |
| Original, suites serial | 928s | 21 |
| Suites overlapped, no server workers | 584s | 9 |
| Suites overlapped, server workers set | **485s** | 9 |

The middle row is the informative one. Overlapping the suites without setting
`PHP_CLI_SERVER_WORKERS` left them queuing on the single-threaded fixtures, which
is why the third step was needed rather than assumed. A pull request now gates in
roughly the duration of its longest lane instead of that plus a queue.

Every engine and both CSS floor lanes run on pull requests and on merges; the
newest CSS and newest dependency lanes run on a nightly schedule and on demand,
because a 21-job run exceeded this account's concurrency and left the next pull
request's checks queued. Markdown-only changes do not trigger the workflow.

## Reproducing

```sh
python3 tests/Compatibility/install.py /tmp/daisy-filament-milestone7
cd /tmp/daisy-filament-milestone7/filament4 && php artisan serve --host=127.0.0.1 --port=8104 &
cd /tmp/daisy-filament-milestone7/filament5 && php artisan serve --host=127.0.0.1 --port=8105 &
npm install --prefix /tmp/daisy-browser-tools playwright@1.58.2
COMPAT_OUTPUT=/tmp/daisy-audit node tests/Compatibility/theme-audit.mjs
node bin/audit-themes.mjs
```

`COMPAT_THEMES` and `COMPAT_MAJORS` narrow the run for diagnostics.
