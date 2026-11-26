<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SbccController as C;
// Public marketing pages are server-rendered HTML so search engines and AI crawlers can read them without JavaScript.
use App\Http\Controllers\MarketingController as M;
use App\Support\Marketing\Pages;
use App\Support\Marketing\Site;
Route::get('/',[M::class,'page']);
Route::get('/sitemap.xml',[M::class,'sitemap']);
Route::get('/robots.txt',[M::class,'robots']);
Route::get('/{slug}',[M::class,'page'])->whereIn('slug',Pages::slugs());
// Each signed-in menu page has its own URL. Served with noindex; the SPA enforces authentication.
Route::get('/{appPage}',[M::class,'app'])->whereIn('appPage',Site::APP_PATHS);
Route::get('/app/{path}',function(string $path){abort_unless(in_array($path,['app.js','style.css'],true),404);return response()->file(public_path('app/'.$path));})->where('path','.*');
Route::post('/api/register',[C::class,'register'])->middleware('throttle:5,1');
Route::post('/api/login',[C::class,'login'])->middleware('throttle:8,1');
Route::middleware('auth')->group(function(){
 Route::get('/api/session',[C::class,'session']);Route::post('/api/logout',[C::class,'logout']);
 Route::get('/api/license',[C::class,'licenseStatus']);
 Route::post('/api/license/redeem',[C::class,'redeem'])->middleware('throttle:10,1');
 Route::post('/api/license/activate',[C::class,'activate'])->middleware('throttle:20,1');Route::post('/api/license/release',[C::class,'release'])->middleware('throttle:20,1');
 Route::get('/api/workspace',[C::class,'workspace']);Route::post('/api/workspace',[C::class,'saveWorkspace']);
 Route::get('/api/export',[C::class,'export']);
 Route::get('/api/admin/licenses',[C::class,'licenses']);Route::post('/api/admin/issue',[C::class,'issue'])->middleware('throttle:10,1');
 Route::post('/api/admin/license-action',[C::class,'licenseAction'])->middleware('throttle:10,1');
});

// Same-origin React adapter endpoints (also used in production). /local-login is kept as an alias of /login.
Route::get('/local-login',fn()=>response()->file(public_path('local-login.html'),['Cache-Control'=>'no-store']));
Route::get('/login',fn()=>response()->file(public_path('local-login.html'),['Cache-Control'=>'no-store']));
Route::get('/api/csrf',fn()=>response()->json(['csrfToken'=>csrf_token()]));
Route::middleware('auth')->group(function(){
 Route::get('/api/license/my-role',[C::class,'localRole']);
 Route::get('/api/me',[C::class,'localProfile']);
 Route::put('/api/profile',[C::class,'saveLocalProfile']);
 Route::put('/api/workspace',[C::class,'saveWorkspace']);
 Route::post('/api/license/transfer',[C::class,'activate'])->middleware('throttle:20,1');
 Route::post('/api/password',[C::class,'changePassword'])->middleware('throttle:5,1');
 Route::match(['GET','POST','DELETE'],'/api/{kind}',[\App\Http\Controllers\CompatibilityController::class,'image'])->where('kind','avatar|cover|logo');
 Route::match(['GET','POST','DELETE'],'/api/product-image/{product}',[\App\Http\Controllers\CompatibilityController::class,'productImage']);
 Route::get('/api/fx/{currency}',[\App\Http\Controllers\CompatibilityController::class,'quote']);
 Route::post('/api/fx/convert',[\App\Http\Controllers\CompatibilityController::class,'convert']);
});
