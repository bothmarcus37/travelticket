// Genera el ticket de reserva en PDF (jsPDF) con el mismo estilo de pase de abordar de la página
$('reserva').addEventListener('submit', e => {
  e.preventDefault();
  const aviso = (texto, tipo = 'warning') => showMsg(texto, tipo, 'msgReserva');
  const falla = (id, texto) => { $(id).classList.add('is-invalid'); $(id).focus(); aviso(texto); };
  if (!reserva) return aviso('Primero busca un destino.');

  const cliente = $('cliente').value.trim(), fecha = $('fecha').value;
  const personas = parseInt($('personas').value), costo = parseFloat($('costo').value);
  if (cliente.length < 3) return falla('cliente', 'Escribe el nombre del cliente.');
  if (!fecha || fecha < $('fecha').min) return falla('fecha', 'Elige una fecha de viaje válida (hoy o posterior).');
  if (!(personas >= 1)) return falla('personas', 'El número de personas debe ser al menos 1.');
  if (!(costo > 0)) return falla('costo', 'Escribe un costo mayor a 0.');

  try {
    const { jsPDF } = window.jspdf, doc = new jsPDF();
    const ahora = new Date(), r = reserva.tasas, total = costo * personas;
    const folio = 'TT-' + hoyLocal().replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
    const fechaViaje = new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const monedas = ['USD', ...monedasVisibles()];   // las mismas conversiones que el usuario eligió en pantalla

    // Paleta de la página
    const INK = [18, 38, 63], SEA = [27, 127, 140], SUN = [244, 166, 42], PAPER = [246, 243, 236], LINE = [221, 214, 200], MUTED = [93, 107, 122];
    const X = 15, W = 180, R = X + W;                       // márgenes del pase
    const etiqueta = (t, x, y) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(t.toUpperCase(), x, y, { charSpace: .4 }); };
    const valor = (t, x, y, ancho = 80, size = 12) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(size); doc.setTextColor(...INK); const l = doc.splitTextToSize(String(t), ancho); doc.text(l, x, y); return l.length; };

    // Fondo y tarjeta
    doc.setFillColor(...PAPER); doc.rect(0, 0, 210, 297, 'F');
    // El alto del pase depende del texto y de cuántas monedas se eligieron, así que se calcula antes de dibujar
    const textoClima = `${Math.round(reserva.clima.temp)} °C, ${reserva.clima.desc}, humedad ${reserva.clima.hum}%`;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
    const lineasDestino = doc.splitTextToSize(reserva.destino, reserva.codigo ? 125 : 160);
    doc.setFontSize(12); const nCliente = doc.splitTextToSize(cliente, 80).length;
    doc.setFontSize(11); const nClima = doc.splitTextToSize(textoClima, 70).length;
    const finCuerpo = 62 + 11 + lineasDestino.length * 10 + 10 + (12 + nCliente * 5) + (12 + nClima * 5) + 37 + 4 + monedas.length * 9;
    const yc = Math.max(228, finCuerpo + 8);               // línea de corte del talón
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...LINE); doc.roundedRect(X, 15, W, yc + 37 - 15, 4, 4, 'FD');

    // Cabecera
    doc.setFillColor(...INK); doc.roundedRect(X, 15, W, 30, 4, 4, 'F'); doc.rect(X, 35, W, 10, 'F');
    doc.setFillColor(...SUN); doc.rect(X, 45, W, 2, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text(window.CONFIG?.empresa || 'TravelTicket', X + 10, 34);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...SUN);
    doc.text('TICKET DE RESERVA', R - 10, 29, { align: 'right' });
    doc.setTextColor(255); doc.setFont('courier', 'bold'); doc.setFontSize(11);
    doc.text(folio, R - 10, 36, { align: 'right' });

    // Destino
    let y = 62;
    etiqueta('Destino', X + 10, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(...INK);
    doc.text(lineasDestino, X + 10, y + 11);
    if (reserva.codigo) { doc.setFont('courier', 'bold'); doc.setFontSize(34); doc.setTextColor(...SEA); doc.text(reserva.codigo, R - 10, y + 11, { align: 'right' }); }
    y += 11 + lineasDestino.length * 10;

    // Datos de la reserva (dos columnas)
    doc.setDrawColor(...LINE); doc.line(X + 10, y, R - 10, y); y += 10;
    const c1 = X + 10, c2 = X + 100;
    etiqueta('Cliente', c1, y); etiqueta('Fecha del viaje', c2, y);
    const n = valor(cliente, c1, y + 6); valor(fechaViaje, c2, y + 6);
    y += 12 + n * 5;
    etiqueta('Viajeros', c1, y); etiqueta('Clima al reservar', c2, y);
    valor(personas, c1, y + 6);
    const m = valor(textoClima, c2, y + 6, 70, 11);
    y += 12 + m * 5;

    // Costos
    doc.setFillColor(...INK); doc.roundedRect(X + 10, y, W - 20, 26, 3, 3, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(184, 198, 212);
    doc.text('COSTO TOTAL', X + 17, y + 9, { charSpace: .4 });
    doc.text(`${personas} ${personas === 1 ? 'viajero' : 'viajeros'} x ${fmt(costo, 'USD')} por persona`, X + 17, y + 19);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...SUN);
    doc.text(fmt(total, 'USD'), R - 17, y + 17, { align: 'right' });
    y += 37;

    // Conversión de moneda
    etiqueta('Conversión de moneda', c1, y); y += 4;
    monedas.forEach((c, i) => {
      if (i % 2 === 0) { doc.setFillColor(...PAPER); doc.rect(X + 10, y, W - 20, 9, 'F'); }
      doc.setFont('courier', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK); doc.text(c, X + 14, y + 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
      doc.text(`1 USD = ${r[c].toFixed(4)} ${c}${c === reserva.moneda ? '  (moneda del destino)' : ''}`, X + 32, y + 6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK);
      doc.text(fmt(total * r[c], c), R - 14, y + 6, { align: 'right' });
      y += 9;
    });

    // Línea de corte y talón
    doc.setDrawColor(...LINE); doc.setLineDashPattern([2, 2], 0); doc.line(X, yc, R, yc); doc.setLineDashPattern([], 0);
    doc.setFillColor(...PAPER); doc.circle(X, yc, 4, 'F'); doc.circle(R, yc, 4, 'F');
    etiqueta('Pasajero', c1, yc + 11); valor(cliente, c1, yc + 17, 70, 11);
    etiqueta('Folio', c1, yc + 25); doc.setFont('courier', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK); doc.text(folio, c1, yc + 30.5);
    // Código de barras decorativo derivado del folio
    let bx = c2; doc.setFillColor(...INK);
    for (const ch of folio.repeat(4)) { const a = ch.charCodeAt(0) % 4 * .4 + .4; if (bx + a > R - 10) break; doc.rect(bx, yc + 8, a, 18, 'F'); bx += a + (ch.charCodeAt(0) % 3) * .4 + .5; }

    // Pie
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text('Fecha de emisión: ' + ahora.toLocaleString('es-MX'), X, yc + 46);
    doc.text('Clima y tasas de referencia al momento de la reserva.', X, yc + 52);

    doc.save(`ticket_${folio}.pdf`);
    aviso('Ticket generado: ' + folio, 'success');
  } catch (err) {
    aviso('No se pudo generar el PDF: ' + err.message, 'danger');
  }
});
