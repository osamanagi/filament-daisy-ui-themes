# Milestone 4: Theme state and appearance synchronization

## Scope and versions

The implementation remains in the Composer package's compatibility harness.
Disposable Laravel applications remain outside the repository. No topbar
switcher, database changes, public plugin extraction, or dependency-constraint
expansion was added.

| Fixture | Filament | Livewire | Laravel |
| --- | --- | --- | --- |
| Filament 4 | 4.14.0 | 3.8.9 | 12.69.2 |
| Filament 5 | 5.9.0 | 4.4.6 | 12.69.2 |

Both use daisyUI 5.7.46, Tailwind CSS 4.1.18, PHP 8.4.8, and Playwright
1.58.2 / Chromium 145.0.7632.6. Composer lockfiles were checked again in this
milestone. The compiled CSS and palettes from milestone 3 are unchanged.

## Implementation and why it is shared

`tests/Compatibility/theme-state.js` owns one selected theme key. The fixture
supplies an encoded panel ID, default, and allowlisted theme-to-appearance map
from the generated manifest. Unknown selections and unknown/removed stored
values fall back to the panel default and repair the saved value. Preferences
use `filament-daisy-theme:<panel-id>`; they are browser-local, not user-account
or cross-device preferences. Logout intentionally preserves the selection.

`ProbePlugin.php` uses Filament render hooks:

- `HEAD_START` applies the stored theme before visible content.
- `HEAD_END` reapplies it after native head initialization.
- A body JSON record carries the current panel configuration through cached
  Livewire navigation; `BODY_END` activates it after native body initialization.
- `livewire:navigated` reapplies state in a microtask after native listeners.
  This also handles browser history and restores native mode on the unthemed
  baseline panel.

Each application of state sets `data-theme`, `.dark`, and inline `color-scheme`.
It also sets Alpine's `theme` store. This store name is an **internal Filament
integration**, isolated in this controller and guarded by browser regressions.
The installed `resources/js/dark-mode.js` files are byte-identical in the two
Filament versions. Their `theme-changed` handler writes the global `theme`
storage key, so using that event would contaminate unrelated panels. The
controller leaves that key unchanged and does not call `loadDarkMode` or set
Filament's `window.theme` global.

The OS-preference listener is installed after Filament initializes Alpine.
It restores the selected appearance after Filament's own system-mode listener.
The controller also supports being first loaded during navigation from the
baseline panel, when Alpine has already initialized. Listeners are installed
once per document.

All themed panels use the same native `ThemeMode::System` default; the selected
daisyUI theme owns the actual appearance. This makes Filament's head script
identical between them and resolves the observed `loadDarkMode` redeclaration
on cross-panel SPA navigation. No copied views, new CSS overrides, or
version-specific branches were needed.

## Failures investigated

1. Applying state synchronously in `livewire:navigated` let Filament's later
   listener add `.dark` again. The end-of-event microtask fixes the ordering.
2. Registering the OS listener before Filament let its later listener win.
   Registering after Alpine initialization fixes that independently. The
   failing run and screenshot are retained in
   [before-fixes](milestone4/before-fixes/os-listener-order.json).
3. The first public-isolation assertion visited `/`, which the fixture redirects
   to `/cupcake`. This was a test setup error; `/compatibility-public` now
   provides a real unthemed page.

## Browser evidence

Reproduction commands, after starting both external fixture servers:

```sh
node tests/Compatibility/state.mjs
node tests/Compatibility/state-paint.mjs
vendor/bin/pest
vendor/bin/pint --test
npm run check:themes
composer analyse
```

The state suite tests native tables, forms, action modals, navigation, and login.
It covers immediate selection, refresh, actual Livewire navigation, back/forward,
modal opening/closing, login/logout, independent panel preferences, unknown and
removed themes, OS changes, entering from a fresh unthemed panel, and public-page
isolation. It samples animation frames for theme/class disagreement and checks
computed surfaces, Alpine appearance, color scheme, and representative text
contrast (at least 4.5:1). It verifies that the native storage key stays `system`.

The first-paint suite covers three themes plus unknown/removed values against
native `light`, `dark`, and `system` preferences in both versions: 30 scenarios.
It delays CSS by 200 ms, records browser paint timing and visible animation
frames, and checks login and input surfaces from the first sampled visible
frame. All 30 passed, with no browser errors.

The state gate passed with 47 captures per viewport, per version:

| Lane | Desktop | Mobile | First-paint scenarios | Browser errors |
| --- | --- | --- | --- | --- |
| Filament 4 / Livewire 3 | 47 passed | 47 passed | 15 passed | 0 |
| Filament 5 / Livewire 4 | 47 passed | 47 passed | 15 passed | 0 |

That is 188 state captures plus 30 first-paint screenshots. No sampled visible
frame disagreed with the active panel's selected theme. Representative desktop
Cupcake table, desktop Dracula modal, mobile Nord form, and mobile Dracula modal
screenshots were also inspected visually.

Results and all computed-style measurements:

- [State report](milestone4/state.json)
- [First-paint report](milestone4/first-paint.json)
- [Filament 4 Dracula modal](milestone4/4-desktop-26-modal-dracula.png)
- [Filament 5 Nord mobile form](milestone4/5-mobile-19-spa-form-nord.png)
- [Filament 5 persisted Dracula login](milestone4/5-desktop-2-persisted-login-dracula.png)

Sampled native login, input, table, and modal surfaces agree with their theme's
base-100: Cupcake `oklch(0.97788 0.004 56.375)`, Nord
`oklch(0.95127 0.007 260.731)`, Dracula `oklch(0.28822 0.022 277.508)`.
The selected theme can differ from the fixture panel's name: a Cupcake-labelled
panel showing Dracula is intentional evidence of persisted selection.

## Limits and next decision

This is the pinned Chromium gate, not the release matrix. Firefox, WebKit,
other supported dependency versions, and clean public installation remain
later milestones. This milestone tests stock Filament CSS; milestone 1 retains
the host-custom-theme investigation. Storage denial is caught by this controller,
but full browser operation with storage disabled is not certified: Filament
itself accesses localStorage without guards.

Forced SPA transitions to arbitrary unrelated panels with different native
head scripts remain subject to Filament's head-script behavior. The tested
plugin panels share one default; the unthemed baseline uses that same native
system default. Use full document navigation across unrelated application
layouts. The public-page isolation check uses a full load.

The internal Alpine store name, native script ordering, and Livewire body-script
behavior must be rechecked when upgrading either dependency. These are explicit
compatibility contracts, not undocumented assumptions hidden in a switcher.
The Livewire lifecycle guidance is documented for
[Livewire 3](https://livewire.laravel.com/docs/3.x/navigate) and
[Livewire 4](https://livewire.laravel.com/docs/4.x/navigate); installed source and
browser observations determined this implementation.

Package checks: Pest passes (2 tests, 4 assertions), Pint passes, and generated
assets match their sources. PHPStan cannot start because the existing config
contains unsupported `checkOctaneCompatibility` and `checkModelProperties`
parameters; this pre-existing failure remains unresolved.

Milestone 5 is the next implementation decision: extract this tested behavior
into the public panel plugin, register/publish assets, and add the accessible
topbar selector. It has not started.
