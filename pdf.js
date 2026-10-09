
function generarPDF(){
const {jsPDF}=window.jspdf;
const doc=new jsPDF();

const folio='TT-'+Date.now();

doc.setFontSize(18);
doc.text('Ticket de Reserva',20,20);
doc.setFontSize(12);
doc.text('Folio: '+folio,20,35);
doc.text('Cliente: '+document.getElementById('cliente').value,20,45);
doc.text('Destino: '+(reserva.destino||''),20,55);
doc.text('Fecha Viaje: '+document.getElementById('fecha').value,20,65);
doc.text('Viajeros: '+document.getElementById('personas').value,20,75);
doc.text('Clima: '+(reserva.clima||''),20,85);

let usd=parseFloat(document.getElementById('costo').value||0);
let mxn=(usd*(reserva.mxn||0)).toFixed(2);

doc.text('Costo USD: '+usd,20,95);
doc.text('Costo MXN: '+mxn,20,105);
doc.text('Emision: '+new Date().toLocaleString(),20,115);

doc.save('ticket_reserva.pdf');
}
