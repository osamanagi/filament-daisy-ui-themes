<div
    x-data="{ selectedTheme: window.filamentDaisyThemes.current() }"
    x-on:filament-daisy-theme-changed.window="selectedTheme = $event.detail"
    data-daisy-theme-switcher
>
    {{-- Capped so a wide allowlist scrolls instead of filling the viewport.
         Filament puts max-height on the panel and adds fi-scrollable. --}}
    <x-filament::dropdown
        placement="bottom-end"
        :teleport="true"
        max-height="min(24rem, 60vh)"
    >
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
                    {{-- daisyUI's theme preview: base-content, primary, secondary
                         and accent on that theme's own base-100. --}}
                    <span data-daisy-theme-swatch="{{ $theme }}" aria-hidden="true">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                    {{ ucfirst($theme) }}
                    <span aria-hidden="true" x-show="selectedTheme === '{{ $theme }}'">✓</span>
                </x-filament::dropdown.list.item>
            @endforeach
        </x-filament::dropdown.list>
    </x-filament::dropdown>
</div>
