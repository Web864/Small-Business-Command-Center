<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('sbcc_images',function(Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('slot',120);
            $table->text('data_url');
            $table->timestampTz('updated_at');
            $table->primary(['user_id','slot']);
        });
    }
    public function down(): void { Schema::dropIfExists('sbcc_images'); }
};
