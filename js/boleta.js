/* ==========================================================================
   BOLETA.JS
   Al confirmar la venta: pide datos del cliente, elige si es pagada o a
   cuenta (fiado), calcula el vuelto en vivo (solo si es pagada), arma la
   boleta, la exporta como PNG, ofrece enviarla por WhatsApp, descuenta el
   stock vendido y guarda un registro en el historial de ventas.
   ========================================================================== */

let ultimaVentaParaBoleta = null;
let tipoPagoActivo = "pagado"; // "pagado" | "fiado"

function abrirModalCliente() {
  if (RosaState.venta.length === 0) return;
  document.getElementById("input-cliente-nombre").value = "";
  document.getElementById("input-cliente-telefono").value = "";
  document.getElementById("input-cliente-pago").value = "";
  document.getElementById("vuelto-calculado").textContent = "";
  document.getElementById("vuelto-calculado").style.color = "";
  seleccionarTipoPago("pagado");
  abrirModal("modal-cliente");
  setTimeout(() => document.getElementById("input-cliente-nombre").focus(), 200);
}

function seleccionarTipoPago(tipo) {
  tipoPagoActivo = tipo;
  document.getElementById("chip-pago-pagado").classList.toggle("active", tipo === "pagado");
  document.getElementById("chip-pago-fiado").classList.toggle("active", tipo === "fiado");
  document.getElementById("campo-pago-efectivo").classList.toggle("hidden", tipo === "fiado");
  document.getElementById("hint-venta-fiado").classList.toggle("hidden", tipo !== "fiado");
  actualizarHintFiado();
}

function actualizarHintFiado() {
  const hint = document.getElementById("hint-venta-fiado");
  if (tipoPagoActivo !== "fiado") return;
  const nombre = document.getElementById("input-cliente-nombre").value.trim();
  hint.textContent = nombre
    ? `Se cargará ${formatoMoneda(calcularTotalVenta())} a la cuenta de "${nombre}".`
    : `Se cargará ${formatoMoneda(calcularTotalVenta())} a la cuenta de este cliente.`;
}

function initBoleta() {
  document.getElementById("chip-pago-pagado").addEventListener("click", () => seleccionarTipoPago("pagado"));
  document.getElementById("chip-pago-fiado").addEventListener("click", () => seleccionarTipoPago("fiado"));
  document.getElementById("input-cliente-nombre").addEventListener("input", actualizarHintFiado);

  document.getElementById("form-cliente").addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = document.getElementById("input-cliente-nombre").value.trim();
    const telefono = document.getElementById("input-cliente-telefono").value.trim();

    if (!nombre) {
      mostrarToast("Ingresa el nombre del cliente", "error");
      return;
    }

    cerrarModal("modal-cliente");
    generarBoleta(nombre, telefono, tipoPagoActivo);
  });

  document.getElementById("cerrar-cliente").addEventListener("click", () => cerrarModal("modal-cliente"));
  document.getElementById("cerrar-boleta").addEventListener("click", () => {
    cerrarModal("modal-boleta");
    RosaState.venta = [];
    reiniciarDescuento();
    renderVenta();
  });

  document.getElementById("btn-descargar-boleta").addEventListener("click", descargarBoletaPNG);
  document.getElementById("btn-whatsapp-boleta").addEventListener("click", enviarBoletaWhatsApp);

  // Calculadora de vuelto en vivo, mientras el cajero escribe cuánto le pagaron (solo si es pagada)
  document.getElementById("input-cliente-pago").addEventListener("input", (e) => {
    const hint = document.getElementById("vuelto-calculado");
    const pago = parseFloat(e.target.value);
    if (isNaN(pago)) {
      hint.textContent = "";
      return;
    }
    const total = calcularTotalVenta();
    const vuelto = pago - total;
    if (vuelto < 0) {
      hint.textContent = `Falta ${formatoMoneda(Math.abs(vuelto))}`;
      hint.style.color = "var(--coral)";
    } else {
      hint.textContent = `Vuelto a entregar: ${formatoMoneda(vuelto)}`;
      hint.style.color = "var(--price)";
    }
  });
}

async function generarBoleta(nombreCliente, telefono, tipoPago) {
  const items = [...RosaState.venta];
  const subtotal = calcularSubtotalVenta();
  const descuentoMonto = calcularMontoDescuento();
  const total = calcularTotalVenta();
  const fecha = new Date();
  const esFiado = tipoPago === "fiado";

  ultimaVentaParaBoleta = { nombreCliente, telefono, items, subtotal, descuentoMonto, total, fecha, esFiado };

  let cuentaId = null;
  if (esFiado) {
    try {
      cuentaId = await registrarCargoEnCuenta({ cliente: nombreCliente, telefono, items, total });
    } catch (err) {
      console.error(err);
      mostrarToast("No se pudo cargar la venta a la cuenta. Se registró como venta normal.", "error");
    }
  }

  guardarVentaEnHistorial(ultimaVentaParaBoleta, cuentaId);
  descontarStock(items);

  const filas = items
    .map(
      (i) => `
      <tr>
        <td>${escaparHTML(i.nombre)}</td>
        <td class="num">${i.cantidad}</td>
        <td class="num">${formatoMoneda(i.precio)}</td>
        <td class="num">${formatoMoneda(i.precio * i.cantidad)}</td>
      </tr>`
    )
    .join("");

  const hayDescuento = descuentoMonto > 0;
  const filasResumen = hayDescuento
    ? `
      <div class="receipt-meta"><span>Subtotal</span><span>${formatoMoneda(subtotal)}</span></div>
      <div class="receipt-meta"><span>Descuento</span><span>−${formatoMoneda(descuentoMonto)}</span></div>`
    : "";

  const bannerFiado = esFiado
    ? `<div class="receipt-fiado-banner">Pendiente de pago · a cuenta de ${escaparHTML(nombreCliente)}</div>`
    : "";

  document.getElementById("receipt-render").innerHTML = `
    <div class="receipt" id="receipt-content">
      <div class="receipt-header">
        <h2>${escaparHTML(NEGOCIO.nombre)}</h2>
        <p>Comprobante de venta</p>
      </div>
      <hr class="receipt-divider" />
      <div class="receipt-meta"><span>Cliente</span><span>${escaparHTML(nombreCliente)}</span></div>
      <div class="receipt-meta"><span>Fecha</span><span>${formatoFechaHora(fecha)}</span></div>
      <table class="receipt-table">
        <thead>
          <tr><th>Producto</th><th style="text-align:right">Cant.</th><th style="text-align:right">P. Unit.</th><th style="text-align:right">Total</th></tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      ${filasResumen}
      <div class="receipt-total"><span>${esFiado ? "Total a cuenta" : "Total a pagar"}</span><span>${formatoMoneda(total)}</span></div>
      ${bannerFiado}
      <div class="receipt-footer">¡Gracias por su compra! · ${escaparHTML(NEGOCIO.nombre)}</div>
    </div>`;

  document.getElementById("receipt-preview").innerHTML = document.getElementById("receipt-render").innerHTML;

  const btnWhatsapp = document.getElementById("btn-whatsapp-boleta");
  btnWhatsapp.classList.toggle("hidden", !telefono);

  RosaAudio.beepConfirmacion();
  abrirModal("modal-boleta");
}

async function descargarBoletaPNG() {
  const nodo = document.getElementById("receipt-content") || document.querySelector("#receipt-render .receipt");
  if (!nodo || typeof html2canvas === "undefined") {
    mostrarToast("No se pudo generar la imagen", "error");
    return;
  }
  try {
    const canvas = await html2canvas(nodo, { backgroundColor: "#ffffff", scale: 2 });
    const link = document.createElement("a");
    const marcaTiempo = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `boleta-${marcaTiempo}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    mostrarToast("Boleta descargada");
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo descargar la boleta", "error");
  }
}

function enviarBoletaWhatsApp() {
  if (!ultimaVentaParaBoleta || !ultimaVentaParaBoleta.telefono) return;
  const { nombreCliente, telefono, items, total, esFiado } = ultimaVentaParaBoleta;

  let numero = telefono.replace(/\D/g, "");
  if (numero.length <= 9) numero = NEGOCIO.whatsappCodigoPais + numero;

  const detalle = items.map((i) => `• ${i.nombre} x${i.cantidad} — ${formatoMoneda(i.precio * i.cantidad)}`).join("%0A");

  const mensaje =
    `Hola ${nombreCliente}, aquí tu boleta de *${NEGOCIO.nombre}*:%0A%0A` +
    `${detalle}%0A%0A` +
    (esFiado
      ? `*Pendiente a cuenta: ${formatoMoneda(total)}*%0A%0A`
      : `*Total: ${formatoMoneda(total)}*%0A%0A`) +
    `¡Gracias por tu compra! 🌿%0A` +
    `(Adjunta la imagen de la boleta que acabas de descargar)`;

  window.open(`https://wa.me/${numero}?text=${mensaje}`, "_blank");
}

/* ---------------------- Historial de ventas ---------------------- */

async function guardarVentaEnHistorial(venta, cuentaId) {
  if (!RosaState.firebaseListo) return;
  try {
    await RosaState.db.collection("ventas").add({
      cliente: venta.nombreCliente,
      telefono: venta.telefono || null,
      estado: venta.esFiado ? "fiado" : "pagado",
      cuentaId: cuentaId || null,
      items: venta.items.map((i) => ({
        nombre: i.nombre,
        ean: i.ean || null,
        precio: i.precio,
        cantidad: i.cantidad,
        esLibre: !!i.esLibre
      })),
      subtotal: venta.subtotal,
      descuento: venta.descuentoMonto || 0,
      total: venta.total,
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    // No bloqueamos la venta ni la boleta si falla el registro del historial.
    console.error("No se pudo guardar la venta en el historial:", err);
  }
}
