let reserva = {};
let map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

let marker;

async function buscarDestino() {
  try {
    const pais = document.getElementById('country').value.trim();
    if (!pais) return alert("Escribe un país");

    // 1) País
    const rc = await fetch(`https://restcountries.com/v3.1/name/${pais}`);
    if (!rc.ok) throw new Error("País no encontrado");
    const country = await rc.json();
    const c = country[0];

    const capital = c.capital?.[0] || c.name.common;

    // 2) Geocoding
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${capital}`);
    const geoData = await geo.json();
    if (!geoData.results?.length) throw new Error("No se encontró la capital");

    const lat = geoData.results[0].latitude;
    const lon = geoData.results[0].longitude;

    // 3) Clima
    const clima = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`);
    const climaData = await clima.json();

    // 4) Tipo de cambio
    const rates = await fetch('https://open.er-api.com/v6/latest/USD');
    const ratesData = await rates.json();

    document.getElementById('info').innerHTML = `
      <div class="col-md-6">
        <div class="card p-3">
          <img src="${c.flags.png}" width="120">
          <h3>${c.name.common}</h3>
          <p>Capital: ${capital}</p>
          <p>Población: ${c.population.toLocaleString()}</p>
          <p>Moneda: ${Object.keys(c.currencies || {})[0] || 'N/D'}</p>
          <p>Idioma: ${Object.values(c.languages || {})[0] || 'N/D'}</p>
          <p>Temperatura: ${climaData.current.temperature_2m} °C</p>
          <p>1 USD = ${ratesData.rates.MXN} MXN</p>
        </div>
      </div>`;

    // Corregir marcador duplicado
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map);
    map.setView([lat, lon], 6);

    reserva.destino = c.name.common;
    reserva.clima = climaData.current.temperature_2m + " °C";
    reserva.mxn = ratesData.rates.MXN;

  } catch (e) {
    console.error(e);
    alert("Error al consultar APIs: " + e.message);
  }
}