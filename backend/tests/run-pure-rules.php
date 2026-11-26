<?php
// Runs tests/Unit/WorkspaceRulesTest.php WITHOUT composer/phpunit/database (used where vendor/ is unavailable).
// With a normal checkout use `php vendor/bin/phpunit` instead.
if (!class_exists(\PHPUnit\Framework\TestCase::class)) {
    eval('namespace PHPUnit\Framework; abstract class TestCase {
        public static int $assertions = 0;
        protected function fail(string $m): never { throw new \RuntimeException($m); }
        public function assertNull($v, string $m = ""): void { self::$assertions++; if ($v !== null) $this->fail("Expected null, got ".var_export($v,true)." $m"); }
        public function assertNotNull($v, string $m = ""): void { self::$assertions++; if ($v === null) $this->fail("Expected non-null $m"); }
        public function assertSame($e, $a, string $m = ""): void { self::$assertions++; if ($e !== $a) $this->fail("Expected ".var_export($e,true)." got ".var_export($a,true)." $m"); }
        public function assertStringContainsString(string $n, string $h, string $m = ""): void { self::$assertions++; if (!str_contains($h, $n)) $this->fail("Expected \"$h\" to contain \"$n\" $m"); }
    }');
}
require __DIR__.'/../app/Support/WorkspaceRules.php';
require __DIR__.'/Unit/WorkspaceRulesTest.php';
$class = \Tests\Unit\WorkspaceRulesTest::class; $pass = 0; $fail = 0;
foreach (get_class_methods($class) as $method) {
    if (!str_starts_with($method, 'test_')) continue;
    try { (new $class())->$method(); $pass++; echo "PASS $method\n"; }
    catch (\Throwable $e) { $fail++; echo "FAIL $method: ".$e->getMessage()."\n"; }
}
echo "\n$pass passed, $fail failed, ".\PHPUnit\Framework\TestCase::$assertions." assertions\n";
exit($fail ? 1 : 0);
