<?php
// Standalone SEO checks (no composer/vendor needed): php backend/tests/run-seo.php
require __DIR__.'/../app/Support/Marketing/Pages.php';
require __DIR__.'/../app/Support/Marketing/Site.php';
use App\Support\Marketing\{Pages,Site};
$pass=0;$fail=0;
function check(string $name,bool $ok,string $detail=''):void{global $pass,$fail;if($ok){$pass++;echo "PASS $name\n";}else{$fail++;echo "FAIL $name $detail\n";}}
$site=new Site('https://example.test',true);
$all=Pages::all();$titles=[];$descs=[];$h1s=[];
foreach($all as $slug=>$p){
  $html=$site->render($slug);$label=$slug===''?'home':$slug;
  check("$label renders",is_string($html)&&strlen($html)>800);
  $dom=new DOMDocument();libxml_use_internal_errors(true);$dom->loadHTML('<?xml encoding="utf-8"?>'.$html);libxml_clear_errors();
  $x=new DOMXPath($dom);
  check("$label exactly one h1",$x->query('//h1')->length===1);
  check("$label title 15-65 chars",strlen($p['title'])>=15&&strlen($p['title'])<=65,strlen($p['title']).' chars');
  check("$label description 110-165 chars",strlen($p['desc'])>=110&&strlen($p['desc'])<=165,strlen($p['desc']).' chars');
  check("$label canonical correct",$x->query('//link[@rel="canonical"]/@href')->item(0)?->nodeValue===$site->canonical($slug));
  check("$label robots index",str_starts_with($x->query('//meta[@name="robots"]/@content')->item(0)?->nodeValue??'','index'));
  check("$label has og:title and description",$x->query('//meta[@property="og:title"]')->length===1&&$x->query('//meta[@name="description"]')->length===1);
  check("$label no heading level skipped (h2 before h3)",$x->query('//h3')->length===0||$x->query('//h2')->length>0);
  $text=trim(preg_replace('/\s+/',' ',$dom->textContent));
  check("$label has substantive text (>=250 words)",str_word_count($text)>=250,str_word_count($text).' words');
  foreach($x->query('//script[@type="application/ld+json"]') as $s)check("$label JSON-LD valid",is_array(json_decode($s->textContent,true))&&json_last_error()===JSON_ERROR_NONE);
  foreach($x->query('//a/@href') as $href){$h=$href->nodeValue;if($h[0]==='/'&&!str_contains($h,'#')){$s=ltrim($h,'/');$ok=$s===''||isset($all[$s])||in_array($s,['login'],true);check("$label link $h resolves",$ok);}}
  check("$label no placeholder/fake claims",!preg_match('/lorem|testimonial|\b\d[\d,]*\+? (customers|users|reviews)\b|award-winning|#1 |guarantee/i',$text));
  $titles[]=$p['title'];$descs[]=$p['desc'];$h1s[]=$p['h1'];
}
check('titles unique',count($titles)===count(array_unique($titles)));
check('descriptions unique',count($descs)===count(array_unique($descs)));
check('h1s unique',count($h1s)===count(array_unique($h1s)));
// sitemap
$sm=new DOMDocument();check('sitemap is well-formed XML',@$sm->loadXML($site->sitemap()));
$locs=[];foreach($sm->getElementsByTagName('loc') as $l)$locs[]=$l->textContent;
check('sitemap lists every page once',count($locs)===count($all)&&count(array_unique($locs))===count($locs));
check('sitemap has no private app URLs',!array_filter($locs,fn($u)=>preg_match('#/(dashboard|orders|products|customers|expenses|content-planner|pricing-lab|profile|login|api)\b#',$u)));
// robots
$r=$site->robots();
check('robots has Sitemap line',str_contains($r,'Sitemap: https://example.test/sitemap.xml'));
foreach(Site::APP_PATHS as $p)check("robots disallows /$p",str_contains($r,"Disallow: /$p"));
check('robots disallows /api/ and /login',str_contains($r,'Disallow: /api/')&&str_contains($r,'Disallow: /login'));
check('robots does not block marketing css/js',!str_contains($r,'Disallow: /css')&&!str_contains($r,'Disallow: /js'));
check('robots does not block site root',!preg_match('/^Disallow: \/$/m',$r));
foreach(array_keys($all) as $slug){$path=$slug===''?'/':'/'.$slug;foreach(explode("\n",$r) as $line){if(str_starts_with($line,'Disallow: ')){$d=substr($line,10);if($d!=='/'&&str_starts_with($path,$d))check("robots Disallow $d must not block marketing $path",false);}}}
check('robots prefix rules never block a marketing page',true);
// non-production safety
$stg=new Site('https://staging.test',false);
check('non-production robots blocks everything',str_contains($stg->robots(),'Disallow: /')&&!str_contains($stg->robots(),'Allow:'));
check('non-production pages are noindex',str_contains($stg->render('features'),'content="noindex, nofollow"'));
// FAQ schema matches visible content
$faq=$site->render('faq');check('FAQPage JSON-LD present on /faq only',str_contains($faq,'"FAQPage"')&&!str_contains($site->render('features'),'"FAQPage"'));
foreach(Pages::all()['faq']['faq'] as [$q,$a])check('FAQ visible text matches schema: '.substr($q,0,30),str_contains($faq,htmlspecialchars($q,ENT_QUOTES))&&str_contains($faq,htmlspecialchars($a,ENT_QUOTES)));
// no fabricated offer/price/rating in schema
$home=$site->render('');check('home schema has no offers/aggregateRating',!str_contains($home,'"offers"')&&!str_contains($home,'aggregateRating'));
check('slugs() excludes home',!in_array('',Pages::slugs(),true));
check('APP_PATHS do not collide with marketing slugs',!array_intersect(Site::APP_PATHS,Pages::slugs()));
echo "\n$pass passed, $fail failed\n";exit($fail?1:0);
