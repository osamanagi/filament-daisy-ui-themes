{{-- Livewire does not await newly inserted stylesheets before rendering a new panel. --}}
<style data-daisy-theme-styles="{{ hash('sha256', $styles) }}">{!! $styles !!}</style>
