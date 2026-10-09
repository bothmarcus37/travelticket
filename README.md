# TravelTicket

Aplicación web para consultar un destino (país o ciudad) y generar un ticket de reserva en PDF.

## Configuración (una sola vez)
REST Countries retiró sus versiones v1–v4 (la v3.1 ya no responde). La v5 requiere una API key gratuita:
1. Crea una cuenta en https://restcountries.com/sign-up y copia tu API key.
2. Abre `api/config.php` y reemplaza `PEGA_TU_API_KEY` por tu clave.
3. Copia la carpeta a `htdocs` (XAMPP, con Apache iniciado) y abre `http://localhost/TravelTicket/`.

La clave vive solo en el servidor: `js/app.js` llama a `api/countries.php`, que reenvía la petición a REST Countries con
la clave. Así no se expone y se evitan problemas de CORS. Requiere PHP con la extensión cURL (incluida en XAMPP).
No subas `api/config.php` con tu clave a un repositorio público.

## APIs utilizadas
| API | Uso |
|---|---|
| REST Countries v5 (con API key) | País, capital, bandera, moneda, idiomas, población, coordenadas |
| Open-Meteo Geocoding | Localizar ciudades |
| Open-Meteo Forecast | Clima actual |
| ExchangeRate-API (open.er-api.com) | Tasas de cambio con base USD |
| OpenStreetMap + Leaflet | Mapa interactivo |
| jsPDF | Ticket PDF |
| Google Fonts (Poppins) / Bootstrap 5 | Diseño |

## Estructura
- `index.php`: interfaz. `css/style.css`: estilos. `data/config.json`: nombre de la empresa.
- `api/countries.php`: proxy a REST Countries v5. `api/config.php`: tu API key.
- `js/app.js`: consultas a APIs, mapa y costos. `js/pdf.js`: validación y generación del PDF.
