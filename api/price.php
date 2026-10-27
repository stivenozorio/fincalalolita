<?php
/* Reemplazado: el precio de la cubeta ahora vive en Supabase. */
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
echo '{"ok":false,"error":"Este servicio ya no se usa."}';
