# daisyUI Themes for Filament

[![Latest Version on Packagist](https://img.shields.io/packagist/v/osamanagi/filament-daisy-ui-themes.svg?style=flat-square)](https://packagist.org/packages/osamanagi/filament-daisy-ui-themes)
[![GitHub Tests Action Status](https://img.shields.io/github/actions/workflow/status/osamanagi/filament-daisy-ui-themes/tests.yml?branch=5.x&label=tests&style=flat-square)](https://github.com/osamanagi/filament-daisy-ui-themes/actions?query=workflow%3Atests+branch%3A5.x)
[![GitHub Code Style Action Status](https://img.shields.io/github/actions/workflow/status/osamanagi/filament-daisy-ui-themes/fix-code-style.yml?branch=5.x&label=code%20style&style=flat-square)](https://github.com/osamanagi/filament-daisy-ui-themes/actions?query=workflow%3Afix-code-style)
[![Browser Compatibility Matrix](https://img.shields.io/github/actions/workflow/status/osamanagi/filament-daisy-ui-themes/compatibility.yml?branch=5.x&label=browser%20matrix&style=flat-square)](https://github.com/osamanagi/filament-daisy-ui-themes/actions?query=workflow%3A%22browser+compatibility%22)
[![Total Downloads](https://img.shields.io/packagist/dt/osamanagi/filament-daisy-ui-themes.svg?style=flat-square)](https://packagist.org/packages/osamanagi/filament-daisy-ui-themes)

Apply any of the 35 built-in [daisyUI](https://daisyui.com) themes to a Filament
panel, with a topbar switcher for your users. No npm build, no Tailwind config,
no published views.

Supports Filament 4 and 5 (PHP 8.2+), including Laravel 11, 12 and 13. Filament 5
requires Livewire 4; follow the [Filament upgrade guide](https://filamentphp.com/docs/5.x/upgrade-guide)
when upgrading an existing app.

![Shop dashboard in the Abyss theme](art/themes/abyss.jpg)

## Installation

You can install the package via composer:

```bash
composer require osamanagi/filament-daisy-ui-themes
```

Register the plugin on your panel (e.g. `/app/Providers/Filament/AdminPanelProvider.php`):

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

Then publish the assets:

```bash
php artisan filament:assets
```

The plugin owns the panel's palette and its light/dark mode, so register it after
any conflicting `->colors()` or appearance settings. Give each panel its own
instance.

You're all set!

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

The demo's Shop Dashboard in each light theme.

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Acid</th>
      <th scope="col" width="1000px">Autumn</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/acid.jpg" width="100%" alt="Shop dashboard in the Acid theme">
      </td>
      <td>
        <img src="art/themes/autumn.jpg" width="100%" alt="Shop dashboard in the Autumn theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Bumblebee</th>
      <th scope="col" width="1000px">Caramellatte</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/bumblebee.jpg" width="100%" alt="Shop dashboard in the Bumblebee theme">
      </td>
      <td>
        <img src="art/themes/caramellatte.jpg" width="100%" alt="Shop dashboard in the Caramellatte theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">CMYK</th>
      <th scope="col" width="1000px">Corporate</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/cmyk.jpg" width="100%" alt="Shop dashboard in the CMYK theme">
      </td>
      <td>
        <img src="art/themes/corporate.jpg" width="100%" alt="Shop dashboard in the Corporate theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Cupcake</th>
      <th scope="col" width="1000px">Cyberpunk</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/cupcake.jpg" width="100%" alt="Shop dashboard in the Cupcake theme">
      </td>
      <td>
        <img src="art/themes/cyberpunk.jpg" width="100%" alt="Shop dashboard in the Cyberpunk theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Emerald</th>
      <th scope="col" width="1000px">Fantasy</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/emerald.jpg" width="100%" alt="Shop dashboard in the Emerald theme">
      </td>
      <td>
        <img src="art/themes/fantasy.jpg" width="100%" alt="Shop dashboard in the Fantasy theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Garden</th>
      <th scope="col" width="1000px">Lemonade</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/garden.jpg" width="100%" alt="Shop dashboard in the Garden theme">
      </td>
      <td>
        <img src="art/themes/lemonade.jpg" width="100%" alt="Shop dashboard in the Lemonade theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Light</th>
      <th scope="col" width="1000px">LoFi</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/light.jpg" width="100%" alt="Shop dashboard in the Light theme">
      </td>
      <td>
        <img src="art/themes/lofi.jpg" width="100%" alt="Shop dashboard in the LoFi theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Nord</th>
      <th scope="col" width="1000px">Pastel</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/nord.jpg" width="100%" alt="Shop dashboard in the Nord theme">
      </td>
      <td>
        <img src="art/themes/pastel.jpg" width="100%" alt="Shop dashboard in the Pastel theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Retro</th>
      <th scope="col" width="1000px">Silk</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/retro.jpg" width="100%" alt="Shop dashboard in the Retro theme">
      </td>
      <td>
        <img src="art/themes/silk.jpg" width="100%" alt="Shop dashboard in the Silk theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Valentine</th>
      <th scope="col" width="1000px">Winter</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/valentine.jpg" width="100%" alt="Shop dashboard in the Valentine theme">
      </td>
      <td>
        <img src="art/themes/winter.jpg" width="100%" alt="Shop dashboard in the Winter theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Wireframe</th>
      <th scope="col" width="1000px"></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/wireframe.jpg" width="100%" alt="Shop dashboard in the Wireframe theme">
      </td>
      <td></td>
    </tr>
  </tbody>
</table>

### Dark themes (14)

The same page in each dark theme.

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Abyss</th>
      <th scope="col" width="1000px">Aqua</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/abyss.jpg" width="100%" alt="Shop dashboard in the Abyss theme">
      </td>
      <td>
        <img src="art/themes/aqua.jpg" width="100%" alt="Shop dashboard in the Aqua theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Black</th>
      <th scope="col" width="1000px">Business</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/black.jpg" width="100%" alt="Shop dashboard in the Black theme">
      </td>
      <td>
        <img src="art/themes/business.jpg" width="100%" alt="Shop dashboard in the Business theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Coffee</th>
      <th scope="col" width="1000px">Dark</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/coffee.jpg" width="100%" alt="Shop dashboard in the Coffee theme">
      </td>
      <td>
        <img src="art/themes/dark.jpg" width="100%" alt="Shop dashboard in the Dark theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Dim</th>
      <th scope="col" width="1000px">Dracula</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/dim.jpg" width="100%" alt="Shop dashboard in the Dim theme">
      </td>
      <td>
        <img src="art/themes/dracula.jpg" width="100%" alt="Shop dashboard in the Dracula theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Forest</th>
      <th scope="col" width="1000px">Halloween</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/forest.jpg" width="100%" alt="Shop dashboard in the Forest theme">
      </td>
      <td>
        <img src="art/themes/halloween.jpg" width="100%" alt="Shop dashboard in the Halloween theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Luxury</th>
      <th scope="col" width="1000px">Night</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/luxury.jpg" width="100%" alt="Shop dashboard in the Luxury theme">
      </td>
      <td>
        <img src="art/themes/night.jpg" width="100%" alt="Shop dashboard in the Night theme">
      </td>
    </tr>
  </tbody>
</table>

<table class="table">
  <thead>
    <tr>
      <th scope="col" width="1000px">Sunset</th>
      <th scope="col" width="1000px">Synthwave</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="art/themes/sunset.jpg" width="100%" alt="Shop dashboard in the Sunset theme">
      </td>
      <td>
        <img src="art/themes/synthwave.jpg" width="100%" alt="Shop dashboard in the Synthwave theme">
      </td>
    </tr>
  </tbody>
</table>

## Compatibility

PHP 8.2+ and Filament `^4.14 || ^5.9`. Verified development versions:

| Filament | Livewire | Laravel |
| --- | --- | --- |
| 4.14.0 | 3.8.9 | 12.69.2 |
| 5.9.0 | 4.4.6 | 12.69.2 |

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Security Vulnerabilities

Please review [our security policy](.github/SECURITY.md) on how to report security vulnerabilities.

## Credits

- [Osama Nagi](https://github.com/osamanagi)
- [daisyUI](https://daisyui.com) by [Pouya Saadeghi](https://github.com/saadeghi), for the 35 bundled themes
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
The bundled daisyUI theme data carries its own
[MIT attribution](resources/dist/DAISYUI-LICENSE.txt).
