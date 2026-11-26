<?php
namespace App\Support\Marketing;

/** Renders public marketing pages as plain, crawlable HTML (no JavaScript needed to read any content). */
final class Site
{
    /** Private, login-only app URLs: never indexed. Keep in sync with frontend/src/lib/routes.ts. */
    public const APP_PATHS = ['dashboard', 'orders', 'products', 'customers', 'expenses', 'content-planner', 'pricing-lab', 'profile'];

    public function __construct(private string $baseUrl, private bool $indexable = true)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    public function canonical(string $slug): string { return $this->baseUrl . ($slug === '' ? '/' : '/' . $slug); }
    private static function e(string $v): string { return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
    private static function json(array $d): string { return json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?: '{}'; }

    /** @return array<int,array<string,mixed>> */
    public function schema(string $slug, array $page): array
    {
        $name = Pages::NAME;
        $url = $this->canonical($slug);
        $graph = [];
        if ($slug === '') {
            $graph[] = ['@context' => 'https://schema.org', '@type' => 'Organization', '@id' => $this->baseUrl . '/#organization', 'name' => $name, 'url' => $this->baseUrl . '/'];
            $graph[] = ['@context' => 'https://schema.org', '@type' => 'WebSite', '@id' => $this->baseUrl . '/#website', 'url' => $this->baseUrl . '/', 'name' => $name, 'publisher' => ['@id' => $this->baseUrl . '/#organization'], 'inLanguage' => 'en'];
            // No "offers": pricing is not final, and we never publish a placeholder price.
            $graph[] = ['@context' => 'https://schema.org', '@type' => 'SoftwareApplication', '@id' => $this->baseUrl . '/#software', 'name' => $name, 'alternateName' => 'SBCC', 'applicationCategory' => 'BusinessApplication', 'operatingSystem' => 'Web browser', 'url' => $this->baseUrl . '/', 'description' => $page['desc'],
                'featureList' => ['Inventory and product tracking', 'Order and payment management', 'Customer records', 'PDF invoices', 'Expense tracking', 'Product pricing calculator', 'Content planner']];
        }
        $graph[] = ['@context' => 'https://schema.org', '@type' => 'WebPage', '@id' => $url . '#webpage', 'url' => $url, 'name' => $page['title'], 'description' => $page['desc'], 'inLanguage' => 'en', 'dateModified' => Pages::UPDATED, 'isPartOf' => ['@id' => $this->baseUrl . '/#website']];
        if ($slug !== '') {
            $graph[] = ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => $this->baseUrl . '/'],
                ['@type' => 'ListItem', 'position' => 2, 'name' => $page['nav'], 'item' => $url],
            ]];
        }
        if (!empty($page['calculator'])) {
            $graph[] = ['@context' => 'https://schema.org', '@type' => 'WebApplication', 'name' => 'Product pricing and profit margin calculator', 'url' => $url, 'applicationCategory' => 'BusinessApplication', 'operatingSystem' => 'Web browser', 'isAccessibleForFree' => true];
        }
        if ($slug === 'faq' && !empty($page['faq'])) {
            // Valid markup that matches the visible Q&A. Google no longer shows FAQ rich results, so this is for machine readability only.
            $graph[] = ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => array_map(fn($f) => ['@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f[1]]], $page['faq'])];
        }
        return $graph;
    }

    public function render(string $slug): ?string
    {
        $all = Pages::all();
        if (!isset($all[$slug])) return null;
        $p = $all[$slug];
        $e = fn(string $v) => self::e($v);
        $url = $this->canonical($slug);
        $robots = $this->indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';

        $nav = '';
        foreach ($all as $s => $pg) {
            if (in_array($s, ['faq'], true)) continue;
            $href = $s === '' ? '/' : '/' . $s;
            $nav .= '<li><a href="' . $href . '"' . ($s === $slug ? ' aria-current="page"' : '') . '>' . $e($pg['nav']) . '</a></li>';
        }
        $nav .= '<li><a href="/faq"' . ($slug === 'faq' ? ' aria-current="page"' : '') . '>FAQ</a></li>';

        $body = '';
        foreach ($p['sections'] as [$h2, $html]) $body .= '<section><h2>' . $e($h2) . '</h2>' . $html . '</section>';
        if (!empty($p['calculator'])) $body = $this->calculator() . $body;

        $faq = '';
        if (!empty($p['faq'])) {
            $faq = '<section><h2>' . ($slug === 'faq' ? 'Questions and answers' : 'Common questions') . '</h2>';
            foreach ($p['faq'] as [$q, $a]) $faq .= '<h3>' . $e($q) . '</h3><p>' . $e($a) . '</p>';
            $faq .= '</section>';
        }

        $related = '';
        if (!empty($p['related'])) {
            $related = '<nav class="related" aria-label="Related pages"><h2>Keep reading</h2><ul>';
            foreach ($p['related'] as $r) if (isset($all[$r])) $related .= '<li><a href="/' . $e($r) . '">' . $e($all[$r]['h1']) . '</a></li>';
            $related .= '</ul></nav>';
        }

        $ld = '';
        foreach ($this->schema($slug, $p) as $block) $ld .= '<script type="application/ld+json">' . self::json($block) . '</script>';

        $legacy = $slug === '' ? '<script>(function(){var m={Dashboard:"dashboard",Orders:"orders",Products:"products",Customers:"customers",Expenses:"expenses","Content Planner":"content-planner","Pricing Lab":"pricing-lab",Profile:"profile"};try{var h=decodeURIComponent(location.hash.slice(1));if(m[h])location.replace("/"+m[h]);}catch(e){}})();</script>' : '';
        $script = !empty($p['calculator']) ? '<script src="/js/pricing-calculator.js" defer></script>' : '';

        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<title>' . $e($p['title']) . '</title>'
            . '<meta name="description" content="' . $e($p['desc']) . '">'
            . '<meta name="robots" content="' . $robots . '">'
            . '<link rel="canonical" href="' . $e($url) . '">'
            . '<meta property="og:type" content="website"><meta property="og:site_name" content="' . $e(Pages::NAME) . '">'
            . '<meta property="og:title" content="' . $e($p['title']) . '"><meta property="og:description" content="' . $e($p['desc']) . '">'
            . '<meta property="og:url" content="' . $e($url) . '"><meta property="og:locale" content="en_US">'
            . '<meta name="twitter:card" content="summary"><meta name="twitter:title" content="' . $e($p['title']) . '"><meta name="twitter:description" content="' . $e($p['desc']) . '">'
            . '<meta name="theme-color" content="#167b68">'
            . '<link rel="stylesheet" href="/css/marketing.css">' . $ld . '</head><body>'
            . '<a class="skip" href="#main">Skip to main content</a>'
            . '<header class="site-header"><a class="brand" href="/">' . $e(Pages::NAME) . '</a><nav aria-label="Main"><ul>' . $nav . '</ul></nav><a class="btn" href="/login">Sign in</a></header>'
            . '<main id="main"><div class="hero"><h1>' . $e($p['h1']) . '</h1><p class="lead">' . $e($p['lead']) . '</p><p><a class="btn btn-primary" href="/login">Get started</a> <a class="btn" href="/features">See all features</a></p></div>'
            . $body . $faq . $related
            . '<p class="updated">Last updated: <time datetime="' . Pages::UPDATED . '">' . Pages::UPDATED . '</time></p></main>'
            . '<footer class="site-footer"><p>' . $e(Pages::NAME) . ' is business management software for small business owners and online sellers.</p><p><a href="/features">Features</a> · <a href="/faq">FAQ</a> · <a href="/login">Sign in</a></p></footer>'
            . $legacy . $script . '</body></html>';
    }

    private function calculator(): string
    {
        return '<section id="calculator" class="calc" aria-labelledby="calc-h"><h2 id="calc-h">Pricing calculator</h2>'
            . '<form id="pricing-form" novalidate><div class="grid">'
            . '<label>Product cost<input id="c-cost" inputmode="decimal" value="8"></label>'
            . '<label>Packaging<input id="c-pack" inputmode="decimal" value="2"></label>'
            . '<label>Shipping<input id="c-ship" inputmode="decimal" value="3"></label>'
            . '<label>Profit you want per sale<input id="c-desired" inputmode="decimal" value="10"></label>'
            . '<label>Percentage fee (%)<input id="c-fee" inputmode="decimal" value="6.5"></label>'
            . '<label>Fixed fee per sale<input id="c-fixed" inputmode="decimal" value="0.30"></label>'
            . '</div></form>'
            . '<div id="c-error" class="err" role="alert"></div>'
            . '<dl id="c-result" aria-live="polite"><div><dt>Minimum selling price</dt><dd id="r-price">24.92</dd></div><div><dt>Fees on that price</dt><dd id="r-fees">1.92</dd></div><div><dt>Profit per sale</dt><dd id="r-profit">10.00</dd></div><div><dt>Profit margin</dt><dd id="r-margin">40.1%</dd></div><div><dt>Markup on cost</dt><dd id="r-markup">76.9%</dd></div></dl>'
            . '<noscript><p>Enable JavaScript to recalculate. The example values above are explained in the worked example below.</p></noscript></section>';
    }

    public function sitemap(): string
    {
        $x = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach (array_keys(Pages::all()) as $slug) {
            $x .= '<url><loc>' . self::e($this->canonical($slug)) . '</loc><lastmod>' . Pages::UPDATED . '</lastmod></url>';
        }
        return $x . '</urlset>';
    }

    public function robots(): string
    {
        if (!$this->indexable) return "User-agent: *\nDisallow: /\n";
        $lines = ["User-agent: *", "Allow: /"];
        foreach (array_merge(self::APP_PATHS, ['api', 'login', 'local-login', 'spa', 'app']) as $p) $lines[] = 'Disallow: /' . $p . ($p === 'api' || $p === 'spa' || $p === 'app' ? '/' : '');
        $lines[] = '';
        $lines[] = 'Sitemap: ' . $this->baseUrl . '/sitemap.xml';
        return implode("\n", $lines) . "\n";
    }
}
