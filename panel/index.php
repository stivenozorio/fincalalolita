<?php
/* El panel antiguo (archivos en el hosting) se reemplazó por /admin/ (Supabase). */
header('Cache-Control: no-store');
header('Location: ../admin/', true, 302);
exit;
