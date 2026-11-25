<?php
namespace Tests;
abstract class TestCase extends \Illuminate\Foundation\Testing\TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (!preg_match('/^sbcc_test_[a-f0-9]+$/D',config('database.connections.pgsql.search_path'))) {
            throw new \RuntimeException('Use php tests/run-local.php: tests require an isolated PostgreSQL schema.');
        }
    }
}
