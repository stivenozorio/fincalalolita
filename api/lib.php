<?php
/* Lógica compartida: precio de la cubeta (historial con variaciones) y acceso al panel.
   Sin dependencias ni base de datos: guarda en archivos dentro de /data (protegida; ver lolita_data_dir()).
   Compatible con PHP 7.4 o superior. */

if (!defined('LOLITA_DATA_DIR')) { define('LOLITA_DATA_DIR', dirname(__DIR__) . '/data'); }
const LOLITA_TZ = 'America/Bogota';
const LOLITA_SEED_PRICE = 19000;          // precio de referencia indicado por el cliente (primer registro)
const LOLITA_PRICE_MIN = 1000;
const LOLITA_PRICE_MAX = 1000000;
const LOLITA_MAX_FAILS = 5;               // intentos fallidos permitidos...
const LOLITA_LOCK_SECONDS = 900;          // ...cada 15 minutos, por conexión
const LOLITA_PRIVATE_HEADER = "<?php http_response_code(404); exit; ?>\n";   // los archivos privados nunca se muestran como texto
// Código de un solo uso para crear la cuenta la primera vez. Aquí solo está su huella (SHA-256), no el código.
const LOLITA_SETUP_TOKEN_SHA256 = '1cf4da877d218c350263ca54631fa3ed967a32b8b207cbc82a550a345231c20e';

date_default_timezone_set(LOLITA_TZ);

/* ---------- Archivos ---------- */

function lolita_data_dir() {
    $d = LOLITA_DATA_DIR;
    if (!is_dir($d)) { @mkdir($d, 0755, true); }
    if (is_dir($d)) {
        if (!is_file($d . '/.htaccess')) {
            @file_put_contents($d . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
        }
        if (!is_file($d . '/index.html')) { @file_put_contents($d . '/index.html', ''); }
    }
    return $d;
}

function lolita_write_atomic($path, $content) {
    $tmp = $path . '.tmp' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmp, $content, LOCK_EX) === false) { return false; }
    if (!@rename($tmp, $path)) { @unlink($tmp); return false; }
    return true;
}

/** Ejecuta $fn con un candado exclusivo: evita que dos registros simultáneos se pisen. */
function lolita_with_lock($fn) {
    $fh = @fopen(lolita_data_dir() . '/.lock', 'c');
    if (!$fh) { throw new RuntimeException('No se pudo abrir el candado de datos.'); }
    try { flock($fh, LOCK_EX); return $fn(); }
    finally { flock($fh, LOCK_UN); fclose($fh); }
}

function lolita_private_read($name) {
    $p = lolita_data_dir() . '/' . $name . '.php';
    if (!is_file($p)) { return null; }
    $raw = @file_get_contents($p);
    if ($raw === false) { return null; }
    if (strpos($raw, LOLITA_PRIVATE_HEADER) === 0) { $raw = substr($raw, strlen(LOLITA_PRIVATE_HEADER)); }
    $d = json_decode($raw, true);
    return is_array($d) ? $d : null;
}

function lolita_private_write($name, array $data) {
    return lolita_write_atomic(lolita_data_dir() . '/' . $name . '.php', LOLITA_PRIVATE_HEADER . json_encode($data));
}

/* ---------- Precio de la cubeta ---------- */

function lolita_now() { return date('c'); }

function lolita_prices_path() { return lolita_data_dir() . '/prices.json'; }

function lolita_prices_decode($path) {
    if (!is_file($path)) { return null; }
    $d = json_decode((string) @file_get_contents($path), true);
    if (is_array($d) && isset($d['entries']) && is_array($d['entries']) && count($d['entries']) > 0) { return $d['entries']; }
    return null;
}

function lolita_prices_save(array $entries) {
    $doc = ['unit' => 'cubeta', 'currency' => 'COP', 'entries' => array_values($entries)];
    if (!lolita_write_atomic(lolita_prices_path(), json_encode($doc, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        throw new RuntimeException('No se pudo guardar el precio.');
    }
}

/** Historial crudo. La primera vez crea el registro inicial con el precio de referencia del cliente. */
function lolita_prices_read() {
    $e = lolita_prices_decode(lolita_prices_path());
    if ($e !== null) { return $e; }
    return lolita_with_lock(function () {
        $e = lolita_prices_decode(lolita_prices_path());
        if ($e !== null) { return $e; }
        $e = [['id' => 1, 'price' => LOLITA_SEED_PRICE, 'at' => lolita_now(), 'note' => 'Precio de referencia inicial', 'by' => 'sistema']];
        lolita_prices_save($e);
        return $e;
    });
}

/** Agrega a cada registro su variación frente al anterior: en pesos, en porcentaje y la dirección (up/down/same/first). */
function lolita_variations(array $entries) {
    $out = []; $prev = null;
    foreach ($entries as $e) {
        $row = ['id' => (int) $e['id'], 'price' => (int) $e['price'], 'at' => (string) $e['at'], 'note' => isset($e['note']) ? (string) $e['note'] : ''];
        if ($prev === null) {
            $row['delta'] = null; $row['pct'] = null; $row['direction'] = 'first';
        } else {
            $delta = $row['price'] - $prev['price'];
            $row['delta'] = $delta;
            $row['pct'] = $prev['price'] > 0 ? round($delta / $prev['price'] * 100, 2) : null;
            $row['direction'] = $delta > 0 ? 'up' : ($delta < 0 ? 'down' : 'same');
        }
        $out[] = $row; $prev = $row;
    }
    return $out;
}

/** Acepta "20000", "20.000", "$ 20,000"... y devuelve el entero en pesos o lanza un error claro. */
function lolita_parse_price($raw) {
    $clean = preg_replace('/[\s\.\,\$]/u', '', trim((string) $raw));
    if ($clean === '' || !preg_match('/^[0-9]+$/', $clean)) { throw new InvalidArgumentException('Escribe solo números, por ejemplo 20000.'); }
    if (strlen($clean) > 9) { throw new InvalidArgumentException('Ese número es demasiado grande.'); }
    $p = (int) $clean;
    if ($p < LOLITA_PRICE_MIN || $p > LOLITA_PRICE_MAX) {
        throw new InvalidArgumentException('El precio debe estar entre $' . number_format(LOLITA_PRICE_MIN, 0, ',', '.') . ' y $' . number_format(LOLITA_PRICE_MAX, 0, ',', '.') . '.');
    }
    return $p;
}

function lolita_clean_note($note) {
    $note = preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string) $note);
    $note = trim(preg_replace('/\s+/u', ' ', $note));
    return function_exists('mb_substr') ? mb_substr($note, 0, 140) : substr($note, 0, 140);
}

/** Registra un precio nuevo (con fecha del servidor) y devuelve ese registro con su variación. */
function lolita_price_add($rawPrice, $note, $by) {
    $price = lolita_parse_price($rawPrice);
    $note = lolita_clean_note($note);
    $by = preg_replace('/[^A-Za-z0-9._@-]/', '', (string) $by);
    return lolita_with_lock(function () use ($price, $note, $by) {
        $entries = lolita_prices_read();
        $last = end($entries);
        $entries[] = ['id' => (int) $last['id'] + 1, 'price' => $price, 'at' => lolita_now(), 'note' => $note, 'by' => $by];
        lolita_prices_save($entries);
        $v = lolita_variations($entries);
        return end($v);
    });
}

/** Lo que muestra la página pública. No incluye quién hizo cada cambio. */
function lolita_price_public() {
    $v = lolita_variations(lolita_prices_read());
    return ['ok' => true, 'unit' => 'cubeta', 'currency' => 'COP', 'current' => end($v), 'count' => count($v), 'history' => $v];
}

/* ---------- Cuenta del panel ---------- */

function lolita_auth_exists() { return is_array(lolita_private_read('auth')) && !empty(lolita_private_read('auth')['hash']); }

function lolita_client_key() { return substr(hash('sha256', (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'cli') . '|lolita'), 0, 24); }

/** Segundos que faltan para poder reintentar (0 = puede intentar). */
function lolita_locked_for($key) {
    $a = lolita_private_read('attempts'); $now = time();
    if (!is_array($a) || empty($a[$key])) { return 0; }
    $recent = array_values(array_filter($a[$key], function ($t) use ($now) { return $t > $now - LOLITA_LOCK_SECONDS; }));
    if (count($recent) < LOLITA_MAX_FAILS) { return 0; }
    return max(1, min($recent) + LOLITA_LOCK_SECONDS - $now);
}

function lolita_register_fail($key) {
    lolita_with_lock(function () use ($key) {
        $a = lolita_private_read('attempts'); if (!is_array($a)) { $a = []; }
        $now = time(); $a[$key] = isset($a[$key]) ? $a[$key] : []; $a[$key][] = $now;
        foreach ($a as $k => $list) { $a[$k] = array_values(array_filter($list, function ($t) use ($now) { return $t > $now - LOLITA_LOCK_SECONDS; })); if (!$a[$k]) { unset($a[$k]); } }
        lolita_private_write('attempts', $a);
    });
}

function lolita_clear_fails($key) {
    lolita_with_lock(function () use ($key) {
        $a = lolita_private_read('attempts');
        if (is_array($a) && isset($a[$key])) { unset($a[$key]); lolita_private_write('attempts', $a); }
    });
}

/** Crea la cuenta (solo si todavía no existe) usando el código de un solo uso. */
function lolita_auth_setup($token, $user, $pass, $pass2) {
    $key = 'setup:' . lolita_client_key();
    $wait = lolita_locked_for($key);
    if ($wait > 0) { throw new RuntimeException('Demasiados intentos. Espera ' . ceil($wait / 60) . ' minuto(s) y vuelve a intentar.'); }
    if (lolita_auth_exists()) { throw new RuntimeException('La cuenta ya fue creada.'); }
    if (!hash_equals(LOLITA_SETUP_TOKEN_SHA256, hash('sha256', trim((string) $token)))) {
        lolita_register_fail($key);
        throw new InvalidArgumentException('El código de activación no es correcto.');
    }
    $user = trim((string) $user);
    if (!preg_match('/^[A-Za-z0-9._@-]{3,32}$/', $user)) { throw new InvalidArgumentException('El usuario debe tener entre 3 y 32 letras, números o . _ - @ (sin espacios).'); }
    if (strlen((string) $pass) < 10) { throw new InvalidArgumentException('La contraseña debe tener al menos 10 caracteres.'); }
    if (!hash_equals((string) $pass, (string) $pass2)) { throw new InvalidArgumentException('Las dos contraseñas no coinciden.'); }
    lolita_with_lock(function () use ($user, $pass) {
        if (lolita_auth_exists()) { throw new RuntimeException('La cuenta ya fue creada.'); }
        if (!lolita_private_write('auth', ['user' => $user, 'hash' => password_hash((string) $pass, PASSWORD_DEFAULT), 'created' => lolita_now()])) {
            throw new RuntimeException('No se pudo guardar la cuenta.');
        }
    });
    lolita_clear_fails($key);
}

/** Verifica usuario y contraseña. Limita los intentos fallidos por conexión. Devuelve el usuario o null. */
function lolita_auth_login($user, $pass) {
    $key = 'login:' . lolita_client_key();
    $wait = lolita_locked_for($key);
    if ($wait > 0) { throw new RuntimeException('Demasiados intentos. Espera ' . ceil($wait / 60) . ' minuto(s) y vuelve a intentar.'); }
    $auth = lolita_private_read('auth');
    $dummy = '$2y$10$usesomesillystringforsalt1uXQx0b3b3R1xZ9kQ0o0o0o0o0o0o0o0o0';
    $okUser = is_array($auth) && !empty($auth['user']) && hash_equals(strtolower($auth['user']), strtolower(trim((string) $user)));
    $ok = password_verify((string) $pass, (is_array($auth) && !empty($auth['hash'])) ? $auth['hash'] : $dummy);
    if ($okUser && $ok) { lolita_clear_fails($key); return $auth['user']; }
    lolita_register_fail($key);
    usleep(600000);   // frena los intentos automáticos
    return null;
}
