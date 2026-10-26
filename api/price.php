<?php
/* Precio actual e historial de la cubeta de huevos (público, solo lectura). */
require __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

try {
    echo json_encode(lolita_price_public(), JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'No disponible por ahora.']);
}
