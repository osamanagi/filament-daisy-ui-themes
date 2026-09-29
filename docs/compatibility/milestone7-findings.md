# Milestone 7: Expand daisyUI theme coverage

## Gate status

**In progress.** The build, runtime, and fixture work is complete, and a
manifest-driven Chromium audit passed for all 35 built-in themes on both
Filament majors. The full three-engine release matrix has not yet been run for
the newly added themes, so this milestone is not closed.

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
2. **Panels inline only what they allowlist.** `FilamentDaisyUiThemesPlugin`
   concatenates the allowlisted themes' stylesheets plus the adapter, instead of
   inlining every shipped theme. This matters: `themes.css` is about **168 KB**
   for 35 themes, so inlining everything would add roughly that much to every
   panel response. A panel that enables three themes inlines about 15 KB.
3. **No regression for the original three.** Their generated palettes,
   appearance, and per-theme CSS are byte-identical to the milestone 6 output.
4. **Fixtures are manifest driven.** `FixtureProvider` reads the shipped
   manifest and exposes an `/allthemes` panel listing every theme, so audits do
   not need per-theme fixture edits.

## Shared palette mapping

No new per-theme CSS exceptions were required. The adapter still derives:

- Filament 50–950 palettes from daisyUI's `primary`, `info`, `success`,
  `warning`, and `error` tokens via `Filament\Support\Colors\Color::generatePalette()`.
- A neutral `gray` ramp from `base-100`/`base-content`, with the light- and
  dark-theme tuning already documented in milestone 3.

The only theme-specific adapter rule remains the documented Cupcake file-upload
contrast adjustment, which is unchanged.

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
native products table and create form, then measures rendered text contrast
across headings, cells, badges, buttons, navigation, labels, inputs, and
helpers, capturing a screenshot per page.

Result on Chromium 145.0.7632.6 (Playwright 1.58.2), Filament 4.14.0 and 5.9.0:

| Check | Result |
| --- | --- |
| Theme/version runs | **70/70 clean** (35 themes × 2 majors) |
| `data-theme`, root `.dark`, `color-scheme` | correct for every run |
| Rendered text contrast | ≥ 4.5:1 for every measured node |
| Page/console errors, 4xx–5xx responses | none recorded |

The full result set is committed as
[`theme-audit.json`](milestone7/theme-audit.json); screenshots below are a
representative sample (the rest are large and stay local).

- [Cupcake table / Filament 4](milestone7/4-cupcake-table.png)
- [Night form / Filament 4](milestone7/4-night-form.png)
- [Abyss form / Filament 4](milestone7/4-abyss-form.png)
- [Wireframe table / Filament 5](milestone7/5-wireframe-table.png)
- [Corporate table / Filament 5](milestone7/5-corporate-table.png)
- [Synthwave form / Filament 5](milestone7/5-synthwave-form.png)

### Scope and remaining certification

The milestone 7 audit covers Chromium only, table and form pages, and the node
types listed above. It does **not** replace the milestone 6 matrix. The original
three themes additionally pass the full three-engine matrix (Chromium, Firefox,
WebKit × stock and custom Tailwind CSS × minimum and latest dependencies) and the
state and first-paint suites. Running that full matrix for the 32 new themes is
the remaining step before this milestone's gate closes; the `verified` list
remains limited to the three full-matrix themes until then, while `audited`
records all 35.

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
