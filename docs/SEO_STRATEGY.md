# SBCC — SEO, AEO & GEO strategy and implementation

Branch `seo/public-pages-and-routes`. Nothing deployed. Last updated 2026-11-26.

## Part A — Audit of the site as it was
| Finding | Impact |
|---|---|
| `/` served the React app, which shows only a sign-in card to visitors | Zero crawlable content; one generic title for the whole site |
| Menu pages used `/#Orders` style hash URLs | Hash fragments are not separate pages for search engines or analytics; not shareable/bookmarkable as pages |
| No robots.txt, sitemap, canonical, meta description, Open Graph or schema | Nothing for crawlers to use |
| App, login and API URLs had no noindex rules | Risk of private-area URLs being crawled |
| Login redirected to `/` | Needed updating once `/` became public |

Not audited (no live site/domain available here): live HTTP status/redirects, HTTPS/www behaviour, Core Web Vitals on production, Search Console data.

## What was implemented
1. **Every menu item has its own URL** (React history routing): `/dashboard /orders /products /customers /expenses /content-planner /pricing-lab /profile`. Back/forward, bookmarks and reloads work; old `/#Orders` links are rewritten. Laravel serves the app shell for these paths with `X-Robots-Tag: noindex, nofollow`; the app shell also has `<meta name="robots" content="noindex">`. Login redirects to `/dashboard`; sign-out returns to the public home page.
2. **Server-rendered public pages** (plain HTML, readable without JavaScript, no framework rewrite): `/`, `/features`, `/inventory-management`, `/order-management`, `/invoice-management`, `/expense-tracking`, `/pricing-calculator` (working free calculator), `/customer-management`, `/faq`. Each has a unique title, meta description, one H1, H2/H3 hierarchy, canonical, Open Graph/Twitter tags, breadcrumb + WebPage JSON-LD, internal links, and a visible "last updated" date.
3. **Schema**: Organization, WebSite and SoftwareApplication (home), WebApplication (calculator), BreadcrumbList, FAQPage (FAQ page only, matching visible text). No `offers`, ratings, reviews or counts are published because none exist.
4. `robots.txt` (blocks app, API, login; allows marketing assets; points to sitemap) and `sitemap.xml` (9 URLs). **Both are safe by default**: when `APP_ENV` is not `production`, robots disallows everything, pages send `noindex`, and the sitemap returns 404, so staging/local copies cannot be indexed.
5. One URL per page: trailing-slash requests 301-redirect to the canonical URL.

Files: `backend/app/Support/Marketing/{Pages,Site}.php`, `backend/app/Http/Controllers/MarketingController.php`, `backend/routes/web.php`, `backend/public/{css/marketing.css,js/pricing-calculator.js}`, `frontend/src/lib/routes.ts`, `frontend/src/App.tsx`, `frontend/index.html`, `backend/public/local-login.html`.

## Honest notes on AEO / GEO
- **FAQ rich results are gone.** Google ended FAQ rich results (documented end date 7 May 2026). The FAQ page and FAQPage markup are still worth having as clear, quotable answers for people and AI systems, but expect **no** FAQ rich snippet. Do not add FAQ markup to every page.
- No one can guarantee AI-search citations. What helps: direct answers under question headings, accurate product description, consistent name, crawlable HTML, honest scope statements ("not an accounting package"), a dated page, and third-party mentions that match your own description.
- Pricing/licensing is not published yet; the FAQ says so rather than inventing a price. Add a `/pricing` page (and schema `offers`) only when final.

## Part B — Keywords
**Verified metrics: none.** No keyword-volume/CPC/difficulty source (Google Keyword Planner, Ahrefs, Semrush) was available in this environment, and none are invented. Volume, KD and CPC below are therefore **UNVERIFIED**; priority is qualitative, based on relevance to real features and a live look at who ranks (large vendors such as QuickBooks, Zoho, FreshBooks, inFlow and review sites such as Capterra dominate generic "business management / order management software"; free seller calculators from Printful, Printify and Craftybase are strong for marketplace-specific pricing terms).

| # | Keyword | Intent | Vol / KD / CPC | Opportunity | Page | Priority |
|---|---|---|---|---|---|---|
| 1 | small business management software | commercial | unverified | Very competitive head term; long game | `/` | Medium |
| 2 | simple business management software | commercial | unverified | Better angle than "all-in-one" | `/` | High |
| 3 | inventory management software for small business | commercial | unverified | Competitive; win with niche angle | `/inventory-management` | High |
| 4 | simple inventory tracker | commercial | unverified | Lower difficulty expected | `/inventory-management` | High |
| 5 | order management software for small business | commercial | unverified | Competitive | `/order-management` | Medium |
| 6 | invoice software for small business | commercial | unverified | Very competitive | `/invoice-management` | Medium |
| 7 | expense tracker for small business | commercial | unverified | Competitive | `/expense-tracking` | Medium |
| 8 | product pricing calculator | tool/informational | unverified | Calculator pages earn links | `/pricing-calculator` | High |
| 9 | profit margin calculator | tool | unverified | Very competitive head term | `/pricing-calculator` | Medium |
| 10 | markup vs margin | informational | unverified | Answer-engine friendly; add article later | `/pricing-calculator` | High |
| 11 | how to price handmade products | informational | unverified | Strong fit for target audience | new article (not built: needs real content) | High |
| 12 | how to calculate selling price with fees | informational | unverified | Matches formula exactly | `/pricing-calculator`, `/faq` | High |
| 13 | business software for online sellers / handmade sellers | commercial | unverified | Niche, less competitive | `/` + future article | High |
| 14 | spreadsheet alternative for inventory and orders | commercial | unverified | Clear problem-led query | `/` | Medium |
| 15 | how to track inventory and orders for small business | informational | unverified | AEO target | `/faq` | High |

**Next step to make this table verified:** pull volumes/KD/CPC from Google Keyword Planner (free with an Ads account) or a paid tool, and confirm real queries from Search Console after launch. Pages that remain deliberately **not built**: `/small-business-tools` (would duplicate `/features`), `/pricing` (not final), and separate pages for near-duplicate keywords.

## Part D — Homepage/title/meta set
Implemented verbatim in `Pages.php` (titles 41–54 chars, descriptions 118–147 chars; verified by `run-seo.php`).

## Part F — Technical plan for React/Vite + Laravel
- Marketing = Laravel-rendered HTML (done). App = client-rendered SPA, private and noindex (done). No prerender/SSR rewrite needed because nothing public depends on React.
- **Production env**: `APP_URL=https://<your-domain>` (canonicals/sitemap derive from it), `APP_ENV=production`, `APP_DEBUG=false`.
- **Web server**: force HTTPS; choose one host (apex or `www`) and 301 the other; serve `/css`, `/js` with long cache + gzip/brotli. Laravel must receive `/`, `/features`, … (not a static `index.html`).
- Deploy order: `npm run build:laravel` (creates `public/spa`), then verify `/` shows marketing HTML and `/orders` shows the app.
- Core Web Vitals: marketing pages are ~1 stylesheet, no web fonts, no images, one small script only on the calculator.

## Part G — Search Console / indexing checklist
1. Deploy with correct `APP_URL`/`APP_ENV`. 2. Open `/robots.txt`, `/sitemap.xml`, and each page; confirm 200, canonical and no `noindex`. 3. Add a Domain property in Search Console (DNS TXT). 4. Submit `https://<domain>/sitemap.xml`. 5. URL Inspection → Request indexing for `/` then the other 8 pages (limited daily quota). 6. Fix anything under Pages → "Not indexed". 7. Watch impressions/queries weekly; rewrite titles for pages with impressions but low CTR. 8. Optionally verify Bing Webmaster Tools (imports from Search Console). Indexing and ranking cannot be forced or guaranteed.

## Off-page (legitimate only)
Free profiles on AlternativeTo, Product Hunt, SourceForge/Capterra/GetApp with identical name/description; publish the calculator in seller communities where self-promotion is allowed; answer real questions (Reddit, Quora, Etsy/Shopify seller forums) with genuine help; write 1–2 honest how-to articles per month (pricing handmade products, markup vs margin, inventory basics) and link to the relevant page; ask real users for reviews only after they have used it. Do not buy links, run link farms, or create fake reviews.

## Part H — 30/60/90 days
- **0–30**: deploy, verify, submit sitemap; add domain, contact email, privacy policy and terms; add a social share image; fix Search Console issues.
- **31–60**: verify keyword data; publish 3–4 articles (items 10–12); directory listings; screenshots with alt text on feature pages.
- **61–90**: review queries/CTR and rewrite titles; add `/pricing` when final; comparison page only if you can be accurate and fair; add real testimonials only when you have them.

## Part I — Checklist
**Done in this branch (quick wins):** per-page URLs, 9 crawlable pages, metadata, schema, sitemap, robots, canonical/trailing-slash, noindex for app, staging-safe defaults, tests.
**Needs you:** production domain; contact email; privacy policy and terms (legal text should be yours); logo + 1200×630 share image (`og:image` intentionally omitted until it exists); final pricing; real screenshots.
**Needs developer follow-up:** run on a real Laravel install and check headers; sitemap `lastmod` is a fixed constant (`Pages::UPDATED`) — bump it when content changes; consider moving copy into Blade when the page count grows.

## Verification performed here
`php backend/tests/run-seo.php` (338 checks: one H1, lengths, canonical, JSON-LD validity, links resolve, sitemap/robots rules, staging safety, no fabricated claims), `npm test` (route mapping, calculator parity with the app formula), `php -l`. **Not run:** a real HTTP request through Laravel, PHPUnit, tsc/build, Lighthouse, Search Console (no vendor/network/browser here).
