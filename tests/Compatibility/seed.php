<?php

// Run only inside the disposable fixture application.
use App\Models\User;
use Compatibility\Product;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

require getcwd() . '/vendor/autoload.php';
$app = require getcwd() . '/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (! Schema::hasTable('products')) {
    Schema::create('products', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->decimal('price', 8, 2);
        $table->string('status');
        $table->boolean('featured')->default(false);
        $table->text('description')->nullable();
        $table->timestamps();
    });
}

if (! Schema::hasColumn('products', 'delivery')) {
    Schema::table('products', function (Blueprint $table) {
        $table->string('delivery')->default('digital');
        $table->boolean('approved')->default(false);
        $table->date('available_on')->nullable();
        $table->string('attachment')->nullable();
    });
}

User::updateOrCreate(['email' => 'tester@example.test'], [
    'name' => 'Compatibility Tester', 'password' => 'fixture-password',
]);
foreach (range(1, 15) as $index) {
    Product::updateOrCreate(['name' => sprintf('Sample product %02d', $index)], [
        'price' => $index * 12.5, 'status' => $index % 3 ? 'active' : 'draft',
        'description' => 'Native Filament controls with daisyUI theme tokens.',
        'delivery' => $index % 2 ? 'digital' : 'physical', 'approved' => true,
        'available_on' => '2026-09-28',
    ]);
}
