<?php
return [
    // Trusted server configuration only. Never accept this value from an HTTP request.
    'primary_owner_email' => strtolower(trim((string) env('SBCC_PRIMARY_OWNER_EMAIL', ''))),
    // Comma-separated proxy IPs/CIDRs, or * (behind a TLS-terminating proxy). Read via config so it survives `config:cache`.
    'trusted_proxies' => (string) env('TRUSTED_PROXIES', ''),
];
