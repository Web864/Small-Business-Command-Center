<?php
// R-08 measurement: CPU cost of the server-side rules + JSON handling on a near-limit workspace (no DB, no HTTP).
require __DIR__.'/../app/Support/WorkspaceRules.php';
use App\Support\WorkspaceRules as R;
$mk=function(int $n){$p=$o=$c=[];for($i=0;$i<$n;$i++){
 $p[]=['id'=>"p$i",'name'=>"Product $i",'sku'=>"SKU-$i",'price'=>10.5,'cost'=>4,'stock'=>20,'min'=>2];
 $o[]=['id'=>"o$i",'customer'=>"Customer ".($i%80),'productId'=>"p".($i%$n),'qty'=>1,'paid'=>10,'status'=>'New','date'=>'2026-01-01','items'=>[['productId'=>"p".($i%$n),'name'=>'n','sku'=>'s','qty'=>1,'unitPrice'=>10.5,'unitCost'=>4]]];
 $c[]=['id'=>"c$i",'name'=>"Customer $i"];}
 return ['products'=>$p,'orders'=>$o,'customers'=>$c,'expenses'=>[],'posts'=>[],'notes'=>[]];};
foreach([50,150,300] as $n){
 $old=$mk($n);$new=$old;$new['products'][0]['archived']=true;
 $bytes=strlen(json_encode($new));
 $t=hrtime(true);for($i=0;$i<50;$i++)R::validate($new,$old);$rules=(hrtime(true)-$t)/1e6/50;
 $t=hrtime(true);for($i=0;$i<50;$i++){$j=json_encode($new);json_decode($j,true);}$json=(hrtime(true)-$t)/1e6/50;
 printf("rows/collection=%d payload=%d bytes  rules=%.2f ms  json encode+decode=%.2f ms\n",$n,$bytes,$rules,$json);
}
