# daisyUI themes for Filament

Apply any of the 35 built-in [daisyUI](https://daisyui.com) themes to a Filament
panel, and let your users switch between them from the topbar. It ships as a
Composer package - no npm build, no Tailwind config, no published views.

![Filament shop dashboard in the abyss theme](art/themes/abyss.jpg)

## Requirements

- PHP 8.2+
- Filament `^4.14 || ^5.9`
- Tailwind 4.1+ only if you add your own custom Filament CSS

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

Publish the assets once per deploy:

```sh
php artisan filament:assets
```

The plugin owns the panel's palette and its light/dark mode, so register it
after any conflicting `->colors()` or appearance settings, and give each panel
its own instance.

## Methods

| Method | What it does |
| --- | --- |
| `themes(['cupcake', 'nord'])` | Sets the themes this panel may use. Default: `cupcake`, `nord`, `dracula`. |
| `defaultTheme('nord')` | Sets the starting theme. Must be in the list. |
| `allThemes()` | Allows all 35 shipped themes. |
| `allLightThemes()` | Allows the 21 light themes. |
| `allDarkThemes()` | Allows the 14 dark themes. |
| `themeSwitcher(false)` | Hides the selector; the theme still applies and persists. |
| `themeSwitcherHook($hook)` | Moves the selector. Defaults to the end of the topbar. |
| `FilamentDaisyUiThemesPlugin::get()` | The plugin instance for the current panel. |

### Bulk helpers

```php
->allThemes()       // all 35
->allLightThemes()  // 21 light
->allDarkThemes()   // 14 dark
```

They replace whatever `themes()` set. When the current default is not in the new
list it resets to the first entry - so `allDarkThemes()` alone works and lands on
`abyss`.

### Moving or hiding the selector

```php
->themeSwitcherHook(PanelsRenderHook::SIDEBAR_FOOTER)
->themeSwitcher(false)
```

Any `Filament\View\PanelsRenderHook` case, or a string hook name, is accepted. A
single-theme panel can hide the selector, and `themeSwitcherHook()` then renders
nothing. Panels without a topbar, and the simple login layout, have no selector
at all.

## Themes

Any of the 35 built-in daisyUI 5.7.46 themes can be enabled by name, for example
`->themes(['business', 'abyss', 'wireframe'])`. `defaultTheme()` must belong to
that list, and only allowlisted themes appear in the selector.

**21 light, 14 dark.** The split comes from each theme's own `color-scheme`
token, not from its name:

| Light (21) | Dark (14) |
| --- | --- |
| acid, autumn, bumblebee, caramellatte, cmyk, corporate, cupcake, cyberpunk, emerald, fantasy, garden, lemonade, light, lofi, nord, pastel, retro, silk, valentine, winter, wireframe | abyss, aqua, black, business, coffee, dark, dim, dracula, forest, halloween, luxury, night, sunset, synthwave |

### Cost of allowing many themes

A panel inlines a stylesheet for each theme it allows: roughly **1 KB gzipped
per theme**. The default three cost about 3 KB per page load, all 35 about
20 KB. Allowlist what a panel actually needs.

### Light themes (21)

|  |  |
| --- | --- |
| <img src="art/themes/acid.jpg" alt="acid theme" width="480"><br>**acid** | <img src="art/themes/autumn.jpg" alt="autumn theme" width="480"><br>**autumn** |
| <img src="art/themes/bumblebee.jpg" alt="bumblebee theme" width="480"><br>**bumblebee** | <img src="art/themes/caramellatte.jpg" alt="caramellatte theme" width="480"><br>**caramellatte** |
| <img src="art/themes/cmyk.jpg" alt="cmyk theme" width="480"><br>**cmyk** | <img src="art/themes/corporate.jpg" alt="corporate theme" width="480"><br>**corporate** |
| <img src="art/themes/cupcake.jpg" alt="cupcake theme" width="480"><br>**cupcake** | <img src="art/themes/cyberpunk.jpg" alt="cyberpunk theme" width="480"><br>**cyberpunk** |
| <img src="art/themes/emerald.jpg" alt="emerald theme" width="480"><br>**emerald** | <img src="art/themes/fantasy.jpg" alt="fantasy theme" width="480"><br>**fantasy** |
| <img src="art/themes/garden.jpg" alt="garden theme" width="480"><br>**garden** | <img src="art/themes/lemonade.jpg" alt="lemonade theme" width="480"><br>**lemonade** |
| <img src="art/themes/light.jpg" alt="light theme" width="480"><br>**light** | <img src="art/themes/lofi.jpg" alt="lofi theme" width="480"><br>**lofi** |
| <img src="art/themes/nord.jpg" alt="nord theme" width="480"><br>**nord** | <img src="art/themes/pastel.jpg" alt="pastel theme" width="480"><br>**pastel** |
| <img src="art/themes/retro.jpg" alt="retro theme" width="480"><br>**retro** | <img src="art/themes/silk.jpg" alt="silk theme" width="480"><br>**silk** |
| <img src="art/themes/valentine.jpg" alt="valentine theme" width="480"><br>**valentine** | <img src="art/themes/winter.jpg" alt="winter theme" width="480"><br>**winter** |
| <img src="art/themes/wireframe.jpg" alt="wireframe theme" width="480"><br>**wireframe** | |

### Dark themes (14)

|  |  |
| --- | --- |
| <img src="art/themes/abyss.jpg" alt="abyss theme" width="480"><br>**abyss** | <img src="art/themes/aqua.jpg" alt="aqua theme" width="480"><br>**aqua** |
| <img src="art/themes/black.jpg" alt="black theme" width="480"><br>**black** | <img src="art/themes/business.jpg" alt="business theme" width="480"><br>**business** |
| <img src="art/themes/coffee.jpg" alt="coffee theme" width="480"><br>**coffee** | <img src="art/themes/dark.jpg" alt="dark theme" width="480"><br>**dark** |
| <img src="art/themes/dim.jpg" alt="dim theme" width="480"><br>**dim** | <img src="art/themes/dracula.jpg" alt="dracula theme" width="480"><br>**dracula** |
| <img src="art/themes/forest.jpg" alt="forest theme" width="480"><br>**forest** | <img src="art/themes/halloween.jpg" alt="halloween theme" width="480"><br>**halloween** |
| <img src="art/themes/luxury.jpg" alt="luxury theme" width="480"><br>**luxury** | <img src="art/themes/night.jpg" alt="night theme" width="480"><br>**night** |
| <img src="art/themes/sunset.jpg" alt="sunset theme" width="480"><br>**sunset** | <img src="art/themes/synthwave.jpg" alt="synthwave theme" width="480"><br>**synthwave** |

## Compatibility

PHP 8.2+ and Filament `^4.14 || ^5.9`. Verified development versions:

| Filament | Livewire | Laravel |
| --- | --- | --- |
| 4.14.0 | 3.8.9 | 12.69.2 |
| 5.9.0 | 4.4.6 | 12.69.2 |

## License and contributing

MIT; see [LICENSE.md](LICENSE.md). The distributed daisyUI theme data carries its
[MIT attribution](resources/dist/DAISYUI-LICENSE.txt). See the
[contributing guidelines](.github/CONTRIBUTING.md) and the
[security policy](.github/SECURITY.md).
