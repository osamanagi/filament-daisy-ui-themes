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
            // A stat without a colour uses the neutral chart fill, which is what
            // the audit checks against the page and card backgrounds.
            Stat::make('Catalog size', Product::count())->description('All products')->chart([4, 6, 5, 8, 7, 10, 9, 12]),
        ];
    }
}
