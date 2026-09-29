<?php

namespace Compatibility;

use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class OverviewStats extends StatsOverviewWidget
{
    protected static bool $isLazy = false;

    protected function getStats(): array
    {
        return [
            Stat::make('Products', Product::count())->description('Catalog entries')->color('primary'),
            Stat::make('Active', Product::where('status', 'active')->count())->description('Ready to publish')->color('success'),
            Stat::make('Drafts', Product::where('status', 'draft')->count())->description('Awaiting review')->color('warning'),
        ];
    }
}
