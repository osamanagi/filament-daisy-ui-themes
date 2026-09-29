<?php

namespace Nagi\FilamentDaisyUiThemes;

use Filament\Contracts\Plugin;
use Filament\Enums\ThemeMode;
use Filament\Panel;
use Filament\View\PanelsRenderHook;
use InvalidArgumentException;

class FilamentDaisyUiThemesPlugin implements Plugin
{
    protected array $themes = ['cupcake', 'nord', 'dracula'];

    protected string $defaultTheme = 'cupcake';

    public function getId(): string
    {
        return 'filament-daisy-ui-themes';
    }

    public function themes(array $themes): static
    {
        $this->themes = $themes;

        return $this;
    }

    public function getThemes(): array
    {
        return $this->themes;
    }

    public function defaultTheme(string $theme): static
    {
        $this->defaultTheme = $theme;

        return $this;
    }

    public function getDefaultTheme(): string
    {
        return $this->defaultTheme;
    }

    public function register(Panel $panel): void
    {
        $manifest = json_decode(file_get_contents(__DIR__ . '/../resources/dist/theme-data.json'), true, flags: JSON_THROW_ON_ERROR)['themes'];
        if ($this->themes === []) {
            throw new InvalidArgumentException('Configure at least one daisyUI theme.');
        }
        foreach ($this->themes as $theme) {
            if (! is_string($theme) || ! isset($manifest[$theme])) {
                throw new InvalidArgumentException('Supported daisyUI themes are: ' . implode(', ', array_keys($manifest)) . '.');
            }
        }
        if (! in_array($this->defaultTheme, $this->themes, true)) {
            throw new InvalidArgumentException('The default daisyUI theme must be in the panel theme list.');
        }
        $themes = array_values(array_unique($this->themes));
        $state = [
            'panel' => $panel->getId(),
            'default' => $this->defaultTheme,
            'themes' => array_combine($themes, array_map(fn($theme) => $manifest[$theme]['appearance'], $themes)),
        ];
        $json = json_encode($state, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);

        $inlineStyles = function () use ($themes): string {
            $styles = '';
            foreach ($themes as $theme) {
                $styles .= file_get_contents(__DIR__ . "/../resources/dist/themes/{$theme}.css");
            }

            return $styles . file_get_contents(__DIR__ . '/../resources/dist/adapter.css');
        };
        $script = file_get_contents(__DIR__ . '/../resources/dist/filament-daisy-ui-themes.js');

        $panel->darkMode()->themeSwitcher(false)
            ->defaultThemeMode(ThemeMode::System)
            ->colors($manifest[$this->defaultTheme]['palettes'])
            ->renderHook(PanelsRenderHook::HEAD_START, fn() => view('filament-daisy-ui-themes::head', ['json' => $json, 'script' => $script]))
            ->renderHook(PanelsRenderHook::STYLES_AFTER, fn() => view('filament-daisy-ui-themes::styles', ['styles' => $inlineStyles()]))
            ->renderHook(PanelsRenderHook::HEAD_END, fn() => view('filament-daisy-ui-themes::sync'))
            ->renderHook(PanelsRenderHook::BODY_START, fn() => view('filament-daisy-ui-themes::state', ['json' => $json]))
            ->renderHook(PanelsRenderHook::BODY_END, fn() => view('filament-daisy-ui-themes::activate'))
            ->renderHook(PanelsRenderHook::TOPBAR_END, fn() => view('filament-daisy-ui-themes::switcher', ['themes' => $themes]));
    }

    public function boot(Panel $panel): void {}

    public static function make(): static
    {
        return app(static::class);
    }

    public static function get(): static
    {
        $plugin = filament(app(static::class)->getId());
        if (! $plugin instanceof static) {
            throw new \LogicException('The current panel does not contain the expected daisyUI plugin instance.');
        }

        return $plugin;
    }
}
