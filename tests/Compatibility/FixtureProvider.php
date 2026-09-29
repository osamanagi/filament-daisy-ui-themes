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
        foreach (['baseline', 'cupcake', 'nord', 'dracula', 'restricted'] as $theme) {
            Filament::registerPanel(function () use ($theme): Panel {
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
                    ->plugins($theme === 'baseline' ? [] : [FilamentDaisyUiThemesPlugin::make()->themes($theme === 'restricted' ? ['nord'] : ['cupcake', 'nord', 'dracula'])->defaultTheme($theme === 'restricted' ? 'nord' : $theme)]);
                if (getenv('COMPAT_HOST_THEME')) {
                    $panel->theme(url('/compatibility/host.css'));
                }

                return $panel;
            });
        }
    }
}
