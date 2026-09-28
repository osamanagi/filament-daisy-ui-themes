<?php

use Filament\Facades\Filament;
use Filament\Panel;
use Filament\Support\Facades\FilamentAsset;
use Filament\Support\Facades\FilamentView;
use Filament\View\PanelsRenderHook;
use Nagi\FilamentDaisyUiThemes\FilamentDaisyUiThemesPlugin;

it('keeps panel options independent and retains internal dark styling', function () {
    $first = FilamentDaisyUiThemesPlugin::make()->themes(['nord'])->defaultTheme('nord');
    $second = FilamentDaisyUiThemesPlugin::make();
    $panel = Panel::make()->id('admin')->plugin($first);

    expect($first->getThemes())->toBe(['nord'])
        ->and($first->getDefaultTheme())->toBe('nord')
        ->and($second->getThemes())->toBe(['cupcake', 'nord', 'dracula'])
        ->and($second->getDefaultTheme())->toBe('cupcake')
        ->and($panel->hasDarkMode())->toBeTrue()
        ->and($panel->hasDarkModeForced())->toBeFalse()
        ->and($panel->hasThemeSwitcher())->toBeFalse();
});

it('rejects invalid panel theme configuration', function (array $themes, string $default) {
    Panel::make()->id('admin')->plugin(
        FilamentDaisyUiThemesPlugin::make()->themes($themes)->defaultTheme($default)
    );
})->with([
    'empty list' => [[], 'cupcake'],
    'unsupported theme' => [['unknown'], 'unknown'],
    'invalid value type' => [[[]], 'cupcake'],
    'default outside list' => [['dracula'], 'cupcake'],
])->throws(InvalidArgumentException::class);

it('registers publishable assets without loading them globally', function () {
    $assets = [
        ...FilamentAsset::getStyles(['nagi/filament-daisy-ui-themes']),
        ...FilamentAsset::getScripts(['nagi/filament-daisy-ui-themes'], withCore: false),
    ];
    expect($assets)->toHaveCount(3);
    foreach ($assets as $asset) {
        expect($asset->isLoadedOnRequest())->toBeTrue()
            ->and(is_file($asset->getPath()))->toBeTrue();
    }
});

it('renders panel-specific initialization and the allowed selector choices', function () {
    $panel = Panel::make()->id('staff')->plugin(
        FilamentDaisyUiThemesPlugin::make()->themes(['nord'])->defaultTheme('nord')
    );
    Filament::setCurrentPanel($panel);
    $panel->boot();
    $head = (string) FilamentView::renderHook(PanelsRenderHook::HEAD_START);
    $switcher = (string) FilamentView::renderHook(PanelsRenderHook::TOPBAR_END);
    $styles = (string) FilamentView::renderHook(PanelsRenderHook::STYLES_AFTER);
    expect($styles)->toContain('data-daisy-theme-styles', file_get_contents(__DIR__ . '/../resources/dist/themes.css'), file_get_contents(__DIR__ . '/../resources/dist/adapter.css'));
    expect($head)->toContain('"panel":"staff"', '"default":"nord"', 'data-daisy-theme-version')
        ->and($switcher)->toContain('Nord', 'Choose theme')->not->toContain('Cupcake', 'Dracula', '@js(');
});

it('returns the current panel plugin instance', function () {
    $plugin = FilamentDaisyUiThemesPlugin::make();
    Filament::setCurrentPanel(Panel::make()->id('admin')->plugin($plugin));
    expect(FilamentDaisyUiThemesPlugin::get())->toBe($plugin);
});

it('encodes panel configuration without permitting script termination', function () {
    $panel = Panel::make()->id('staff</script><script>alert(1)</script>')->plugin(
        FilamentDaisyUiThemesPlugin::make()
    );
    Filament::setCurrentPanel($panel);
    $panel->boot();
    $state = (string) FilamentView::renderHook(PanelsRenderHook::BODY_START);
    expect($state)->not->toContain('<script>alert(1)')
        ->and(substr_count($state, '</script>'))->toBe(1);
    preg_match('/>(.*)<\/script>/s', $state, $matches);
    expect(json_decode($matches[1], true, flags: JSON_THROW_ON_ERROR)['panel'])->toBe($panel->getId());
});

it('does not emit theme initialization for an unconfigured panel', function () {
    $panel = Panel::make()->id('plain');
    Filament::setCurrentPanel($panel);
    $panel->boot();
    expect((string) FilamentView::renderHook(PanelsRenderHook::HEAD_START))->toBe('')
        ->and((string) FilamentView::renderHook(PanelsRenderHook::TOPBAR_END))->toBe('')
        ->and((string) FilamentView::renderHook(PanelsRenderHook::STYLES_AFTER))->toBe('');
});
