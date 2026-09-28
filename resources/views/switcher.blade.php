<div
    x-data="{ selectedTheme: window.filamentDaisyThemes.current() }"
    x-on:filament-daisy-theme-changed.window="selectedTheme = $event.detail"
    data-daisy-theme-switcher
>
    <x-filament::dropdown placement="bottom-end" :teleport="true">
        <x-slot name="trigger">
            <x-filament::icon-button x-ref="themeTrigger" icon="heroicon-o-swatch" :label="__('filament-daisy-ui-themes::themes.choose')" />
        </x-slot>

        <x-filament::dropdown.list :aria-label="__('filament-daisy-ui-themes::themes.choose')">
            @foreach ($themes as $theme)
                <x-filament::dropdown.list.item
                    x-bind:aria-pressed="selectedTheme === '{{ $theme }}'"
                    x-on:click="window.filamentDaisyThemes.select('{{ $theme }}'); close(); $nextTick(() => $refs.themeTrigger.focus())"
                    data-dropdown-escape
                    :data-dropdown-autofocus="$loop->first ? true : null"
                >
                    {{ ucfirst($theme) }}
                    <span aria-hidden="true" x-show="selectedTheme === '{{ $theme }}'">✓</span>
                </x-filament::dropdown.list.item>
            @endforeach
        </x-filament::dropdown.list>
    </x-filament::dropdown>
</div>
