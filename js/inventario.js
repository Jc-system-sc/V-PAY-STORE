/* ==========================================================================
   INVENTARIO.JS
   - Categorías con ícono automático, buscador y grilla de botones grandes.
   - Detalle de categoría: buscador propio + orden (A-Z, precio, stock).
   - Movimientos de inventario: entradas (compras) y salidas (ventas o
     ajustes), con filtro por rango de fechas y reporte descargable.
   - Alertas de bajo stock, para saber qué reponer.
   ========================================================================== */

let ordenCategoriaActivo = "nombre-asc";
let filtroRangoMovimientos = "hoy"; // hoy | semana | mes | todo
let filtroTipoMovimientos = "todos"; // todos | entrada | salida
let movInventarioTipo = "entrada"; // entrada | salida
let movInventarioProductoSel = null;
let movimientosFiltradosActuales = [];
let etiquetaRangoActual = "Hoy";
let categoriaInventarioActiva = null;

function abrirCategoriaInventario(nombreCategoria) {
  categoriaInventarioActiva = nombreCategoria;
  cambiarPantalla("categoria-detalle");
}

/**
 * Elimina la categoría que se está viendo. Si tiene productos, primero
 * los mueve a "Sin categoría" (así no queda ningún producto huérfano).
 */
async function eliminarCategoriaActual() {
  const nombre = categoriaInventarioActiva;
  if (!nombre) return;
  if (!RosaState.firebaseListo) {
    mostrarToast("Firebase no está conectado todavía", "error");
    return;
  }

  const afectados = RosaState.productos.filter((p) => p.categoria === nombre);
  const mensaje = afectados.length
    ? `Esta categoría tiene ${afectados.length} producto${afectados.length === 1 ? "" : "s"}. Se moverán a "Sin categoría". ¿Eliminar "${nombre}" de todas formas?`
    : `¿Eliminar la categoría "${nombre}"? Esta acción no se puede deshacer.`;
  if (!confirm(mensaje)) return;

  try {
    if (afectados.length) {
      await asegurarCategoria("Sin categoría");
      const lote = RosaState.db.batch();
      afectados.forEach((p) => {
        lote.update(RosaState.db.collection("productos").doc(p.id), { categoria: "Sin categoría" });
      });
      await lote.commit();
    }

    const coincidencias = await RosaState.db.collection("categorias").where("nombre", "==", nombre).get();
    const loteBorrado = RosaState.db.batch();
    coincidencias.forEach((doc) => loteBorrado.delete(doc.ref));
    await loteBorrado.commit();

    mostrarToast("Categoría eliminada");
    cambiarPantalla("categorias");
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo eliminar la categoría", "error");
  }
}

function initInventario() {
  document.getElementById("buscar-inventario").addEventListener("input", () => renderGridCategorias());

  document.getElementById("btn-reporte-inventario").addEventListener("click", descargarPDFCatalogo);

  document.getElementById("subhead-back-categoria").addEventListener("click", () => cambiarPantalla("categorias"));
  document.getElementById("btn-eliminar-categoria").addEventListener("click", eliminarCategoriaActual);
  document.getElementById("buscar-categoria-producto").addEventListener("input", aplicarFiltroProductosCategoria);
  document.getElementById("orden-categoria-producto").addEventListener("change", (e) => {
    ordenCategoriaActivo = e.target.value;
    aplicarFiltroProductosCategoria();
  });

  document.querySelectorAll("#chips-rango-movimientos .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#chips-rango-movimientos .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      filtroRangoMovimientos = chip.dataset.rango;
      aplicarFiltroMovimientos();
    });
  });
  document.querySelectorAll("#chips-tipo-movimientos .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#chips-tipo-movimientos .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      filtroTipoMovimientos = chip.dataset.tipoMov;
      aplicarFiltroMovimientos();
    });
  });
  document.getElementById("btn-reporte-movimientos").addEventListener("click", () => {
    descargarPDFMovimientos(movimientosFiltradosActuales, etiquetaRangoActual);
  });
  document.getElementById("btn-registrar-entrada").addEventListener("click", () => abrirModalMovimiento("entrada"));
  document.getElementById("btn-registrar-salida").addEventListener("click", () => abrirModalMovimiento("salida"));

  initModalMovimiento();
}

/* ---------------------- Categorías: grilla + buscador global ---------------------- */

function renderGridCategorias() {
  const query = document.getElementById("buscar-inventario").value;
  const contGrid = document.getElementById("grid-categorias");
  const contBusqueda = document.getElementById("inventario-resultados-busqueda");

  if (query.trim()) {
    contGrid.classList.add("hidden");
    contBusqueda.classList.remove("hidden");
    const resultados = buscarProductos(query);
    contBusqueda.innerHTML = resultados.length
      ? resultados.map(filaProductoInventario).join("")
      : mensajeVacioInventario("No se encontraron productos con ese nombre, EAN o categoría.");
    enlazarFilasProductoInventario(contBusqueda);
    return;
  }

  contBusqueda.classList.add("hidden");
  contGrid.classList.remove("hidden");

  if (RosaState.categorias.length === 0) {
    contGrid.innerHTML = mensajeVacioInventario("Todavía no hay categorías. Registra tu primer producto en \"Registrar\".");
    return;
  }

  contGrid.innerHTML = RosaState.categorias
    .map((nombre) => {
      const productosCat = RosaState.productos.filter((p) => p.categoria === nombre);
      const bajoStock = productosCat.filter((p) => p.stock !== null && p.stock !== undefined && p.stock <= UMBRAL_STOCK_BAJO).length;
      return `
      <button type="button" class="cat-tile" data-categoria="${escaparHTML(nombre)}">
        <div class="cat-tile-icon">${svgIconoCategoria(nombre, 22)}</div>
        <div class="cat-tile-name">${escaparHTML(nombre)}</div>
        <div class="cat-tile-count">${productosCat.length} producto${productosCat.length === 1 ? "" : "s"}${bajoStock ? ` · ${bajoStock} bajo` : ""}</div>
      </button>`;
    })
    .join("");

  contGrid.querySelectorAll(".cat-tile").forEach((btn) => {
    btn.addEventListener("click", () => abrirCategoriaInventario(btn.dataset.categoria));
  });
}

/* ---------------------- Detalle de categoría: buscador + orden ---------------------- */

function renderProductosDeCategoria() {
  const nombreCat = categoriaInventarioActiva || "";
  document.getElementById("categoria-detalle-nombre").textContent = nombreCat;
  document.getElementById("categoria-detalle-icono").innerHTML = svgIconoCategoria(nombreCat, 20);
  document.getElementById("buscar-categoria-producto").value = "";
  document.getElementById("orden-categoria-producto").value = ordenCategoriaActivo;
  aplicarFiltroProductosCategoria();
}

function aplicarFiltroProductosCategoria() {
  const query = document.getElementById("buscar-categoria-producto").value.trim().toLowerCase();
  let productos = RosaState.productos.filter((p) => p.categoria === categoriaInventarioActiva);

  if (query) {
    productos = productos.filter((p) => p.nombre.toLowerCase().includes(query) || p.ean.includes(query));
  }
  productos = ordenarProductosInventario(productos, ordenCategoriaActivo);

  const cont = document.getElementById("categoria-detalle-lista");
  const contador = document.getElementById("categoria-detalle-contador");
  contador.textContent = `${productos.length} producto${productos.length === 1 ? "" : "s"}`;

  if (productos.length === 0) {
    cont.innerHTML = mensajeVacioInventario(query ? "No se encontraron productos." : "Todavía no hay productos en esta categoría.");
    return;
  }
  cont.innerHTML = productos.map(filaProductoInventario).join("");
  enlazarFilasProductoInventario(cont);
}

function ordenarProductosInventario(lista, orden) {
  const copia = [...lista];
  switch (orden) {
    case "nombre-desc":
      return copia.sort((a, b) => b.nombre.localeCompare(a.nombre));
    case "precio-asc":
      return copia.sort((a, b) => a.precio - b.precio);
    case "precio-desc":
      return copia.sort((a, b) => b.precio - a.precio);
    case "stock-asc":
      return copia.sort((a, b) => (a.stock ?? Infinity) - (b.stock ?? Infinity));
    case "nombre-asc":
    default:
      return copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
}

function filaProductoInventario(p) {
  return `
    <div class="list-row">
      <div class="list-icon">${svgIconoCategoria(p.categoria, 18)}</div>
      <div class="list-info">
        <div class="list-name">${escaparHTML(p.nombre)}</div>
        <div class="list-meta">
          <span class="pill pill-category">${escaparHTML(p.categoria || "Sin categoría")}</span>
          ${pillDeStock(p.stock)}
          <span>EAN ${escaparHTML(p.ean)}</span>
        </div>
      </div>
      <div class="list-actions">
        <div class="pill pill-green">${formatoMoneda(p.precio)}</div>
        <button class="list-icon-btn" data-editar="${p.id}" title="Editar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
      </div>
    </div>`;
}

function enlazarFilasProductoInventario(cont) {
  cont.querySelectorAll("[data-editar]").forEach((btn) => {
    btn.addEventListener("click", () => abrirEdicionProducto(btn.dataset.editar));
  });
}

function mensajeVacioInventario(mensaje) {
  return `
    <div class="empty-state">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 7 12 3 4 7v10l8 4 8-4V7Z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>
      <div>${mensaje}</div>
    </div>`;
}

/* ---------------------- Movimientos: entradas y salidas ---------------------- */

function rangoFechaDesde(rango) {
  const ahora = new Date();
  if (rango === "hoy") {
    const d = new Date(ahora);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (rango === "semana") {
    const d = new Date(ahora);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (rango === "mes") {
    const d = new Date(ahora);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

function renderMovimientosInventario() {
  aplicarFiltroMovimientos();
}

function aplicarFiltroMovimientos() {
  const desde = rangoFechaDesde(filtroRangoMovimientos);
  let movs = [...RosaState.movimientosInventario];
  if (desde) movs = movs.filter((m) => aFecha(m.fecha) >= desde);
  if (filtroTipoMovimientos !== "todos") movs = movs.filter((m) => m.tipo === filtroTipoMovimientos);
  movs.sort((a, b) => aFecha(b.fecha) - aFecha(a.fecha));

  movimientosFiltradosActuales = movs;
  etiquetaRangoActual =
    { hoy: "Hoy", semana: "7 días", mes: "30 días", todo: "Todo" }[filtroRangoMovimientos] || "Todo";

  const cont = document.getElementById("lista-movimientos");
  if (movs.length === 0) {
    cont.innerHTML = mensajeVacioInventario("No hay movimientos registrados en este rango.");
    return;
  }
  cont.innerHTML = movs.map(filaMovimiento).join("");
}

function filaMovimiento(m) {
  const esEntrada = m.tipo === "entrada";
  const etiquetaMotivo = m.motivo === "compra" ? "Compra" : m.motivo === "venta" ? "Venta" : "Ajuste";
  return `
    <div class="list-row">
      <div class="list-icon ${esEntrada ? "mov-in" : "mov-out"}">
        ${esEntrada
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>'}
      </div>
      <div class="list-info">
        <div class="list-name">${escaparHTML(m.productoNombre)}</div>
        <div class="list-meta">${formatoFechaHora(m.fecha)} · ${etiquetaMotivo}</div>
      </div>
      <div class="sale-item-total" style="color:${esEntrada ? "var(--price)" : "var(--coral)"}">${esEntrada ? "+" : "−"}${m.cantidad}</div>
    </div>`;
}

/* ---------------------- Modal: registrar entrada/salida de stock ---------------------- */

function initModalMovimiento() {
  document.querySelectorAll("#modal-mov-inventario .chip[data-tipo-mov-modal]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#modal-mov-inventario .chip[data-tipo-mov-modal]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      movInventarioTipo = chip.dataset.tipoMovModal;
      actualizarTextosModalMovimiento();
    });
  });

  document.getElementById("mov-buscar-producto").addEventListener("input", (e) => {
    renderResultadosMovProducto(e.target.value);
  });

  document.getElementById("cerrar-mov-inventario").addEventListener("click", () => cerrarModal("modal-mov-inventario"));

  document.getElementById("form-mov-inventario").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!movInventarioProductoSel) {
      mostrarToast("Busca y elige un producto primero", "error");
      return;
    }
    const cantidad = parseInt(document.getElementById("mov-cantidad").value, 10);
    if (!cantidad || cantidad <= 0) {
      mostrarToast("Ingresa una cantidad válida", "error");
      return;
    }
    if (!RosaState.firebaseListo) {
      mostrarToast("Firebase no está conectado todavía", "error");
      return;
    }

    const producto = movInventarioProductoSel;
    const stockActual = producto.stock === null || producto.stock === undefined ? 0 : producto.stock;
    const nuevoStock = movInventarioTipo === "entrada" ? stockActual + cantidad : Math.max(0, stockActual - cantidad);
    const costoInput = document.getElementById("mov-costo").value;
    const costoUnitario = costoInput.trim() === "" ? null : parseFloat(costoInput);

    try {
      await RosaState.db.collection("productos").doc(producto.id).update({ stock: nuevoStock });
      await registrarMovimientoInventario({
        tipo: movInventarioTipo,
        productoId: producto.id,
        productoNombre: producto.nombre,
        cantidad,
        motivo: movInventarioTipo === "entrada" ? "compra" : "ajuste",
        costoUnitario
      });
      mostrarToast(movInventarioTipo === "entrada" ? "Entrada registrada" : "Salida registrada");
      cerrarModal("modal-mov-inventario");
    } catch (err) {
      console.error(err);
      mostrarToast("No se pudo registrar el movimiento", "error");
    }
  });
}

function actualizarTextosModalMovimiento() {
  const esEntrada = movInventarioTipo === "entrada";
  document.getElementById("modal-mov-titulo").textContent = esEntrada ? "Registrar compra (entrada)" : "Registrar salida / ajuste";
  document.getElementById("modal-mov-sub").textContent = esEntrada
    ? "Suma unidades al stock del producto que compraste."
    : "Resta unidades por merma, pérdida u otro ajuste manual.";
  document.getElementById("campo-mov-costo").classList.toggle("hidden", !esEntrada);
}

function abrirModalMovimiento(tipo, productoPreseleccionado) {
  movInventarioTipo = tipo;
  movInventarioProductoSel = productoPreseleccionado || null;
  document.querySelectorAll("#modal-mov-inventario .chip[data-tipo-mov-modal]").forEach((c) => {
    c.classList.toggle("active", c.dataset.tipoMovModal === tipo);
  });
  actualizarTextosModalMovimiento();
  document.getElementById("mov-buscar-producto").value = "";
  document.getElementById("mov-resultados-producto").innerHTML = "";
  document.getElementById("mov-resultados-producto").classList.add("hidden");
  document.getElementById("mov-cantidad").value = "";
  document.getElementById("mov-costo").value = "";
  renderProductoSeleccionadoMov();
  abrirModal("modal-mov-inventario");
}

function renderResultadosMovProducto(query) {
  const cont = document.getElementById("mov-resultados-producto");
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
          <div class="list-meta">${pillDeStock(p.stock) || `<span>Stock no controlado</span>`}</div>
        </div>
      </div>`
    )
    .join("");
  cont.querySelectorAll(".list-row").forEach((row) => {
    row.addEventListener("click", () => {
      movInventarioProductoSel = RosaState.productos.find((p) => p.id === row.dataset.id) || null;
      document.getElementById("mov-buscar-producto").value = "";
      cont.innerHTML = "";
      cont.classList.add("hidden");
      renderProductoSeleccionadoMov();
    });
  });
}

function renderProductoSeleccionadoMov() {
  const cont = document.getElementById("mov-producto-seleccionado");
  if (!movInventarioProductoSel) {
    cont.innerHTML = "";
    cont.classList.add("hidden");
    return;
  }
  cont.classList.remove("hidden");
  const p = movInventarioProductoSel;
  cont.innerHTML = `
    <div class="list-row">
      <div class="list-icon">${svgIconoCategoria(p.categoria, 18)}</div>
      <div class="list-info">
        <div class="list-name">${escaparHTML(p.nombre)}</div>
        <div class="list-meta">${pillDeStock(p.stock) || "<span>Sin control de stock</span>"}</div>
      </div>
      <button type="button" class="list-icon-btn" id="mov-quitar-producto" title="Quitar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`;
  document.getElementById("mov-quitar-producto").addEventListener("click", () => {
    movInventarioProductoSel = null;
    renderProductoSeleccionadoMov();
  });
}

/* ---------------------- Alertas de bajo stock ---------------------- */

function renderAlertasStockBajo() {
  const productos = productosStockBajo();
  const cont = document.getElementById("lista-alertas");
  const contador = document.getElementById("alertas-contador");

  contador.textContent = productos.length
    ? `${productos.length} producto${productos.length === 1 ? "" : "s"} necesita${productos.length === 1 ? "" : "n"} reposición`
    : "Todo en orden";

  if (productos.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 6 9 17l-5-5"/></svg>
        <div>Ningún producto está en bajo stock por ahora.</div>
      </div>`;
    return;
  }

  cont.innerHTML = productos
    .map(
      (p) => `
      <div class="list-row">
        <div class="list-icon">${svgIconoCategoria(p.categoria, 18)}</div>
        <div class="list-info">
          <div class="list-name">${escaparHTML(p.nombre)}</div>
          <div class="list-meta"><span class="pill pill-category">${escaparHTML(p.categoria || "")}</span> ${pillDeStock(p.stock)}</div>
        </div>
        <button type="button" class="btn btn-outline btn-sm" data-reponer="${p.id}">Reponer</button>
      </div>`
    )
    .join("");

  cont.querySelectorAll("[data-reponer]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const producto = RosaState.productos.find((p) => p.id === btn.dataset.reponer);
      abrirModalMovimiento("entrada", producto);
    });
  });
}

/* ---------------------- Insignias de bajo stock (Inicio + pestaña Alertas) ---------------------- */

function actualizarBadgesInventario() {
  const n = productosStockBajo().length;
  ["badge-home-inventario", "badge-tab-alertas"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (n > 0) {
      el.textContent = n > 99 ? "99+" : String(n);
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
}
