<?php

namespace Compatibility;

use Filament\Actions\Action;
use Filament\Actions\CreateAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;

class ListProducts extends ListRecords
{
    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
            Action::make('notifications')->label('Show notifications')->color('gray')->action(function () {
                foreach (['info', 'success', 'warning', 'danger'] as $status) {
                    Notification::make()->title(ucfirst($status) . ' notification')
                        ->body('Native Filament feedback.')->status($status)->persistent()->send();
                }
            }),
            Action::make('unavailable')->label('Unavailable')->disabled()->color('gray'),
        ];
    }
}
