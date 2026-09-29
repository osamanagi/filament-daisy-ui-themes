<x-filament-widgets::widget>
    <x-filament::section heading="Theme integration">
        @if (filament()->getId() === 'baseline')
            <p>Stock Filament baseline. The theme plugin is not registered.</p>
        @else
            <p>A daisyUI badge alongside native Filament components:</p>
            <span class="badge badge-info" data-testid="daisy-sample">Theme preview</span>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
