<?php
/* Pruebas de la lógica de precios y acceso. Ejecutar: php tests/price.test.php */
$tmp = sys_get_temp_dir() . '/lolita-test-' . bin2hex(random_bytes(4));
define('LOLITA_DATA_DIR', $tmp);
require __DIR__ . '/../api/lib.php';

$fails = 0;
function check($name, $cond) { global $fails; echo ($cond ? "ok   " : "FAIL ") . $name . "\n"; if (!$cond) { $fails++; } }
function throws($fn, $class = null) { try { $fn(); } catch (Throwable $e) { return $class === null || $e instanceof $class; } return false; }

// Semilla
$p = lolita_price_public();
check('semilla 19000', $p['current']['price'] === 19000 && $p['count'] === 1 && $p['current']['direction'] === 'first');

// Sube 19000 -> 20000
$r = lolita_price_add('20.000', 'prueba', 'dago');
check('sube +1000', $r['delta'] === 1000 && $r['pct'] === 5.26 && $r['direction'] === 'up');
// Baja 20000 -> 19000 (-5%)
$r = lolita_price_add('19000', '', 'dago');
check('baja -1000 (-5%)', $r['delta'] === -1000 && $r['pct'] === -5.0 && $r['direction'] === 'down');
// Baja 19000 -> 18000
$r = lolita_price_add('$18,000', '', 'dago');
check('baja -1000 (-5.26%)', $r['delta'] === -1000 && $r['pct'] === -5.26 && $r['direction'] === 'down');
$r = lolita_price_add('18000', '', 'dago');
check('igual', $r['delta'] === 0 && $r['direction'] === 'same');
check('historial conservado', lolita_price_public()['count'] === 5);

// Validación
check('rechaza texto', throws(function () { lolita_price_add('abc', '', 'x'); }, InvalidArgumentException::class));
check('rechaza vacío', throws(function () { lolita_price_add('', '', 'x'); }, InvalidArgumentException::class));
check('rechaza 0', throws(function () { lolita_price_add('0', '', 'x'); }, InvalidArgumentException::class));
check('rechaza enorme', throws(function () { lolita_price_add('99999999999', '', 'x'); }, InvalidArgumentException::class));
check('rechaza negativo', throws(function () { lolita_price_add('-5000', '', 'x'); }, InvalidArgumentException::class));
check('sin cambios por rechazos', lolita_price_public()['count'] === 5);
check('nota limpia', lolita_clean_note("a\n\tb   c") === 'a b c');

// Cuenta
check('sin cuenta', !lolita_auth_exists());
check('token malo', throws(function () { lolita_auth_setup('malo', 'dago', 'contraseña-larga1', 'contraseña-larga1'); }, InvalidArgumentException::class));
$tok = getenv('LOLITA_TEST_TOKEN');
if ($tok) {
    check('pass corta', throws(function () use ($tok) { lolita_auth_setup($tok, 'dago', 'corta', 'corta'); }, InvalidArgumentException::class));
    check('pass distinta', throws(function () use ($tok) { lolita_auth_setup($tok, 'dago', 'contraseña-larga1', 'otra-larga-123'); }, InvalidArgumentException::class));
    lolita_auth_setup($tok, 'Dago', 'contraseña-larga1', 'contraseña-larga1');
    check('cuenta creada', lolita_auth_exists());
    check('no se repite', throws(function () use ($tok) { lolita_auth_setup($tok, 'x1x', 'contraseña-larga1', 'contraseña-larga1'); }, RuntimeException::class));
    check('login ok', lolita_auth_login('dago', 'contraseña-larga1') === 'Dago');
    check('login mal', lolita_auth_login('dago', 'incorrecta') === null);
    $raw = file_get_contents($tmp . '/auth.php');
    check('auth no guarda clave en claro', strpos($raw, 'contraseña-larga1') === false && strpos($raw, '$2y$') !== false);
    check('auth con cabecera 404', strpos($raw, '<?php http_response_code(404)') === 0);
}
// Bloqueo
for ($i = 0; $i < LOLITA_MAX_FAILS; $i++) { try { lolita_auth_login('zzz', 'zzz'); } catch (RuntimeException $e) { break; } }
check('bloqueo tras fallos', throws(function () { lolita_auth_login('zzz', 'zzz'); }, RuntimeException::class));
check('data protegida', is_file($tmp . '/.htaccess'));

echo $fails ? "\n$fails fallo(s)\n" : "\nTodo bien\n";
exit($fails ? 1 : 0);
