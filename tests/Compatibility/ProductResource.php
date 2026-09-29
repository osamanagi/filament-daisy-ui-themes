<?php

namespace Compatibility;

use Filament\Actions\Action;
use Filament\Actions\BulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\Checkbox;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Radio;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Infolists\Components\IconEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Support\Collection;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Product details')->schema([
                TextInput::make('name')->required()->minLength(3)->placeholder('Product name'),
                TextInput::make('price')->numeric()->prefix('$')->required()->minValue(1),
                Select::make('status')->options(['active' => 'Active', 'draft' => 'Draft'])->native(false)->required(),
                TextInput::make('reference')->default('Assigned automatically')->disabled()->dehydrated(false),
                Textarea::make('description')->placeholder('Describe this product')->columnSpanFull(),
            ])->columns(2)->columnSpanFull(),
            Section::make('Publishing')->schema([
                Radio::make('delivery')->options(['digital' => 'Digital', 'physical' => 'Physical'])->default('digital')->inline(),
                DatePicker::make('available_on')->native(false)->displayFormat('Y-m-d'),
                Checkbox::make('approved')->label('Approved for publication'),
                Toggle::make('featured'),
                FileUpload::make('attachment')->disk('local')->directory('compatibility')->acceptedFileTypes(['text/plain'])->maxSize(64)->helperText('Attach a text file up to 64 KB.')->columnSpanFull(),
            ])->columns(2)->columnSpanFull(),
        ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Product overview')->schema([
                TextEntry::make('name'),
                TextEntry::make('price')->money('USD'),
                TextEntry::make('status')->badge()->color(fn (string $state) => $state === 'active' ? 'success' : 'warning'),
                TextEntry::make('delivery'),
                IconEntry::make('approved')->boolean(),
                TextEntry::make('available_on')->date(),
                TextEntry::make('description')->columnSpanFull(),
            ])->columns(2)->columnSpanFull(),
            Section::make('Status palette')->schema(array_map(
                fn (string $color) => TextEntry::make($color)->state(ucfirst($color))->badge()->color($color),
                ['primary', 'info', 'success', 'warning', 'danger']
            ))->columns(3)->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('name')->searchable()->sortable(),
            TextColumn::make('price')->money('USD')->sortable(),
            TextColumn::make('status')->badge()->color(fn (string $state) => $state === 'active' ? 'success' : 'warning'),
        ])->defaultSort('id')->paginationPageOptions([10, 25])
            ->filters([SelectFilter::make('status')->options(['active' => 'Active', 'draft' => 'Draft'])])
            ->toolbarActions([
                BulkAction::make('review')->label('Review selected')->action(fn (Collection $records) => Notification::make()->title($records->count() . ' products selected')->info()->persistent()->send()),
            ])->recordActions([
                ViewAction::make(),
                EditAction::make(),
                Action::make('inspect')->label('Inspect')->modalHeading('Inspect product')
                    ->tooltip('Inspect product without leaving the table')
                    ->schema([
                        TextInput::make('name')->required(),
                        Textarea::make('description'),
                        Select::make('status')->options(['active' => 'Active', 'draft' => 'Draft'])->native(false),
                    ])
                    ->fillForm(fn (Product $record) => $record->toArray())
                    ->action(fn () => null),
                Action::make('archivePreview')->label('Archive preview')->color('danger')->requiresConfirmation()
                    ->modalHeading('Archive preview')->modalDescription('This fixture sends a notification without changing the product.')
                    ->action(fn () => Notification::make()->title('Archive preview confirmed')->success()->persistent()->send()),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListProducts::route('/'), 'create' => CreateProduct::route('/create'),
            'view' => ViewProduct::route('/{record}'), 'edit' => EditProduct::route('/{record}/edit'),
        ];
    }
}
