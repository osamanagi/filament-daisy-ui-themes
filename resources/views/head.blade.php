{{-- Synchronous on first paint AND when Livewire first enters a themed panel. --}}
<script data-navigate-once data-daisy-theme-version="{{ hash('sha256', $script) }}">{!! $script !!}</script>
<script>window.filamentDaisyThemes.activate({!! $json !!})</script>
