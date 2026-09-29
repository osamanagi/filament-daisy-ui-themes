<?php

namespace Nagi\FilamentDaisyUiThemes;

use Filament\Support\Assets\Css;
use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class FilamentDaisyUiThemesServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package->name('filament-daisy-ui-themes')->hasViews()->hasTranslations();
    }

    public function packageBooted(): void
    {
        // Publish through filament:assets, but render only in enabled panels.
        FilamentAsset::register([
            Css::make('themes', __DIR__ . '/../resources/dist/themes.css')->loadedOnRequest(),
            Css::make('adapter', __DIR__ . '/../resources/dist/adapter.css')->loadedOnRequest(),
            Js::make('theme-state', __DIR__ . '/../resources/dist/filament-daisy-ui-themes.js')->loadedOnRequest(),
        ], 'nagi/filament-daisy-ui-themes');
    }
}
