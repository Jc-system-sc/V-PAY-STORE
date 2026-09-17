/* ==========================================================================
   VENTAS.JS
   - Escaneo de códigos EAN con la cámara (Html5Qrcode) + linterna
   - Búsqueda manual (texto o voz) para productos sin código legible
   - "Producto libre": algo sin código, se agrega solo a esta boleta
   - Carrito de la venta activa, con precio editable solo para esta venta
   ========================================================================== */

let linternaEncendida = false;

function initVentas() {
  document.getElementById("btn-escanear").addEventListener("click", toggleEscaner);
  document.getElementById("btn-linterna").addEventListener("click", toggleLinterna);

  document.getElementById("buscar-manual").addEventListener("input", (e) => {
    renderResultadosManual(e.target.value);
  });
  initBusquedaVoz("buscar-manual", "btn-mic-vender", (texto) => renderResultadosManual(texto));

  document.getElementById("btn-producto-libre").addEventListener("click", () => abrirModal("modal-producto-libre"));
  document.getElementById("form-producto-libre").addEventListener("submit", (e) => {
    e.preventDefault();
    const descripcion = document.getElementById("libre-descripcion").value.trim();
    const precio = parseFloat(document.getElementById("libre-precio").value);
    const cantidad = parseInt(document.getElementById("libre-cantidad").value, 10) || 1;

    if (!descripcion || isNaN(precio) || precio < 0 || cantidad < 1) {
      mostrarToast("Completa la descripción, precio y cantidad", "error");
      return;
    }

    RosaState.venta.push({
      id: `libre-${Date.now()}`,
      ean: null,
      nombre: descripcion,
      precio,
      precioOriginal: precio,
      cantidad,
      esLibre: true
    });
    renderVenta();
    RosaAudio.popAgregado();
    document.getElementById("form-producto-libre").reset();
    cerrarModal("modal-producto-libre");
  });

  document.getElementById("btn-confirmar-venta").addEventListener("click", abrirModalCliente);
  document.getElementById("btn-vaciar-venta").addEventListener("click", () => {
    if (RosaState.venta.length === 0) return;
    if (confirm("¿Vaciar la lista de venta actual?")) {
      RosaState.venta = [];
      reiniciarDescuento();
      renderVenta();
    }
  });

  initDescuento();
  renderVenta();
}

/* ---------------------- Escáner de cámara principal ---------------------- */

function toggleEscaner() {
  if (RosaState.scannerActivo) {
    detenerEscaner();
  } else {
    iniciarEscaner();
  }
}

function iniciarEscaner() {
  const contenedor = document.getElementById("qr-reader");
  const placeholder = document.getElementById("scanner-placeholder");
  const overlay = document.getElementById("scanner-overlay");
  const btn = document.getElementById("btn-escanear");

  if (typeof Html5Qrcode === "undefined") {
    mostrarToast("No se pudo cargar la librería de escaneo", "error");
    return;
  }

  placeholder.classList.add("hidden");
  overlay.classList.remove("hidden");
  contenedor.classList.remove("hidden");
  btn.innerHTML = iconoDetener() + "Detener escáner";

  RosaState.html5QrCode = new Html5Qrcode("qr-reader");
  const config = { fps: 12, qrbox: { width: 230, height: 140 }, aspectRatio: 1.33 };

  RosaState.html5QrCode
    .start({ facingMode: "environment" }, config, onEscaneoExitoso, () => {})
    .then(() => {
      RosaState.scannerActivo = true;
      revisarSoporteLinterna();
    })
    .catch((err) => {
      console.error(err);
      mostrarToast("No se pudo acceder a la cámara. Revisa los permisos.", "error");
      placeholder.classList.remove("hidden");
      overlay.classList.add("hidden");
      btn.innerHTML = iconoCamara() + "Iniciar escáner";
    });
}

function detenerEscaner() {
  const placeholder = document.getElementById("scanner-placeholder");
  const overlay = document.getElementById("scanner-overlay");
  const btn = document.getElementById("btn-escanear");
  const btnLinterna = document.getElementById("btn-linterna");

  if (RosaState.html5QrCode && RosaState.scannerActivo) {
    RosaState.html5QrCode
      .stop()
      .then(() => RosaState.html5QrCode.clear())
      .catch(() => {});
  }
  RosaState.scannerActivo = false;
  placeholder.classList.remove("hidden");
  overlay.classList.add("hidden");
  btn.innerHTML = iconoCamara() + "Iniciar escáner";

  linternaEncendida = false;
  btnLinterna.classList.add("hidden");
  btnLinterna.classList.remove("linterna-on");
  btnLinterna.dataset.on = "0";
}

let ultimoEscaneo = { codigo: "", hora: 0 };

function onEscaneoExitoso(decodedText) {
  const ahora = Date.now();
  if (decodedText === ultimoEscaneo.codigo && ahora - ultimoEscaneo.hora < 1200) return;
  ultimoEscaneo = { codigo: decodedText, hora: ahora };

  const producto = buscarProductoPorEAN(decodedText);
  const etiqueta = document.getElementById("scan-last");

  if (producto) {
    RosaAudio.beepEscaneo();
    vibrarSiToca(25);
    agregarProductoAVenta(producto);
    etiqueta.textContent = `✓ ${producto.nombre}`;
  } else {
    RosaAudio.beepNoEncontrado();
    etiqueta.textContent = `Código ${decodedText} no está en el catálogo`;
    mostrarToast("Producto no encontrado. Regístralo en Catálogo.", "error");
  }
}

/* ---------------------- Linterna (torch) ---------------------- */

function revisarSoporteLinterna() {
  const btnLinterna = document.getElementById("btn-linterna");
  try {
    const capacidades = RosaState.html5QrCode.getRunningTrackCameraCapabilities();
    const torch = capacidades && capacidades.torchFeature && capacidades.torchFeature();
    if (torch && torch.isSupported && torch.isSupported()) {
      btnLinterna.classList.remove("hidden");
    } else {
      btnLinterna.classList.add("hidden");
    }
  } catch (e) {
    btnLinterna.classList.add("hidden");
  }
}

function toggleLinterna() {
  if (!RosaState.scannerActivo || !RosaState.html5QrCode) return;
  const btnLinterna = document.getElementById("btn-linterna");
  try {
    const capacidades = RosaState.html5QrCode.getRunningTrackCameraCapabilities();
    const torch = capacidades.torchFeature();
    const nuevoEstado = !linternaEncendida;
    torch
      .apply(nuevoEstado)
      .then(() => {
        linternaEncendida = nuevoEstado;
        btnLinterna.classList.toggle("linterna-on", linternaEncendida);
        btnLinterna.dataset.on = linternaEncendida ? "1" : "0";
      })
      .catch(() => mostrarToast("Este celular no permite controlar el flash", "error"));
  } catch (e) {
    mostrarToast("Este celular no permite controlar el flash", "error");
  }
}

/* ---------------------- Búsqueda manual / por voz ---------------------- */

function renderResultadosManual(query) {
  const cont = document.getElementById("resultados-manual");
  if (!query.trim()) {
    cont.innerHTML = "";
    cont.classList.add("hidden");
    return;
  }
  const resultados = buscarProductos(query).slice(0, 6);
  cont.classList.remove("hidden");

  if (resultados.length === 0) {
    cont.innerHTML = `<div class="list-row"><div class="list-meta">Sin resultados</div></div>`;
    return;
  }

  cont.innerHTML = resultados
    .map(
      (p) => `
      <div class="list-row" data-id="${p.id}" style="cursor:pointer">
        <div class="list-info">
          <div class="list-name">${escaparHTML(p.nombre)}</div>
          <div class="list-meta"><span class="pill pill-category">${escaparHTML(p.categoria || "")}</span> EAN ${escaparHTML(p.ean)}</div>
        </div>
        <div class="pill pill-green">${formatoMoneda(p.precio)}</div>
      </div>`
    )
    .join("");

  cont.querySelectorAll(".list-row").forEach((row) => {
    row.addEventListener("click", () => {
      const producto = RosaState.productos.find((p) => p.id === row.dataset.id);
      if (producto) {
        agregarProductoAVenta(producto);
        document.getElementById("buscar-manual").value = "";
        cont.innerHTML = "";
        cont.classList.add("hidden");
      }
    });
  });
}

/* ---------------------- Carrito de la venta activa ---------------------- */

function agregarProductoAVenta(producto) {
  const existente = RosaState.venta.find((i) => i.id === producto.id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    RosaState.venta.push({
      id: producto.id,
      ean: producto.ean,
      nombre: producto.nombre,
      precio: producto.precio,
      precioOriginal: producto.precio,
      cantidad: 1
    });
  }
  renderVenta();
}

function cambiarCantidadVenta(id, delta) {
  const item = RosaState.venta.find((i) => i.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    RosaState.venta = RosaState.venta.filter((i) => i.id !== id);
  }
  renderVenta();
}

function eliminarDeVenta(id) {
  RosaState.venta = RosaState.venta.filter((i) => i.id !== id);
  renderVenta();
}

function calcularSubtotalVenta() {
  return RosaState.venta.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
}

function calcularMontoDescuento() {
  if (!descuentoActivo) return 0;
  const subtotal = calcularSubtotalVenta();
  if (descuentoActivo.tipo === "porcentaje") {
    return subtotal * (descuentoActivo.valor / 100);
  }
  return Math.min(descuentoActivo.valor, subtotal); // el monto fijo nunca deja el total en negativo
}

function calcularTotalVenta() {
  return Math.max(0, calcularSubtotalVenta() - calcularMontoDescuento());
}

function renderVenta() {
  const cont = document.getElementById("lista-venta");
  const totalEl = document.getElementById("total-venta");
  const subtotalRow = document.getElementById("subtotal-row");
  const subtotalEl = document.getElementById("subtotal-venta");
  const btnConfirmar = document.getElementById("btn-confirmar-venta");
  const btnVaciar = document.getElementById("btn-vaciar-venta");
  const contador = document.getElementById("contador-venta");

  if (RosaState.venta.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
        <div>Escanea, busca (o habla) para empezar la venta.</div>
      </div>`;
    btnConfirmar.disabled = true;
    btnVaciar.disabled = true;
  } else {
    cont.innerHTML = RosaState.venta.map(construirFilaCarrito).join("");

    cont.querySelectorAll("[data-accion]").forEach((btn) => {
      const id = btn.dataset.id;
      btn.addEventListener("click", () => {
        const accion = btn.dataset.accion;
        if (accion === "mas") cambiarCantidadVenta(id, 1);
        if (accion === "menos") cambiarCantidadVenta(id, -1);
        if (accion === "borrar") eliminarDeVenta(id);
        if (accion === "editar-precio") {
          const item = RosaState.venta.find((i) => i.id === id);
          if (!item) return;
          activarEdicionPrecioInline(btn.closest(".sale-item"), item.precio, (nuevoPrecio) => {
            item.precio = nuevoPrecio;
            renderVenta();
          });
        }
      });
    });

    btnConfirmar.disabled = false;
    btnVaciar.disabled = false;
  }

  const hayDescuento = !!descuentoActivo && calcularMontoDescuento() > 0;
  subtotalRow.classList.toggle("hidden", !hayDescuento);
  if (hayDescuento) subtotalEl.textContent = formatoMoneda(calcularSubtotalVenta());

  totalEl.textContent = formatoMoneda(calcularTotalVenta());
  const totalItems = RosaState.venta.reduce((acc, i) => acc + i.cantidad, 0);
  contador.textContent = totalItems > 0 ? `${totalItems} producto${totalItems === 1 ? "" : "s"}` : "";

  renderFilaDescuento();
}

/* ---------------------- Descuento en la venta activa ---------------------- */

let descuentoActivo = null; // null, o { tipo: 'porcentaje'|'monto', valor: number }

function initDescuento() {
  document.querySelectorAll("#modal-descuento .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#modal-descuento .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const esPorcentaje = chip.dataset.tipo === "porcentaje";
      document.getElementById("label-valor-descuento").textContent = esPorcentaje
        ? "Porcentaje de descuento"
        : "Monto del descuento (S/)";
      document.getElementById("input-valor-descuento").placeholder = esPorcentaje ? "Ej. 10" : "Ej. 5.00";
    });
  });

  document.getElementById("aplicar-descuento").addEventListener("click", () => {
    const tipo = document.querySelector("#modal-descuento .chip.active").dataset.tipo;
    let valor = parseFloat(document.getElementById("input-valor-descuento").value);

    if (isNaN(valor) || valor <= 0) {
      mostrarToast("Ingresa un valor de descuento válido", "error");
      return;
    }
    if (tipo === "porcentaje" && valor > 100) valor = 100;

    descuentoActivo = { tipo, valor };
    cerrarModal("modal-descuento");
    renderVenta();
    mostrarToast("Descuento aplicado");
  });

  document.getElementById("quitar-descuento").addEventListener("click", () => {
    reiniciarDescuento();
    cerrarModal("modal-descuento");
    renderVenta();
  });
}

function reiniciarDescuento() {
  descuentoActivo = null;
}

function abrirModalDescuento() {
  const chipPorcentaje = document.getElementById("chip-tipo-porcentaje");
  const chipMonto = document.getElementById("chip-tipo-monto");
  const tipo = descuentoActivo ? descuentoActivo.tipo : "porcentaje";

  chipPorcentaje.classList.toggle("active", tipo === "porcentaje");
  chipMonto.classList.toggle("active", tipo === "monto");
  document.getElementById("label-valor-descuento").textContent =
    tipo === "porcentaje" ? "Porcentaje de descuento" : "Monto del descuento (S/)";
  document.getElementById("input-valor-descuento").value = descuentoActivo ? descuentoActivo.valor : "";

  abrirModal("modal-descuento");
}

function renderFilaDescuento() {
  const cont = document.getElementById("descuento-row");
  if (RosaState.venta.length === 0) {
    cont.innerHTML = "";
    return;
  }
  if (descuentoActivo) {
    const monto = calcularMontoDescuento();
    const etiqueta =
      descuentoActivo.tipo === "porcentaje" ? `${descuentoActivo.valor}%` : formatoMoneda(descuentoActivo.valor);
    cont.innerHTML = `
      <div class="descuento-activo">
        <span>Descuento: ${etiqueta} (−${formatoMoneda(monto)})</span>
        <button type="button" id="btn-quitar-descuento-rapido">Quitar</button>
      </div>`;
    document.getElementById("btn-quitar-descuento-rapido").addEventListener("click", () => {
      reiniciarDescuento();
      renderVenta();
    });
  } else {
    cont.innerHTML = `<button type="button" class="descuento-link" id="btn-descuento">+ Agregar descuento</button>`;
    document.getElementById("btn-descuento").addEventListener("click", abrirModalDescuento);
  }
}

function iconoCamara() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>`;
}
function iconoDetener() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
}
