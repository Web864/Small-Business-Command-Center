<?php
namespace App\Http\Controllers;

use App\Models\Workspace;
use Illuminate\Http\{Request,JsonResponse};
use Illuminate\Support\Facades\{DB,Http};

class CompatibilityController extends SbccController
{
    public function image(Request $request, string $kind): JsonResponse
    {
        return $this->media($request, $kind);
    }

    public function productImage(Request $request, string $product): JsonResponse
    {
        abort_unless(strlen($product) <= 100, 404);
        if ($error = $this->licensed($request)) return $error;
        $workspace = Workspace::where('user_id', $request->user()->id)->first();
        abort_unless(collect($workspace?->data['products'] ?? [])->contains('id', $product), 404);
        return $this->media($request, 'product:'.$product);
    }

    private function media(Request $request, string $slot): JsonResponse
    {
        if ($error = $this->licensed($request)) return $error;
        $query = fn () => DB::table('sbcc_images')->where('user_id', $request->user()->id)->where('slot', $slot);
        if ($request->isMethod('DELETE')) {
            $query()->delete();
            return response()->json(['url' => null]);
        }
        if ($request->isMethod('POST')) {
            $input = $request->validate(['imageData' => 'required|string|max:1000000', 'contentType' => 'required|in:image/jpeg,image/png,image/webp']);
            $bytes = base64_decode($input['imageData'], true);
            $image = $bytes === false ? false : @getimagesizefromstring($bytes);
            abort_unless($image && ($image['mime'] ?? '') === $input['contentType'] && $image[0] <= 4096 && $image[1] <= 4096, 422, 'Invalid or oversized image.');
            $url = 'data:'.$input['contentType'].';base64,'.base64_encode($bytes);
            DB::table('sbcc_images')->upsert([
                ['user_id' => $request->user()->id, 'slot' => $slot, 'data_url' => $url, 'updated_at' => now()],
            ], ['user_id','slot'], ['data_url','updated_at']);
        }
        return response()->json(['url' => $query()->value('data_url')])->header('Cache-Control','private, no-store');
    }

    private function profile(int $userId): array
    {
        $data = DB::table('sbcc_profiles')->where('user_id', $userId)->value('data');
        return $data ? json_decode($data, true, 512, JSON_THROW_ON_ERROR) : ['displayName'=>'','businessName'=>'','businessType'=>'Handmade products','currency'=>'USD'];
    }

    public function quote(Request $request, string $currency): JsonResponse
    {
        if ($error = $this->licensed($request)) return $error;
        $to = strtoupper($currency);
        abort_unless(preg_match('/^[A-Z]{3}$/D', $to), 422, 'Invalid currency.');
        $from = $this->profile($request->user()->id)['currency'];
        if ($from === $to) {
            $quote = ['from'=>$from,'to'=>$to,'rate'=>1,'date'=>now()->toDateString()];
        } else {
            try {
                $response = Http::acceptJson()->connectTimeout(4)->timeout(10)->get('https://api.frankfurter.dev/v2/rate/'.strtolower($from).'/'.strtolower($to));
                $data = $response->json();
                if (!$response->successful() || !is_numeric($data['rate'] ?? null) || $data['rate'] <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $data['date'] ?? '')) {
                    return response()->json(['error'=>'No verified exchange rate is available for this currency pair.'],503);
                }
                $quote = ['from'=>$from,'to'=>$to,'rate'=>(float)$data['rate'],'date'=>$data['date']];
            } catch (\Throwable $exception) {
                return response()->json(['error'=>'Exchange rate service is unavailable. No amounts were changed.'],503);
            }
        }
        $request->session()->put('sbcc_fx_quote', $quote + ['expires'=>time()+600]);
        return response()->json($quote + ['source'=>'Frankfurter reference rates']);
    }

    public function convert(Request $request): JsonResponse
    {
        if ($error = $this->licensed($request)) return $error;
        $input = $request->validate(['from'=>'required|string|size:3','to'=>'required|string|size:3','expectedRate'=>'required|numeric|gt:0','revision'=>'required|integer|min:0']);
        $quote = $request->session()->get('sbcc_fx_quote');
        if (!$quote || $quote['expires'] < time() || $quote['from'] !== $input['from'] || $quote['to'] !== $input['to'] || abs($quote['rate'] - (float)$input['expectedRate']) > 0.000000001) {
            return response()->json(['error'=>'Exchange quote expired or changed. Preview the currency again.'],409);
        }
        $result = DB::transaction(function () use ($request,$input,$quote) {
            $workspace = Workspace::where('user_id',$request->user()->id)->lockForUpdate()->firstOrFail();
            $profile = $this->profile($request->user()->id);
            if ($workspace->revision !== (int)$input['revision'] || $profile['currency'] !== $input['from']) {
                return response()->json(['error'=>'Another tab saved changes. Reload before converting.','code'=>'WORKSPACE_CONFLICT'],409);
            }
            $data = $workspace->data;
            $money = static function (array &$row, array $keys) use ($quote): void {
                foreach ($keys as $key) if (isset($row[$key]) && is_numeric($row[$key])) $row[$key] = round((float)$row[$key] * $quote['rate'],2);
            };
            foreach ($data['products'] as &$product) $money($product,['price','cost']);
            unset($product);
            foreach ($data['orders'] as &$order) {
                $money($order,['paid','refunded','total','shipping','tax','discount','unitPrice']);
                if (isset($order['items'])) foreach ($order['items'] as &$item) $money($item,['unitPrice','unitCost']);
                unset($item);
                if (isset($order['refundHistory'])) foreach ($order['refundHistory'] as &$refund) $money($refund,['amount']);
                unset($refund);
            }
            unset($order);
            foreach ($data['expenses'] as &$expense) $money($expense,['amount']);
            unset($expense);
            $profile['currency'] = $quote['to'];
            $workspace->update(['data'=>$data,'revision'=>$workspace->revision+1]);
            DB::table('sbcc_profiles')->upsert([['user_id'=>$request->user()->id,'data'=>json_encode($profile,JSON_THROW_ON_ERROR),'updated_at'=>now()]],['user_id'],['data','updated_at']);
            DB::table('audit_events')->insert(['actor_id'=>$request->user()->id,'action'=>'workspace.currency-convert','detail'=>json_encode($quote),'created_at'=>now(),'updated_at'=>now()]);
            return response()->json(['profile'=>$profile,'workspace'=>$data,'revision'=>$workspace->revision,'from'=>$quote['from'],'to'=>$quote['to'],'rate'=>$quote['rate'],'date'=>$quote['date']]);
        });
        if ($result->isSuccessful()) $request->session()->forget('sbcc_fx_quote');
        return $result;
    }
}
