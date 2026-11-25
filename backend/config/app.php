<?php
return [
 'name'=>env('APP_NAME','SBCC'), 'env'=>env('APP_ENV','production'), 'debug'=>(bool)env('APP_DEBUG',false),
 'frontend_url'=>env('FRONTEND_URL','http://127.0.0.1:5173'), 'url'=>env('APP_URL','http://localhost'), 'timezone'=>'UTC', 'locale'=>env('APP_LOCALE','en'),
 'fallback_locale'=>'en', 'faker_locale'=>'en_US', 'key'=>env('APP_KEY'), 'cipher'=>'AES-256-CBC',
 'previous_keys'=>array_filter(explode(',',env('APP_PREVIOUS_KEYS',''))),
];
