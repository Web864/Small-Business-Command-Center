<?php
namespace App\Http\Controllers;

use App\Support\Marketing\Pages;
use App\Support\Marketing\Site;
use Illuminate\Http\Request;

/** Public, crawlable marketing pages plus sitemap.xml/robots.txt, and the private SPA shell for signed-in URLs. */
class MarketingController extends Controller
{
    private function site(): Site
    {
        // Only production is indexable, so staging/local copies never leak into search engines.
        return new Site((string) config('app.url'), app()->environment('production'));
    }

    public function page(Request $request, string $slug = '')
    {
        $path = $request->getPathInfo();
        if ($path !== '/' && str_ends_with($path, '/')) return redirect(rtrim($path, '/'), 301); // one URL per page
        $site = $this->site();
        $html = $site->render($slug);
        abort_if($html === null, 404);
        $headers = ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'public, max-age=300'];
        if (!app()->environment('production')) $headers['X-Robots-Tag'] = 'noindex, nofollow';
        return response($html, 200, $headers);
    }

    public function sitemap()
    {
        $site = $this->site();
        abort_unless(app()->environment('production'), 404);
        return response($site->sitemap(), 200, ['Content-Type' => 'application/xml; charset=UTF-8', 'Cache-Control' => 'public, max-age=3600']);
    }

    public function robots()
    {
        return response($this->site()->robots(), 200, ['Content-Type' => 'text/plain; charset=UTF-8', 'Cache-Control' => 'public, max-age=3600']);
    }

    /** Signed-in app pages (/orders, /products, ...). The SPA enforces login; these URLs are never indexed. */
    public function app(Request $request)
    {
        $headers = ['X-Robots-Tag' => 'noindex, nofollow', 'Cache-Control' => 'no-store'];
        $spa = public_path('spa/index.html');
        if (is_file($spa)) return response()->file($spa, $headers + ['Content-Type' => 'text/html; charset=UTF-8']);
        if (app()->environment('local')) return redirect(rtrim((string) config('app.frontend_url'), '/') . $request->getPathInfo());
        abort(503, 'Frontend build is missing. Run the frontend build:laravel script before deploying.');
    }
}
