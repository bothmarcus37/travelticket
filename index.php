<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#12263f">
<meta name="description" content="Consulta el clima, el costo en otras monedas y la ubicación de tu destino, y emite tu ticket de reserva en PDF.">
<title>TravelTicket · Consulta tu destino y emite tu ticket</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="css/style.css">
</head>
<body>

<header class="hero">
  <!-- Ruta de vuelo decorativa -->
  <svg class="hero-ruta" viewBox="0 0 600 300" aria-hidden="true" focusable="false">
    <path d="M10 270 C 160 250, 300 40, 560 50" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 12" stroke-linecap="round"/>
    <circle cx="10" cy="270" r="6" fill="currentColor"/>
    <g transform="translate(560 50) rotate(-8)">
      <path d="M-16 0 L10 -3 L18 0 L10 3 Z M-2 -1 L-10 -14 L-5 -14 L6 -2 Z M-2 1 L-10 14 L-5 14 L6 2 Z M-14 -1 L-19 -7 L-16 -7 L-11 -1 Z" fill="currentColor"/>
    </g>
  </svg>

  <div class="container position-relative">
    <div class="topbar">
      <a class="brand" href="./" aria-label="Inicio">
        <span class="brand-icon"><i class="bi bi-airplane-fill"></i></span>
        <span id="empresa">TravelTicket</span>
      </a>
      <span class="topbar-nota d-none d-sm-inline"><i class="bi bi-shield-check"></i> Datos en tiempo real</span>
    </div>

    <p class="eyebrow">Planea · Consulta · Reserva</p>
    <h1>Elige tu destino y emite tu <span class="resalte">ticket de viaje</span>.</h1>
    <p class="hero-sub">Consulta el clima, el costo en otras monedas y la ubicación antes de reservar.</p>
  </div>
</header>

<main class="container pb-5">

  <!-- Buscador -->
  <form id="busqueda" class="search-card" novalidate>
    <label for="country" class="search-label">¿A dónde quieres ir?</label>
    <div class="search-row">
      <div class="search-input">
        <i class="bi bi-geo-alt" aria-hidden="true"></i>
        <input id="country" class="form-control" placeholder="País o ciudad: México, Japón, Lisboa…" autocomplete="off" required>
      </div>
      <button id="btnBuscar" class="btn btn-buscar" type="submit">
        <span class="btn-normal"><i class="bi bi-search" aria-hidden="true"></i> Buscar destino</span>
        <span class="btn-cargando"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Buscando…</span>
      </button>
    </div>
    <div class="chips" aria-label="Destinos populares">
      <span class="chips-titulo">Populares:</span>
      <button type="button" class="chip" data-destino="México">México</button>
      <button type="button" class="chip" data-destino="Japón">Japón</button>
      <button type="button" class="chip" data-destino="Lisboa">Lisboa</button>
      <button type="button" class="chip" data-destino="París">París</button>
      <button type="button" class="chip" data-destino="Perú">Perú</button>
      <button type="button" class="chip" data-destino="Nueva York">Nueva York</button>
    </div>
  </form>

  <div id="msg" role="alert" aria-live="polite"></div>

  <!-- Estado inicial: cómo funciona -->
  <section id="intro" class="pasos" aria-label="Cómo funciona">
    <article class="paso">
      <span class="paso-num">1</span>
      <i class="bi bi-search paso-icono" aria-hidden="true"></i>
      <h2>Busca tu destino</h2>
      <p>Escribe un país o una ciudad. Te mostramos su capital, idiomas, moneda y bandera.</p>
    </article>
    <article class="paso">
      <span class="paso-num">2</span>
      <i class="bi bi-cloud-sun paso-icono" aria-hidden="true"></i>
      <h2>Revisa clima y costos</h2>
      <p>Clima actual, ubicación en el mapa y el costo de tu viaje convertido a otras monedas.</p>
    </article>
    <article class="paso">
      <span class="paso-num">3</span>
      <i class="bi bi-ticket-perforated paso-icono" aria-hidden="true"></i>
      <h2>Emite tu ticket</h2>
      <p>Completa los datos de la reserva y descarga tu ticket en PDF al instante.</p>
    </article>
  </section>

  <!-- Estado de carga -->
  <div id="cargando" class="row g-3" hidden aria-hidden="true">
    <div class="col-12 col-lg-7"><div class="esqueleto" style="height:260px"></div></div>
    <div class="col-12 col-lg-5"><div class="esqueleto" style="height:260px"></div></div>
    <div class="col-12"><div class="esqueleto" style="height:220px"></div></div>
  </div>

  <!-- Resultados -->
  <div id="resultados" hidden>
    <div class="row g-3">
      <div class="col-12 col-lg-7">
        <section class="panel h-100" id="info" aria-label="Información del destino"></section>
      </div>
      <div class="col-12 col-lg-5">
        <section class="panel panel-clima h-100" id="clima" aria-label="Clima actual"></section>
      </div>

      <div class="col-12 col-lg-7">
        <section class="panel panel-mapa h-100" aria-label="Ubicación">
          <div class="panel-titulo"><i class="bi bi-map" aria-hidden="true"></i> Ubicación</div>
          <div id="map"></div>
        </section>
      </div>
      <div class="col-12 col-lg-5">
        <section class="panel h-100" aria-label="Costo estimado">
          <div class="panel-titulo"><i class="bi bi-cash-coin" aria-hidden="true"></i> Costo estimado</div>
          <div id="costos"></div>
          <small class="fx-fecha" id="fxFecha"></small>
        </section>
      </div>
    </div>

    <!-- Reserva con forma de pase de abordar -->
    <form id="reserva" class="pase" novalidate>
      <div class="pase-cabecera">
        <span><i class="bi bi-ticket-perforated-fill" aria-hidden="true"></i> Datos de la reserva</span>
        <span class="pase-cabecera-nota">Pase de reserva</span>
      </div>

      <div class="pase-cuerpo">
        <div class="pase-form">
          <div class="row g-3">
            <div class="col-md-6">
              <label for="cliente" class="form-label">Nombre del cliente</label>
              <input id="cliente" class="form-control" placeholder="Nombre y apellido" autocomplete="name" required minlength="3">
            </div>
            <div class="col-md-6">
              <label for="destino" class="form-label">Destino</label>
              <input id="destino" class="form-control" readonly>
            </div>
            <div class="col-md-4">
              <label for="fecha" class="form-label">Fecha del viaje</label>
              <input id="fecha" type="date" class="form-control" required>
            </div>
            <div class="col-6 col-md-4">
              <label for="personas" class="form-label">Número de personas</label>
              <input id="personas" type="number" min="1" max="20" value="1" class="form-control" required>
            </div>
            <div class="col-6 col-md-4">
              <label for="costo" class="form-label">Costo por persona (USD)</label>
              <input id="costo" type="number" min="1" step="any" value="100" class="form-control" required>
            </div>
          </div>
          <div id="msgReserva" class="mt-3" role="alert" aria-live="polite"></div>
          <button class="btn btn-emitir" type="submit"><i class="bi bi-file-earmark-arrow-down" aria-hidden="true"></i> Generar ticket PDF</button>
        </div>

        <!-- Talón: resumen en vivo -->
        <aside class="pase-talon" aria-label="Resumen de la reserva">
          <div class="talon-codigo" id="rCodigo">—</div>
          <div class="talon-destino" id="rDestino">—</div>
          <dl class="talon-datos">
            <div><dt>Pasajero</dt><dd id="rCliente">—</dd></div>
            <div><dt>Fecha</dt><dd id="rFecha">—</dd></div>
            <div><dt>Viajeros</dt><dd id="rPersonas">1</dd></div>
            <div><dt>Total</dt><dd id="rTotal">—</dd></div>
          </dl>
          <div class="talon-barras" aria-hidden="true"></div>
        </aside>
      </div>
    </form>
  </div>
</main>

<footer class="pie">
  <div class="container">
    <span><i class="bi bi-airplane-fill" aria-hidden="true"></i> TravelTicket</span>
    <span>Datos: REST Countries · Open-Meteo · ExchangeRate-API · OpenStreetMap</span>
  </div>
</footer>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
<script src="js/app.js"></script>
<script src="js/pdf.js"></script>
</body>
</html>
