/* ==========================================================================
   MAS.JS
   Vista "Ajustes" (accesible desde Inicio): apariencia, información del
   sistema y ayuda. Las estadísticas de venta viven ahora en Ventas → Resumen.
   ========================================================================== */

function initMas() {
  actualizarInfoSistema();
}

function actualizarInfoSistema() {
  document.getElementById("info-total-productos").textContent = RosaState.productos.length;
  document.getElementById("info-total-categorias").textContent = RosaState.categorias.length;
  document.getElementById("info-total-listas").textContent = RosaState.listas.filter((l) => l.estado !== "convertida").length;
  document.getElementById("info-total-cuentas").textContent = RosaState.cuentas.filter((c) => (c.saldo || 0) > 0).length;
  document.getElementById("info-estado-firebase").textContent = RosaState.firebaseListo ? "Conectado" : "Sin conexión";
}
