<?php

namespace Compatibility;

use Filament\Widgets\Widget;

class ThemeSample extends Widget
{
    protected string $view = 'compatibility::theme-sample';

    protected static bool $isLazy = false;
}
