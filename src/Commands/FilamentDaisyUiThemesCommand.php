<?php

namespace Nagi\FilamentDaisyUiThemes\Commands;

use Illuminate\Console\Command;

class FilamentDaisyUiThemesCommand extends Command
{
    public $signature = 'filament-daisy-ui-themes';

    public $description = 'My command';

    public function handle(): int
    {
        $this->comment('All done');

        return self::SUCCESS;
    }
}
