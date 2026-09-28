<?php

namespace Nagi\FilamentDaisyUiThemes;

use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Assets\Asset;
use Filament\Support\Assets\Css;
use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use Filament\Support\Facades\FilamentIcon;
use Illuminate\Filesystem\Filesystem;
use Livewire\Features\SupportTesting\Testable;
use Nagi\FilamentDaisyUiThemes\Commands\FilamentDaisyUiThemesCommand;
use Nagi\FilamentDaisyUiThemes\Testing\TestsFilamentDaisyUiThemes;
use Spatie\LaravelPackageTools\Commands\InstallCommand;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class FilamentDaisyUiThemesServiceProvider extends PackageServiceProvider
{
    public static string $name = 'filament-daisy-ui-themes';

    public static string $viewNamespace = 'filament-daisy-ui-themes';

    public function configurePackage(Package $package): void
    {
        /*
         * This class is a Package Service Provider
         *
         * More info: https://github.com/spatie/laravel-package-tools
         */
        $package->name(static::$name)
            ->hasCommands($this->getCommands())
            ->hasInstallCommand(function (InstallCommand $command) {
                $command
                    ->publishConfigFile()
                    ->publishMigrations()
                    ->askToRunMigrations()
                    ->askToStarRepoOnGitHub('nagi/filament-daisy-ui-themes');
            });

        $configFileName = $package->shortName();

        if (file_exists($package->basePath("/../config/{$configFileName}.php"))) {
            $package->hasConfigFile();
        }

        if (file_exists($package->basePath('/../database/migrations'))) {
            $package->hasMigrations($this->getMigrations());
        }

        if (file_exists($package->basePath('/../resources/lang'))) {
            $package->hasTranslations();
        }

        if (file_exists($package->basePath('/../resources/views'))) {
            $package->hasViews(static::$viewNamespace);
        }
    }

    public function packageRegistered(): void {}

    public function packageBooted(): void
    {
        // Asset Registration
        FilamentAsset::register(
            $this->getAssets(),
            $this->getAssetPackageName()
        );

        FilamentAsset::registerScriptData(
            $this->getScriptData(),
            $this->getAssetPackageName()
        );

        // Icon Registration
        FilamentIcon::register($this->getIcons());

        // Handle Stubs
        if (app()->runningInConsole()) {
            foreach (app(Filesystem::class)->files(__DIR__ . '/../stubs/') as $file) {
                $this->publishes([
                    $file->getRealPath() => base_path("stubs/filament-daisy-ui-themes/{$file->getFilename()}"),
                ], 'filament-daisy-ui-themes-stubs');
            }
        }

        // Testing
        Testable::mixin(new TestsFilamentDaisyUiThemes);
    }

    protected function getAssetPackageName(): ?string
    {
        return 'nagi/filament-daisy-ui-themes';
    }

    /**
     * @return array<Asset>
     */
    protected function getAssets(): array
    {
        return [
            // AlpineComponent::make('filament-daisy-ui-themes', __DIR__ . '/../resources/dist/components/filament-daisy-ui-themes.js'),
            // Css::make('filament-daisy-ui-themes-styles', __DIR__ . '/../resources/dist/filament-daisy-ui-themes.css'),
            // Js::make('filament-daisy-ui-themes-scripts', __DIR__ . '/../resources/dist/filament-daisy-ui-themes.js'),
        ];
    }

    /**
     * @return array<class-string>
     */
    protected function getCommands(): array
    {
        return [
            FilamentDaisyUiThemesCommand::class,
        ];
    }

    /**
     * @return array<string>
     */
    protected function getIcons(): array
    {
        return [];
    }

    /**
     * @return array<string>
     */
    protected function getRoutes(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>
     */
    protected function getScriptData(): array
    {
        return [];
    }

    /**
     * @return array<string>
     */
    protected function getMigrations(): array
    {
        return [
            'create_filament-daisy-ui-themes_table',
        ];
    }
}
