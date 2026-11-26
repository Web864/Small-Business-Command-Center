<?php
namespace Tests\Feature;

use Tests\TestCase;

/** Needs vendor/ and a test database (not runnable in the offline authoring sandbox). */
class MarketingRoutesTest extends TestCase
{
    public function test_public_pages_are_served_as_html_without_login(): void
    {
        foreach (['/', '/features', '/inventory-management', '/order-management', '/invoice-management', '/expense-tracking', '/pricing-calculator', '/customer-management', '/faq'] as $path) {
            $r = $this->get($path);
            $r->assertOk();
            $this->assertStringContainsString('<h1>', $r->getContent());
            $this->assertStringContainsString('rel="canonical"', $r->getContent());
        }
    }
    public function test_trailing_slash_redirects_permanently_to_the_canonical_url(): void
    {
        $this->get('/features/')->assertStatus(301)->assertRedirect('/features');
    }
    public function test_robots_and_sitemap_exist_and_sitemap_is_production_only(): void
    {
        $this->get('/robots.txt')->assertOk()->assertSee('Sitemap:', false);
        $this->get('/sitemap.xml')->assertStatus(app()->environment('production') ? 200 : 404);
    }
    public function test_non_production_pages_are_noindex(): void
    {
        if (app()->environment('production')) { $this->markTestSkipped('production only indexes'); }
        $this->get('/features')->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    public function test_private_app_urls_are_noindex_and_never_in_sitemap(): void
    {
        $this->get('/orders')->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }
}
