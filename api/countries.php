<?php
// Proxy hacia REST Countries v5: agrega la API key en el servidor (evita CORS y no expone la clave).
header('Content-Type: application/json; charset=utf-8');

function fallo($code, $msg) { http_response_code($code); echo json_encode(['errors' => [['message' => $msg]]]); exit; }

$cfg = require __DIR__ . '/config.php';
$key = trim($cfg['restcountries_key'] ?? '');
if ($key === '' || $key === 'PEGA_TU_API_KEY') fallo(500, 'Falta la API key de REST Countries: edita api/config.php.');

$path = $_GET['path'] ?? '';
if (!preg_match('#^[A-Za-z0-9_.]+(/[A-Za-z]{2,3})?$#', $path)) fallo(400, 'Ruta no permitida.');

$params = $_GET; unset($params['path']);
$url = 'https://api.restcountries.com/countries/v5/' . $path . '?' . http_build_query($params);

$ch = curl_init($url);
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12,
  CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Accept: application/json']]);
$body = curl_exec($ch);
if ($body === false) fallo(502, 'No se pudo contactar a REST Countries: ' . curl_error($ch));
http_response_code(curl_getinfo($ch, CURLINFO_HTTP_CODE));
echo $body;
