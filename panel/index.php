<?php
/* Panel privado de Dagoberto: registrar el precio de la cubeta (usuario y contraseña).
   La primera vez se crea la cuenta con el código de activación; después solo se inicia sesión. */
require __DIR__ . '/../api/lib.php';

header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
session_name('lolita_panel');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_start();

const LOLITA_IDLE_SECONDS = 3600;   // se cierra sola tras 1 hora sin actividad
if (isset($_SESSION['user']) && isset($_SESSION['last']) && time() - $_SESSION['last'] > LOLITA_IDLE_SECONDS) { $_SESSION = []; session_regenerate_id(true); }
if (isset($_SESSION['user'])) { $_SESSION['last'] = time(); }
if (empty($_SESSION['csrf'])) { $_SESSION['csrf'] = bin2hex(random_bytes(24)); }

function h($s) { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function same_origin() {
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
    foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $k) {
        if (!empty($_SERVER[$k])) { return parse_url($_SERVER[$k], PHP_URL_HOST) === parse_url('//' . $host, PHP_URL_HOST); }
    }
    return true;
}

$error = ''; $ok = '';
$exists = lolita_auth_exists();
$logged = isset($_SESSION['user']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = isset($_POST['action']) ? (string) $_POST['action'] : '';
    if (!hash_equals($_SESSION['csrf'], isset($_POST['csrf']) ? (string) $_POST['csrf'] : '') || !same_origin()) {
        $error = 'La sesión expiró. Vuelve a intentarlo.';
    } else {
        try {
            if ($act === 'setup' && !$exists) {
                lolita_auth_setup(isset($_POST['token']) ? $_POST['token'] : '', isset($_POST['user']) ? $_POST['user'] : '', isset($_POST['pass']) ? $_POST['pass'] : '', isset($_POST['pass2']) ? $_POST['pass2'] : '');
                session_regenerate_id(true); $_SESSION['user'] = trim($_POST['user']); $_SESSION['last'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(24));
                $_SESSION['flash'] = 'Cuenta creada. Ya puedes registrar el precio de la cubeta.';
                header('Location: ./'); exit;
            } elseif ($act === 'login') {
                $u = lolita_auth_login(isset($_POST['user']) ? $_POST['user'] : '', isset($_POST['pass']) ? $_POST['pass'] : '');
                if ($u === null) { $error = 'Usuario o contraseña incorrectos.'; }
                else { session_regenerate_id(true); $_SESSION['user'] = $u; $_SESSION['last'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(24)); header('Location: ./'); exit; }
            } elseif ($act === 'price' && $logged) {
                $r = lolita_price_add(isset($_POST['price']) ? $_POST['price'] : '', isset($_POST['note']) ? $_POST['note'] : '', $_SESSION['user']);
                $_SESSION['flash'] = 'Precio guardado: ' . '$' . number_format($r['price'], 0, ',', '.') . '.';
                header('Location: ./'); exit;   // evita que al recargar se guarde dos veces
            } elseif ($act === 'logout') {
                $_SESSION = []; session_regenerate_id(true); header('Location: ./'); exit;
            }
        } catch (InvalidArgumentException $e) { $error = $e->getMessage(); }
        catch (RuntimeException $e) { $error = $e->getMessage(); }
        catch (Throwable $e) { $error = 'No se pudo completar la acción. Intenta de nuevo.'; }
    }
    $exists = lolita_auth_exists(); $logged = isset($_SESSION['user']);
}
if (isset($_SESSION['flash'])) { $ok = $_SESSION['flash']; unset($_SESSION['flash']); }
$mode = $logged ? 'dash' : ($exists ? 'login' : 'setup');
$csrf = h($_SESSION['csrf']);
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Panel · Finca La Lolita</title>
<link rel="icon" href="../assets/logo/favicon-64.png">
<link rel="stylesheet" href="panel.css?v=20261026a">
<link rel="stylesheet" href="../css/price.css?v=20261026a">
</head>
<body>
<main class="pn">
  <img class="pn__logo" src="../assets/logo/wordmark-oscuro.webp" alt="Finca La Lolita" width="170">
<?php if ($ok): ?><p class="pn__msg pn__msg--ok" role="status"><?= h($ok) ?></p><?php endif; ?>
<?php if ($error): ?><p class="pn__msg pn__msg--err" role="alert"><?= h($error) ?></p><?php endif; ?>

<?php if ($mode === 'setup'): ?>
  <h1>Crear tu cuenta</h1>
  <p class="pn__lead">Es la primera vez. Escribe el código de activación que te entregó DigiCy y elige tu usuario y contraseña. Con ellos entrarás siempre a este panel.</p>
  <form method="post" class="pn__card" autocomplete="off">
    <input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="action" value="setup">
    <label>Código de activación<input name="token" type="password" required autocomplete="off" spellcheck="false"></label>
    <label>Usuario<input name="user" required minlength="3" maxlength="32" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
    <label>Contraseña (mínimo 10 caracteres)<input name="pass" type="password" required minlength="10" autocomplete="new-password"></label>
    <label>Repite la contraseña<input name="pass2" type="password" required minlength="10" autocomplete="new-password"></label>
    <button class="pn__btn" type="submit">Crear cuenta</button>
  </form>

<?php elseif ($mode === 'login'): ?>
  <h1>Entrar al panel</h1>
  <form method="post" class="pn__card">
    <input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="action" value="login">
    <label>Usuario<input name="user" required autocomplete="username" autocapitalize="none" spellcheck="false"></label>
    <label>Contraseña<input name="pass" type="password" required autocomplete="current-password"></label>
    <button class="pn__btn" type="submit">Entrar</button>
  </form>

<?php else:
  $data = lolita_price_public(); $c = $data['current']; ?>
  <h1>Precio de la cubeta</h1>
  <p class="pn__lead">Hola, <?= h($_SESSION['user']) ?>. Aquí registras el precio nuevo cuando cambie. La página lo muestra al instante, con la fecha, la flecha de sube o baja y la variación.</p>
  <form method="post" class="pn__card">
    <input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="action" value="price">
    <label>Precio nuevo de la cubeta (en pesos)
      <input name="price" inputmode="numeric" required placeholder="Ej: 20000" autocomplete="off" id="newPrice">
    </label>
    <p class="pn__preview" id="preview" data-current="<?= (int) $c['price'] ?>" aria-live="polite">Precio actual: $<?= number_format($c['price'], 0, ',', '.') ?></p>
    <label>Nota (opcional)<input name="note" maxlength="140" placeholder="Ej: subió el alimento" autocomplete="off"></label>
    <button class="pn__btn" type="submit">Guardar precio</button>
  </form>
  <section class="pn__card pcard" id="priceCard" data-src="../api/price.php" aria-busy="true"><p class="pcard__note">Cargando…</p></section>
  <form method="post" class="pn__out"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="action" value="logout"><button class="pn__link" type="submit">Cerrar sesión</button></form>
  <script src="../js/price.js?v=20261026a"></script>
  <script src="panel.js?v=20261026a"></script>
<?php endif; ?>
</main>
</body>
</html>
