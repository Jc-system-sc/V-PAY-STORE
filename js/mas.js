/* ==========================================================================
   MAS.JS
   Vista "Ajustes": resumen general, compartir el catálogo, interruptores,
   apariencia, información del sistema y ayuda. Las estadísticas de venta
   viven en Ventas → Resumen.
   ========================================================================== */

function initMas() {
  actualizarInfoSistema();
  actualizarResumenGeneral();
  initCompartirCatalogo();
  initInterruptores();
}

function actualizarInfoSistema() {
  document.getElementById("info-total-productos").textContent = RosaState.productos.length;
  document.getElementById("info-total-categorias").textContent = RosaState.categorias.length;
  document.getElementById("info-total-listas").textContent = RosaState.listas.filter((l) => l.estado !== "convertida").length;
  document.getElementById("info-total-cuentas").textContent = RosaState.cuentas.filter((c) => (c.saldo || 0) > 0).length;
  document.getElementById("info-estado-firebase").textContent = RosaState.firebaseListo ? "Conectado" : "Sin conexión";
}

/** Las 3 tarjetitas de "De un vistazo", cada una enlazada a su sección */
function actualizarResumenGeneral() {
  document.getElementById("resumen-mini-stock").textContent = productosStockBajo().length;
  document.getElementById("resumen-mini-cuentas").textContent = RosaState.cuentas.filter((c) => (c.saldo || 0) > 0).length;
  document.getElementById("resumen-mini-pedidos").textContent = RosaState.listas.filter((l) => l.estado !== "convertida").length;
}

/* ---------------------- Compartir el catálogo con clientes ---------------------- */

function initCompartirCatalogo() {
  const url = new URL("pedidos.html", window.location.href).href;
  document.getElementById("catalogo-link-box").textContent = url;

  document.getElementById("btn-copiar-catalogo").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      mostrarToast("Link copiado");
    } catch (err) {
      mostrarToast("No se pudo copiar. Cópialo manualmente.", "error");
    }
  });

  document.getElementById("btn-whatsapp-catalogo").addEventListener("click", () => {
    const mensaje = `Hola! Puedes armar tu pedido directo desde acá: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank");
  });
}

/* ---------------------- Interruptores (sonidos, vibración) ---------------------- */

function initInterruptores() {
  configurarInterruptor("interruptor-sonidos", "sonidos", true);
  configurarInterruptor("interruptor-vibracion", "vibracion", true);
}

function configurarInterruptor(idBoton, clave, porDefecto) {
  const boton = document.getElementById(idBoton);
  if (!boton) return;

  const activo = preferenciaActiva(clave, porDefecto);
  boton.classList.toggle("activo", activo);
  boton.setAttribute("aria-checked", String(activo));

  boton.addEventListener("click", () => {
    const nuevoValor = !boton.classList.contains("activo");
    boton.classList.toggle("activo", nuevoValor);
    boton.setAttribute("aria-checked", String(nuevoValor));
    guardarPreferencia(clave, nuevoValor);
    if (nuevoValor) vibrarSiToca(15);
  });
}
