// ===== Utilidades =====
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt = (n, cur) => { try { return new Intl.NumberFormat('es-MX', {style:'currency', currency:cur}).format(n); } catch { return n.toFixed(2) + ' ' + cur; } };
const WMO = {0:'Despejado',1:'Mayormente despejado',2:'Parcialmente nublado',3:'Nublado',45:'Niebla',48:'Niebla con escarcha',51:'Llovizna ligera',53:'Llovizna',55:'Llovizna intensa',61:'Lluvia ligera',63:'Lluvia',65:'Lluvia fuerte',71:'Nieve ligera',73:'Nieve',75:'Nieve fuerte',80:'Chubascos',81:'Chubascos fuertes',82:'Chubascos violentos',95:'Tormenta eléctrica',96:'Tormenta con granizo',99:'Tormenta con granizo fuerte'};

let reserva = null;   // datos del destino consultado
let marker;

const ICONO_MSG = { danger: 'exclamation-octagon', warning: 'exclamation-triangle', success: 'check-circle', info: 'info-circle' };
// "donde" permite mostrar el mensaje junto al buscador ('msg') o junto al formulario de reserva ('msgReserva')
function showMsg(text, type = 'danger', donde = 'msg') {
  $(donde).innerHTML = text ? `<div class="alert alert-${type}"><i class="bi bi-${ICONO_MSG[type] || 'info-circle'}" aria-hidden="true"></i><span>${esc(text)}</span></div>` : '';
}

// Icono de Bootstrap Icons según el código de clima WMO
function iconoClima(code) {
  if (code === 0 || code === 1) return 'sun';
  if (code === 2) return 'cloud-sun';
  if (code === 3) return 'clouds';
  if (code === 45 || code === 48) return 'cloud-fog2';
  if (code >= 51 && code <= 57) return 'cloud-drizzle';
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return 'cloud-snow';
  if (code >= 95) return 'cloud-lightning-rain';
  if (code >= 61 && code <= 82) return 'cloud-rain';
  return 'cloud';
}

// Fetch con manejo de errores de red y HTTP (lee el mensaje de la API si existe)
async function getJSON(url) {
  let r;
  try { r = await fetch(url); } catch { throw new Error('Sin conexión o servicio no disponible.'); }
  if (!r.ok) {
    let msg = 'Error HTTP ' + r.status;
    try { msg = (await r.json()).errors?.[0]?.message || msg; } catch {}
    const e = new Error(msg); e.status = r.status; throw e;
  }
  return r.json();
}

// ===== Mapa (Leaflet + OpenStreetMap) =====
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
const PIN = L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });

// ===== Configuración local (data/config.json) =====
fetch('data/config.json').then(r => r.json()).then(c => { $('empresa').textContent = c.empresa; window.CONFIG = c; }).catch(() => {});

// ===== API 1: REST Countries v5 (a través de api/countries.php, que agrega la API key) =====
const norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const txt = v => (typeof v === 'string' || typeof v === 'number') ? String(v) : (v && typeof v === 'object' ? (Object.values(v).find(x => typeof x === 'string') || '') : '');
const RC_FIELDS = 'names,codes.alpha_2,capitals,flag.url_png,currencies,languages,population,coordinates';
const rc = (path, params = {}) => getJSON('api/countries.php?' + new URLSearchParams({ path, response_fields: RC_FIELDS, ...params }));
const objetos = r => r?.data?.objects || [];

async function buscarPais(q) {
  const lista = [];
  // names.translations cubre el español; name cubre nombre común/oficial/alternos
  for (const path of ['names.translations', 'name']) {
    try { lista.push(...objetos(await rc(path, { q, limit: 10 }))); }
    catch (e) { if (e.status !== 404) throw e; }   // errores de clave/red se muestran; un 404 solo significa "sin resultados"
  }
  const nombres = o => [o.names?.common, o.names?.translations?.spa?.common, ...(o.names?.alternates || [])].map(norm);
  const n = norm(q);
  return lista.find(o => nombres(o).includes(n)) || lista.find(o => nombres(o).some(x => x.startsWith(n))) || null;
}

// Si no es un país, se busca como ciudad (Open-Meteo Geocoding) y se obtiene su país
async function buscarCiudad(q) {
  const g = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=es`);
  if (!g.results?.length) return null;
  const r = g.results[0];
  const c = objetos(await rc(`codes.alpha_2/${r.country_code}`))[0];
  return c ? { country: c, ciudad: { nombre: r.name, lat: r.latitude, lon: r.longitude } } : null;
}

// Normaliza la respuesta de v5 a lo que usa la interfaz
function datosPais(c) {
  const ok = v => typeof v === 'number' && isFinite(v);
  const cap = c.capitals?.[0], co = cap?.coordinates;
  let lat = co?.lat ?? co?.latitude ?? (Array.isArray(co) ? co[0] : undefined);
  let lon = co?.lng ?? co?.lon ?? co?.longitude ?? (Array.isArray(co) ? co[1] : undefined);
  if (!ok(lat) || !ok(lon)) { lat = c.coordinates?.lat; lon = c.coordinates?.lng; }
  const cur = c.currencies;
  const monedas = (Array.isArray(cur) ? cur.map(x => typeof x === 'string' ? { code: x, name: '' } : { code: x.code || x.alpha_3 || '', name: txt(x.name) })
                                      : Object.entries(cur || {}).map(([k, v]) => ({ code: v?.code || k, name: txt(v?.name) }))).filter(m => m.code);
  const idiomas = [...new Set((c.languages || []).map(l => typeof l === 'string' ? l : txt(l.english_name ?? l.name ?? l)).filter(Boolean))];
  return {
    nombre: c.names?.translations?.spa?.common || c.names?.common, oficial: c.names?.official || '',
    capital: txt(cap?.name) || 'N/D', poblacion: c.population, bandera: c.flag?.url_png || '',
    monedas, idiomas, lat, lon, codigo: txt(c.codes?.alpha_2).toUpperCase()
  };
}

// ===== API 3: Open-Meteo (clima actual) =====
const getClima = (lat, lon) => getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`);

// ===== API 4: ExchangeRate-API (base USD) =====
const getTasas = () => getJSON('https://open.er-api.com/v6/latest/USD');

// ===== Costos =====
function totalUSD() { return (parseFloat($('costo').value) || 0) * Math.max(1, parseInt($('personas').value) || 1); }

// Monedas de conversión: el usuario elige cuáles ver (se recuerdan en este navegador)
const MAX_MONEDAS = 4;
let misMonedas = ['MXN', 'EUR'];
try { const g = JSON.parse(localStorage.getItem('tt_monedas')); if (Array.isArray(g)) misMonedas = g.filter(c => /^[A-Z]{3}$/.test(c)).slice(0, MAX_MONEDAS); } catch {}
const guardarMonedas = () => { try { localStorage.setItem('tt_monedas', JSON.stringify(misMonedas)); } catch {} };
const nombresMoneda = (() => { try { return new Intl.DisplayNames('es', { type: 'currency' }); } catch { return null; } })();
const nombreMoneda = c => { try { return nombresMoneda?.of(c) || c; } catch { return c; } };
// Se muestra primero la moneda del destino y después las elegidas (USD es la base y va en el total)
const monedasVisibles = () => reserva ? [...new Set([reserva.moneda, ...misMonedas])].filter(c => c !== 'USD' && reserva.tasas[c]) : [];

function mostrarCostos() {
  if (!reserva) return;
  const t = totalUSD(), r = reserva.tasas, visibles = monedasVisibles();
  const n = Math.max(1, parseInt($('personas').value) || 1);
  const detalle = `${n} ${n === 1 ? 'viajero' : 'viajeros'} × ${fmt(parseFloat($('costo').value) || 0, 'USD')}`;
  const lleno = misMonedas.length >= MAX_MONEDAS;
  const opciones = Object.keys(r).filter(c => c !== 'USD' && !visibles.includes(c))
    .map(c => ({ c, nombre: nombreMoneda(c) })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map(o => `<option value="${esc(o.c)}">${esc(o.nombre === o.c ? o.c : o.nombre + ' (' + o.c + ')')}</option>`).join('');
  $('costos').innerHTML =
    `<div class="costo-total"><span>Total del viaje</span><strong>${esc(fmt(t, 'USD'))}</strong><em>${esc(detalle)}</em></div>` +
    visibles.map(c => {
      const destino = c === reserva.moneda;
      return `<div class="costo-fila">
        <span><b class="divisa${destino ? ' destino' : ''}">${esc(c)}</b><span class="costo-nombre">${esc(nombreMoneda(c))}<small>${destino ? 'Destino · ' : ''}1 USD = ${esc(r[c].toFixed(2))}</small></span></span>
        <strong>${esc(fmt(t * r[c], c))}</strong>
        ${destino ? '<span class="quitar-hueco"></span>' : `<button type="button" class="quitar" data-quitar="${esc(c)}" aria-label="Quitar ${esc(nombreMoneda(c))}" title="Quitar"><i class="bi bi-x-lg" aria-hidden="true"></i></button>`}
      </div>`;
    }).join('') +
    `<div class="agregar">
      <label for="selMoneda" class="visually-hidden">Agregar una moneda</label>
      <select id="selMoneda" class="form-select"${lleno ? ' disabled' : ''}>
        <option value="">${lleno ? `Máximo ${MAX_MONEDAS} monedas: quita una para agregar otra` : '＋ Agregar otra moneda…'}</option>${opciones}
      </select>
    </div>`;
}
// Agregar / quitar monedas (delegación de eventos: las filas se vuelven a dibujar)
$('costos').addEventListener('change', e => {
  if (e.target.id !== 'selMoneda' || !e.target.value || misMonedas.length >= MAX_MONEDAS) return;
  misMonedas.push(e.target.value); guardarMonedas(); mostrarCostos(); $('selMoneda').focus();
});
$('costos').addEventListener('click', e => {
  const b = e.target.closest('[data-quitar]'); if (!b) return;
  misMonedas = misMonedas.filter(c => c !== b.dataset.quitar); guardarMonedas(); mostrarCostos(); $('selMoneda').focus();
});

// Talón del pase: resumen en vivo de lo que se va capturando
function mostrarResumen() {
  const f = $('fecha').value;
  $('rCodigo').textContent = reserva?.codigo || '—';
  $('rDestino').textContent = reserva?.destino || '—';
  $('rCliente').textContent = $('cliente').value.trim() || '—';
  $('rFecha').textContent = f ? new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  $('rPersonas').textContent = Math.max(1, parseInt($('personas').value) || 1);
  $('rTotal').textContent = reserva ? fmt(totalUSD(), 'USD') : '—';
}
['costo', 'personas'].forEach(id => $(id).addEventListener('input', mostrarCostos));
['cliente', 'fecha', 'costo', 'personas'].forEach(id => $(id).addEventListener('input', () => {
  $(id).classList.remove('is-invalid'); showMsg('', 'info', 'msgReserva'); mostrarResumen();
}));

// Destinos populares: llenan el buscador y lanzan la búsqueda
document.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
  $('country').value = b.dataset.destino; $('busqueda').requestSubmit();
}));
// Fecha de hoy en hora local (toISOString usa UTC y por la noche adelantaría un día)
const hoyLocal = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
$('fecha').min = hoyLocal();

// ===== Búsqueda principal =====
$('busqueda').addEventListener('submit', async e => {
  e.preventDefault();
  const q = $('country').value.trim();
  if (!q) return showMsg('Escribe un país o ciudad.', 'warning');
  const btn = $('btnBuscar'); btn.disabled = true; btn.classList.add('cargando'); showMsg('');
  $('intro').hidden = true; $('resultados').hidden = true; $('cargando').hidden = false;
  try {
    let c = await buscarPais(q), ciudad = null;
    if (!c) { const r = await buscarCiudad(q); if (r) { c = r.country; ciudad = r.ciudad; } }
    if (!c) return showMsg('No se encontró ese destino. Revisa la ortografía.', 'warning');

    const p = datosPais(c);
    const [lat, lon] = ciudad ? [ciudad.lat, ciudad.lon] : [p.lat, p.lon];
    if (typeof lat !== 'number' || typeof lon !== 'number') throw new Error('La API no devolvió coordenadas para este destino.');
    const [clima, fx] = await Promise.all([getClima(lat, lon), getTasas()]);
    const moneda = p.monedas[0]?.code || 'USD';
    const cur = clima.current;

    reserva = {
      destino: ciudad ? `${ciudad.nombre}, ${p.nombre}` : p.nombre, pais: p.nombre, codigo: p.codigo, moneda, tasas: fx.rates,
      clima: { temp: cur.temperature_2m, desc: WMO[cur.weather_code] || 'Sin descripción', hum: cur.relative_humidity_2m, viento: cur.wind_speed_10m }
    };

    const dato = (icono, titulo, valor) => `<div class="dato"><dt><i class="bi bi-${icono}" aria-hidden="true"></i>${titulo}</dt><dd>${esc(valor)}</dd></div>`;
    $('info').innerHTML = `
      <div class="dest-head">
        ${p.bandera ? `<img class="flag" src="${esc(p.bandera)}" alt="Bandera de ${esc(p.nombre)}">` : ''}
        <div>
          <p class="eyebrow">${ciudad ? 'Ciudad' : 'País'}</p>
          <h2 class="dest-nombre">${esc(reserva.destino)}</h2>
          <p class="dest-oficial">${esc(p.oficial)}</p>
        </div>
      </div>
      <dl class="datos">
        ${dato('bank', 'Capital', p.capital)}
        ${dato('people', 'Población', typeof p.poblacion === 'number' ? p.poblacion.toLocaleString('es-MX') : 'N/D')}
        ${dato('cash-coin', 'Moneda', p.monedas.map(m => m.name ? `${m.name} (${m.code})` : m.code).join(', ') || 'N/D')}
        ${dato('translate', 'Idiomas', p.idiomas.join(', ') || 'N/D')}
      </dl>`;
    // Semana: Open-Meteo devuelve 7 días empezando por hoy (fecha local del destino, por timezone=auto)
    const dia = clima.daily, fechaDia = t => new Date(t + 'T12:00:00');
    const hoyTexto = dia?.time?.[0] ? fechaDia(dia.time[0]).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
    const semana = (dia?.time || []).map((t, i) => `
        <div class="dia${i === 0 ? ' hoy' : ''}"${i === 0 ? ' aria-current="date"' : ''} title="${esc(WMO[dia.weather_code[i]] || '')}">
          <span class="dia-nombre">${i === 0 ? 'Hoy' : esc(fechaDia(t).toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', ''))}</span>
          <span class="dia-num">${fechaDia(t).getDate()}</span>
          <i class="bi bi-${iconoClima(dia.weather_code[i])}" aria-hidden="true"></i>
          <strong>${Math.round(dia.temperature_2m_max[i])}°</strong>
          <span class="dia-min">${Math.round(dia.temperature_2m_min[i])}°</span>
        </div>`).join('');
    $('clima').innerHTML = `
      <div class="panel-titulo"><i class="bi bi-thermometer-half" aria-hidden="true"></i> Clima actual en ${esc(ciudad ? ciudad.nombre : p.capital !== 'N/D' ? p.capital : p.nombre)}</div>
      ${hoyTexto ? `<p class="clima-hoy"><i class="bi bi-calendar-event" aria-hidden="true"></i> Hoy es <b>${esc(hoyTexto)}</b></p>` : ''}
      <div class="clima-top">
        <div class="temp">${Math.round(reserva.clima.temp)}<small>°C</small></div>
        <i class="bi bi-${iconoClima(cur.weather_code)} clima-icono" aria-hidden="true"></i>
      </div>
      <p class="clima-desc">${esc(reserva.clima.desc)}</p>
      <div class="clima-meta">
        <div><span><i class="bi bi-droplet" aria-hidden="true"></i> Humedad</span><strong>${esc(reserva.clima.hum)}%</strong></div>
        <div><span><i class="bi bi-wind" aria-hidden="true"></i> Viento</span><strong>${esc(reserva.clima.viento)} km/h</strong></div>
      </div>
      ${semana ? `<p class="semana-titulo">Esta semana <span>máx / mín · fecha local del destino</span></p><div class="semana">${semana}</div>` : ''}`;
    $('fxFecha').textContent = 'Tasas actualizadas: ' + new Date(fx.time_last_update_unix * 1000).toLocaleDateString('es-MX');
    $('destino').value = reserva.destino;
    $('cargando').hidden = true; $('resultados').hidden = false;

    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon], { icon: PIN }).addTo(map).bindPopup(esc(reserva.destino)).openPopup();
    map.setView([lat, lon], ciudad ? 10 : 6);
    setTimeout(() => map.invalidateSize(), 100);
    mostrarCostos(); mostrarResumen(); showMsg('');
    $('busqueda').scrollIntoView({ block: 'start' });   // deja el buscador arriba y los resultados a la vista
  } catch (err) {
    showMsg('Error al consultar las APIs: ' + err.message);
  } finally {
    btn.disabled = false; btn.classList.remove('cargando'); $('cargando').hidden = true;
    if ($('resultados').hidden) $('intro').hidden = false;   // sin resultados: se vuelve al estado inicial
  }
});
