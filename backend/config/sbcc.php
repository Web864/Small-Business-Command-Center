<?php
return [
    // Trusted server configuration only. Never accept this value from an HTTP request.
    'primary_owner_email' => strtolower(trim((string) env('SBCC_PRIMARY_OWNER_EMAIL', ''))),
];
