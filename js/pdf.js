/* ==========================================================================
   PDF.JS
   Genera los reportes descargables en PDF:
   - Estado de cuenta de un cliente (fiado): historial de compras y abonos.
   - Reporte del catálogo de inventario (valorizado).
   - Reporte de movimientos de inventario (entradas/salidas) por rango.
   Usa jsPDF + el plugin autoTable, cargados como librerías externas.
   ========================================================================== */

function libreriaPDFDisponible() {
  const ok = typeof window.jspdf !== "undefined" && typeof window.jspdf.jsPDF === "function";
  if (!ok) mostrarToast("No se pudo cargar el generador de PDF. Revisa tu conexión.", "error");
  return ok;
}

function nuevoDocumentoPDF(tituloDocumento) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const anchoPagina = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(47, 40, 34);
  doc.text(NEGOCIO.nombre, 40, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(125, 113, 102);
  doc.text(tituloDocumento, 40, 62);

  const fechaEmision = `Emitido: ${formatoFechaHora(new Date())}`;
  doc.text(fechaEmision, anchoPagina - 40 - doc.getTextWidth(fechaEmision), 46);

  doc.setDrawColor(233, 224, 216);
  doc.line(40, 74, anchoPagina - 40, 74);

  return { doc, anchoPagina, cursorInicial: 92 };
}

function guardarPDF(doc, nombreArchivo) {
  doc.save(nombreArchivo);
  mostrarToast("PDF descargado");
}

/* ---------------------- Estado de cuenta (fiado) ---------------------- */

function descargarPDFCuenta(cuenta) {
  if (!libreriaPDFDisponible()) return;

  const { doc, anchoPagina, cursorInicial } = nuevoDocumentoPDF("Estado de cuenta");
  let y = cursorInicial;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(47, 40, 34);
  doc.text(cuenta.cliente, 40, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(125, 113, 102);
  if (cuenta.telefono) {
    doc.text(`Celular: ${cuenta.telefono}`, 40, y);
    y += 14;
  }

  const movimientos = [...(cuenta.movimientos || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let saldoCorrido = 0;
  const filas = movimientos.map((m) => {
    if (m.tipo === "cargo") {
      saldoCorrido += m.monto;
      const detalle = (m.detalle || []).map((d) => `${d.nombre} x${d.cantidad}`).join(", ") || "Compra";
      return [formatoFechaHora(m.fecha), "Compra a cuenta", detalle, formatoMoneda(m.monto), "", formatoMoneda(saldoCorrido)];
    }
    saldoCorrido -= m.monto;
    return [formatoFechaHora(m.fecha), "Abono / pago", "—", "", formatoMoneda(m.monto), formatoMoneda(saldoCorrido)];
  });

  doc.autoTable({
    startY: y + 10,
    head: [["Fecha", "Tipo", "Detalle", "Cargo", "Abono", "Saldo"]],
    body: filas.length ? filas : [["—", "Sin movimientos todavía", "", "", "", formatoMoneda(0)]],
    styles: { font: "helvetica", fontSize: 9, textColor: [47, 40, 34], cellPadding: 6 },
    headStyles: { fillColor: [185, 160, 143], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 243, 239] },
    margin: { left: 40, right: 40 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } }
  });

  const yFinal = doc.lastAutoTable.finalY + 26;
  doc.setDrawColor(47, 40, 34);
  doc.line(40, yFinal - 12, anchoPagina - 40, yFinal - 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Saldo pendiente", 40, yFinal);
  doc.setFontSize(16);
  const textoSaldo = formatoMoneda(cuenta.saldo || 0);
  doc.text(textoSaldo, anchoPagina - 40 - doc.getTextWidth(textoSaldo), yFinal);

  const nombreArchivo = `cuenta-${cuenta.cliente.replace(/\s+/g, "_").toLowerCase()}.pdf`;
  guardarPDF(doc, nombreArchivo);
}

/* ---------------------- Estado de cuenta de cerveza ---------------------- */

function descargarPDFCuentaCerveza(cuenta) {
  if (!libreriaPDFDisponible()) return;

  const { doc, anchoPagina, cursorInicial } = nuevoDocumentoPDF("Cuenta de cerveza");
  let y = cursorInicial;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(36, 26, 18);
  doc.text(cuenta.cliente, 40, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(125, 113, 102);
  if (cuenta.telefono) {
    doc.text(`Celular: ${cuenta.telefono}`, 40, y);
    y += 14;
  }

  const movimientos = [...(cuenta.movimientos || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let saldoDineroCorrido = 0;
  let pendientesCorrido = 0;
  const filas = movimientos.map((m) => {
    if (m.tipo === "pedido") {
      saldoDineroCorrido += m.monto;
      pendientesCorrido += m.cantidad;
      return [
        formatoFechaHora(m.fecha),
        "Pedido",
        `${m.cantidad} u. x ${formatoMoneda(m.precioUnitario)}`,
        formatoMoneda(m.monto),
        "",
        String(pendientesCorrido),
        formatoMoneda(saldoDineroCorrido)
      ];
    }
    if (m.tipo === "entrega") {
      pendientesCorrido -= m.cantidad;
      return [formatoFechaHora(m.fecha), "Entrega", `${m.cantidad} unidad(es)`, "", "", String(pendientesCorrido), formatoMoneda(saldoDineroCorrido)];
    }
    saldoDineroCorrido -= m.monto;
    return [formatoFechaHora(m.fecha), "Pago", "—", "", formatoMoneda(m.monto), String(pendientesCorrido), formatoMoneda(saldoDineroCorrido)];
  });

  doc.autoTable({
    startY: y + 10,
    head: [["Fecha", "Tipo", "Detalle", "Pedido", "Pago", "Cervezas pend.", "Saldo S/"]],
    body: filas.length ? filas : [["—", "Sin movimientos todavía", "", "", "", "0", formatoMoneda(0)]],
    styles: { font: "helvetica", fontSize: 8.5, textColor: [36, 26, 18], cellPadding: 5 },
    headStyles: { fillColor: [138, 106, 47], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 236, 223] },
    margin: { left: 40, right: 40 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } }
  });

  const yFinal = doc.lastAutoTable.finalY + 26;
  doc.setDrawColor(36, 26, 18);
  doc.line(40, yFinal - 12, anchoPagina - 40, yFinal - 12);

  const pendientesFinal = Math.max(0, (cuenta.cervezasPedidas || 0) - (cuenta.cervezasEntregadas || 0));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Cervezas pendientes: ${pendientesFinal}`, 40, yFinal);
  doc.setFontSize(14);
  const textoSaldo = `Saldo: ${formatoMoneda(cuenta.saldoDinero || 0)}`;
  doc.text(textoSaldo, anchoPagina - 40 - doc.getTextWidth(textoSaldo), yFinal);

  const nombreArchivo = `cerveza-${cuenta.cliente.replace(/\s+/g, "_").toLowerCase()}.pdf`;
  guardarPDF(doc, nombreArchivo);
}

/* ---------------------- Reporte de catálogo (inventario valorizado) ---------------------- */

function descargarPDFCatalogo() {
  if (!libreriaPDFDisponible()) return;

  const { doc, cursorInicial } = nuevoDocumentoPDF("Reporte de inventario");
  const productosOrdenados = [...RosaState.productos].sort((a, b) => {
    const catCompare = (a.categoria || "").localeCompare(b.categoria || "");
    return catCompare !== 0 ? catCompare : a.nombre.localeCompare(b.nombre);
  });

  let valorTotal = 0;
  const filas = productosOrdenados.map((p) => {
    const valor = p.stock !== null && p.stock !== undefined ? p.precio * p.stock : 0;
    valorTotal += valor;
    const stockTexto = p.stock === null || p.stock === undefined ? "No controlado" : String(p.stock);
    return [p.categoria || "Sin categoría", p.nombre, p.ean, formatoMoneda(p.precio), stockTexto, formatoMoneda(valor)];
  });

  doc.autoTable({
    startY: cursorInicial,
    head: [["Categoría", "Producto", "EAN", "Precio", "Stock", "Valorizado"]],
    body: filas.length ? filas : [["—", "Todavía no hay productos registrados", "", "", "", ""]],
    styles: { font: "helvetica", fontSize: 8.5, textColor: [47, 40, 34], cellPadding: 5 },
    headStyles: { fillColor: [185, 160, 143], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 243, 239] },
    margin: { left: 40, right: 40 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } }
  });

  const yFinal = doc.lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Productos en catálogo: ${RosaState.productos.length}`, 40, yFinal);
  doc.text(`Valor total del inventario: ${formatoMoneda(valorTotal)}`, 40, yFinal + 16);

  guardarPDF(doc, "reporte-inventario.pdf");
}

/* ---------------------- Reporte de movimientos (entradas/salidas) ---------------------- */

function descargarPDFMovimientos(movimientos, etiquetaRango) {
  if (!libreriaPDFDisponible()) return;

  const { doc, cursorInicial } = nuevoDocumentoPDF(`Movimientos de inventario · ${etiquetaRango}`);

  const filas = movimientos.map((m) => [
    formatoFechaHora(m.fecha),
    m.tipo === "entrada" ? "Entrada" : "Salida",
    m.productoNombre,
    (m.tipo === "entrada" ? "+" : "-") + m.cantidad,
    m.motivo === "compra" ? "Compra" : m.motivo === "venta" ? "Venta" : "Ajuste"
  ]);

  doc.autoTable({
    startY: cursorInicial,
    head: [["Fecha", "Tipo", "Producto", "Cantidad", "Motivo"]],
    body: filas.length ? filas : [["—", "Sin movimientos en este rango", "", "", ""]],
    styles: { font: "helvetica", fontSize: 9, textColor: [47, 40, 34], cellPadding: 6 },
    headStyles: { fillColor: [185, 160, 143], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 243, 239] },
    margin: { left: 40, right: 40 },
    columnStyles: { 3: { halign: "right" } }
  });

  guardarPDF(doc, `movimientos-inventario-${etiquetaRango.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
