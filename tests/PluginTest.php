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
        ->and($panel->hasDarkModeForced())->toBeFalse();

    if (method_exists($panel, 'hasThemeSwitcher')) {
        expect($panel->hasThemeSwitcher())->toBeFalse();
    }
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
        ...FilamentAsset::getStyles(['osamanagi/filament-daisy-ui-themes']),
        ...FilamentAsset::getScripts(['osamanagi/filament-daisy-ui-themes'], withCore: false),
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
    expect($styles)->toContain('data-daisy-theme-styles', file_get_contents(__DIR__ . '/../resources/dist/themes/nord.css'), file_get_contents(__DIR__ . '/../resources/dist/adapter.css'), '[data-daisy-theme-swatch=nord]', '--fdut-swatch-primary')
        ->not->toContain('[data-theme=cupcake]', '[data-theme=dracula]', '[data-daisy-theme-swatch=cupcake]');
    expect($head)->toContain('"panel":"staff"', '"default":"nord"', 'data-daisy-theme-version')
        ->and($switcher)->toContain('Nord', 'Choose theme', 'data-daisy-theme-swatch="nord"')
        ->not->toContain('Cupcake', 'Dracula', 'data-daisy-theme-swatch="cupcake"', '@js(');
});

it('defaults the switcher to the end of the topbar', function () {
    expect(FilamentDaisyUiThemesPlugin::make()->getThemeSwitcherHook())
        ->toBe(PanelsRenderHook::TOPBAR_END);
});

it('renders the switcher in the configured render hook', function () {
    $panel = Panel::make()->id('staff')->plugin(
        FilamentDaisyUiThemesPlugin::make()
            ->themes(['nord'])
            ->defaultTheme('nord')
            ->themeSwitcherHook(PanelsRenderHook::SIDEBAR_FOOTER)
    );
    Filament::setCurrentPanel($panel);
    $panel->boot();

    expect((string) FilamentView::renderHook(PanelsRenderHook::SIDEBAR_FOOTER))
        ->toContain('Nord', 'Choose theme')
        ->and((string) FilamentView::renderHook(PanelsRenderHook::TOPBAR_END))->toBe('');
});

it('shows the switcher by default and can hide it', function () {
    expect(FilamentDaisyUiThemesPlugin::make()->hasThemeSwitcher())->toBeTrue()
        ->and(FilamentDaisyUiThemesPlugin::make()->themeSwitcher(false)->hasThemeSwitcher())->toBeFalse();
});

it('applies the theme without rendering a switcher when it is hidden', function () {
    $panel = Panel::make()->id('staff')->plugin(
        FilamentDaisyUiThemesPlugin::make()
            ->themes(['nord'])
            ->defaultTheme('nord')
            ->themeSwitcher(false)
    );
    Filament::setCurrentPanel($panel);
    $panel->boot();

    expect((string) FilamentView::renderHook(PanelsRenderHook::TOPBAR_END))->toBe('')
        ->and((string) FilamentView::renderHook(PanelsRenderHook::HEAD_START))->toContain('"default":"nord"')
        ->and((string) FilamentView::renderHook(PanelsRenderHook::STYLES_AFTER))->toContain(file_get_contents(__DIR__ . '/../resources/dist/themes/nord.css'))
        ->and((string) FilamentView::renderHook(PanelsRenderHook::BODY_END))->not->toBe('');
});

it('leaves a custom switcher hook empty when the switcher is hidden', function () {
    $panel = Panel::make()->id('staff')->plugin(
        FilamentDaisyUiThemesPlugin::make()
            ->themes(['nord'])
            ->defaultTheme('nord')
            ->themeSwitcherHook(PanelsRenderHook::SIDEBAR_FOOTER)
            ->themeSwitcher(false)
    );
    Filament::setCurrentPanel($panel);
    $panel->boot();

    expect((string) FilamentView::renderHook(PanelsRenderHook::TOPBAR_END))->toBe('')
        ->and((string) FilamentView::renderHook(PanelsRenderHook::SIDEBAR_FOOTER))->toBe('');
});

it('allows every shipped theme at once', function () {
    $manifest = json_decode(file_get_contents(__DIR__ . '/../resources/dist/theme-data.json'), true, flags: JSON_THROW_ON_ERROR)['themes'];
    $plugin = FilamentDaisyUiThemesPlugin::make()->allThemes();

    expect($plugin->getThemes())->toHaveCount(count($manifest))
        ->and(array_diff(array_keys($manifest), $plugin->getThemes()))->toBe([])
        ->and(array_diff($plugin->getThemes(), array_keys($manifest)))->toBe([])
        ->and($plugin->getDefaultTheme())->toBe('cupcake');
});

it('allows every light theme or every dark theme at once', function () {
    $manifest = json_decode(file_get_contents(__DIR__ . '/../resources/dist/theme-data.json'), true, flags: JSON_THROW_ON_ERROR)['themes'];
    $appearances = fn (array $themes): array => array_values(array_unique(array_map(fn (string $theme): string => $manifest[$theme]['appearance'], $themes)));

    $light = FilamentDaisyUiThemesPlugin::make()->allLightThemes();
    $dark = FilamentDaisyUiThemesPlugin::make()->allDarkThemes();

    expect($light->getThemes())->not->toBeEmpty()
        ->and($appearances($light->getThemes()))->toBe(['light'])
        ->and($dark->getThemes())->not->toBeEmpty()
        ->and($appearances($dark->getThemes()))->toBe(['dark'])
        ->and(array_intersect($light->getThemes(), $dark->getThemes()))->toBe([])
        ->and(count($light->getThemes()) + count($dark->getThemes()))->toBe(count($manifest));
});

it('resets an excluded default theme to the first entry of a bulk list', function () {
    $plugin = FilamentDaisyUiThemesPlugin::make()->allDarkThemes();

    expect($plugin->getThemes())->toContain($plugin->getDefaultTheme())
        ->and($plugin->getDefaultTheme())->toBe($plugin->getThemes()[0]);
});

it('keeps the default theme when a bulk list includes it', function () {
    expect(FilamentDaisyUiThemesPlugin::make()->allThemes()->getDefaultTheme())->toBe('cupcake')
        ->and(FilamentDaisyUiThemesPlugin::make()->allLightThemes()->getDefaultTheme())->toBe('cupcake');
});

it('inlines only the themes a bulk list allows', function () {
    $panel = Panel::make()->id('gallery')->plugin(FilamentDaisyUiThemesPlugin::make()->allDarkThemes());
    Filament::setCurrentPanel($panel);
    $panel->boot();

    expect((string) FilamentView::renderHook(PanelsRenderHook::STYLES_AFTER))
        ->toContain('[data-theme=abyss]', '[data-theme=dracula]')
        ->not->toContain('[data-theme=cupcake]', '[data-theme=nord]');
});

it('still rejects a default theme chosen outside a bulk list', function () {
    Panel::make()->id('admin')->plugin(
        FilamentDaisyUiThemesPlugin::make()->allDarkThemes()->defaultTheme('cupcake')
    );
})->throws(InvalidArgumentException::class);

it('caps the switcher dropdown height so a wide allowlist scrolls', function () {
    $panel = Panel::make()->id('gallery')->plugin(FilamentDaisyUiThemesPlugin::make()->allThemes());
    Filament::setCurrentPanel($panel);
    $panel->boot();

    expect((string) FilamentView::renderHook(PanelsRenderHook::TOPBAR_END))
        ->toContain('max-height: min(24rem, 60vh)', 'fi-scrollable');
});

it('themes Filament surfaces with the daisyUI surface tokens', function () {
    $panel = Panel::make()->id('staff')->plugin(
        FilamentDaisyUiThemesPlugin::make()->themes(['retro'])->defaultTheme('retro')
    );
    Filament::setCurrentPanel($panel);
    $panel->boot();

    expect((string) FilamentView::renderHook(PanelsRenderHook::STYLES_AFTER))
        ->toContain(
            // Elevated surfaces are painted in a light theme only; a dark theme
            // already resolves them through the ramp, where --gray-900 is
            // base-100.
            ':root[data-theme]:not(.dark) :is(.fi-topbar,.fi-ta-ctn',
            '.fi-simple-main',
            // Inset surfaces are a neutral white or white wash in both
            // appearances, so this rule is deliberately unscoped.
            ':root[data-theme] .fi-input-wrp:not(.fi-disabled),:root[data-theme] .fi-fo-file-upload .filepond--root{background-color:var(--color-base-200)}',
        );
});

it('keeps every dark theme page on base-100 with the surfaces above it', function () {
    $manifest = json_decode(file_get_contents(__DIR__ . '/../resources/dist/theme-data.json'), true, flags: JSON_THROW_ON_ERROR)['themes'];
    $lightness = function (string $value): float {
        preg_match('/[\d.]+/', $value, $match);
        $number = (float) $match[0];

        return $number > 1.5 ? $number / 100 : $number;
    };
    $dark = array_filter($manifest, fn (array $theme): bool => $theme['appearance'] === 'dark');

    expect($dark)->toHaveCount(14);

    foreach ($dark as $name => $theme) {
        preg_match(
            '/--color-base-100:\s*([^;}]+)/',
            file_get_contents(__DIR__ . "/../resources/dist/themes/{$name}.css"),
            $match,
        );
        $page = $lightness($theme['palettes']['gray']['950']);

        // A dark theme page must be daisyUI's own base-100, not base-300.
        expect($page)->toEqualWithDelta($lightness($match[1]), 1e-6, "{$name}: the page must be base-100")
            // And the cards, tables and forms must sit above it.
            ->and($lightness($theme['palettes']['gray']['900']))
            ->toBeGreaterThan($page, "{$name}: the surfaces must sit above the page");
    }
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

it('advertises every shipped theme and keeps verified themes in the manifest', function () {
    $manifest = json_decode(file_get_contents(__DIR__ . '/../resources/dist/theme-data.json'), true, flags: JSON_THROW_ON_ERROR);
    expect($manifest['themes'])->toHaveKeys(['cupcake', 'nord', 'dracula', 'abyss', 'acid', 'business', 'wireframe'])
        ->and($manifest['verified'])->toContain('cupcake', 'nord', 'dracula')
        ->and($manifest['audited'])->toHaveCount(count($manifest['themes']))
        ->and(array_diff($manifest['verified'], array_keys($manifest['themes'])))->toBe([])
        ->and(array_diff($manifest['audited'], array_keys($manifest['themes'])))->toBe([]);
});

it('inlines only the allowlisted themes for a panel', function () {
    $panel = Panel::make()->id('staff')->plugin(
        FilamentDaisyUiThemesPlugin::make()->themes(['business', 'acid'])->defaultTheme('business')
    );
    Filament::setCurrentPanel($panel);
    $panel->boot();
    $styles = (string) FilamentView::renderHook(PanelsRenderHook::STYLES_AFTER);
    expect($styles)
        ->toContain(file_get_contents(__DIR__ . '/../resources/dist/themes/business.css'), file_get_contents(__DIR__ . '/../resources/dist/themes/acid.css'))
        ->not->toContain('[data-theme=cupcake]', '[data-theme=dracula]');
});
