<?php

namespace Compatibility;

use Filament\Facades\Filament;
use Filament\FontProviders\LocalFontProvider;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages\Dashboard;
use Filament\Panel;
use Filament\View\PanelsRenderHook;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Nagi\FilamentDaisyUiThemes\FilamentDaisyUiThemesPlugin;

/** Disposable host configuration, never registered by the package. */
class FixtureProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::get('/compatibility-public', fn () => response('<!doctype html><title>Public fixture</title><p>Public page</p>'));
    }

    public function register(): void
    {
        $this->loadViewsFrom(__DIR__, 'compatibility');
        // Read the shipped manifest so the fixture covers every built-in theme.
        $manifestPath = dirname((new \ReflectionClass(FilamentDaisyUiThemesPlugin::class))->getFileName()) . '/../resources/dist/theme-data.json';
        $allThemes = array_keys(json_decode(file_get_contents($manifestPath), true, flags: JSON_THROW_ON_ERROR)['themes']);
        foreach (['baseline', 'cupcake', 'nord', 'dracula', 'restricted', 'allthemes'] as $theme) {
            Filament::registerPanel(function () use ($theme, $allThemes): Panel {
                $panel = Panel::make()
                    ->id($theme)->path($theme)->login()->spa()
                    ->brandName('Compatibility · ' . ucfirst($theme))
                    ->font('Arial', provider: LocalFontProvider::class)
                    ->resources([ProductResource::class])
                    ->pages([Dashboard::class])
                    ->widgets([OverviewStats::class])
                    ->middleware([
                        EncryptCookies::class, AddQueuedCookiesToResponse::class,
                        StartSession::class, ShareErrorsFromSession::class,
                        VerifyCsrfToken::class, SubstituteBindings::class,
                        DisableBladeIconComponents::class, DispatchServingFilamentEvent::class,
                    ])
                    ->authMiddleware([Authenticate::class])
                    ->renderHook(PanelsRenderHook::TOPBAR_END, fn () => Blade::render(file_get_contents(__DIR__ . '/overlay.blade.php')))
                    ->plugins(match ($theme) {
                        'baseline' => [],
                        // /restricted proves the allowlist hides everything else.
                        'restricted' => [FilamentDaisyUiThemesPlugin::make()->themes(['nord'])->defaultTheme('nord')],
                        // /allthemes exposes every shipped theme for milestone 7 audits.
                        'allthemes' => [FilamentDaisyUiThemesPlugin::make()->themes($allThemes)->defaultTheme('cupcake')],
                        default => [FilamentDaisyUiThemesPlugin::make()->themes(['cupcake', 'nord', 'dracula'])->defaultTheme($theme)],
                    });
                if (getenv('COMPAT_HOST_THEME')) {
                    $panel->theme(url('/compatibility/host.css'));
                }

                return $panel;
            });
        }
    }
}
