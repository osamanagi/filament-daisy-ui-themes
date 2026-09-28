<?php

namespace Nagi\FilamentDaisyUiThemes\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \Nagi\FilamentDaisyUiThemes\FilamentDaisyUiThemes
 */
class FilamentDaisyUiThemes extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \Nagi\FilamentDaisyUiThemes\FilamentDaisyUiThemes::class;
    }
}
