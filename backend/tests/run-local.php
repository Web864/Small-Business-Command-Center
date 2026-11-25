<?php
// Additive schema only. Never reset, truncate or migrate the application's public schema.
require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (!$app->environment('local')) { fwrite(STDERR,"Local environment required.\n"); exit(1); }
$schema = 'sbcc_test_'.bin2hex(random_bytes(6));
Illuminate\Support\Facades\DB::statement('CREATE SCHEMA "'.$schema.'"');
putenv('DB_SCHEMA='.$schema);
putenv('APP_ENV=testing');
putenv('SESSION_DRIVER=array');
putenv('CACHE_STORE=array');
$app['config']->set('database.connections.pgsql.search_path',$schema);
Illuminate\Support\Facades\DB::purge('pgsql');
Illuminate\Support\Facades\Artisan::call('migrate',['--force'=>true]);
echo "Isolated PostgreSQL schema created; application tables untouched.\n";
passthru('"'.PHP_BINARY.'" "'.dirname(__DIR__).'/vendor/phpunit/phpunit/phpunit"', $status);
echo "Isolated test schema retained: ".$schema."\n";
exit($status);
