<x-filament::dropdown :teleport="true">
    <x-slot name="trigger">
        <x-filament::button color="gray">Overlay probe</x-filament::button>
    </x-slot>
    <x-filament::dropdown.list>
        <x-filament::dropdown.list.item>Teleported native menu</x-filament::dropdown.list.item>
    </x-filament::dropdown.list>
</x-filament::dropdown>

<x-filament::modal id="compatibility-portal" teleport="body">
    <x-slot name="trigger">
        <x-filament::button color="gray">Portal modal</x-filament::button>
    </x-slot>
    <x-slot name="heading">Teleported modal</x-slot>
    <x-filament::input.wrapper>
        <x-filament::input aria-label="Portal input" value="Native input outside the panel layout" />
    </x-filament::input.wrapper>
</x-filament::modal>
