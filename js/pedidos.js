/* ==========================================================================
   PEDIDOS.JS
   Catálogo para que los propios clientes armen su pedido: filtran por
   categoría (son botones de FILTRO, no de navegación — la grilla de abajo
   cambia sola), arman su carrito, y al enviarlo se guarda como una lista
   pendiente — la misma colección que usa Ventas → Listas — para que
   aparezca ahí automáticamente y la dueña la convierta en venta.

   El cliente NUNCA puede cambiar precios (a diferencia del carrito de
   Ventas), y no ve nada de costos internos ni de otras secciones.
   ========================================================================== */

let categoriaFiltroPedido = ""; // "" = todas
let carritoCliente = [];

function initPedidos() {
  document.getElementById("buscar-pedido-producto").addEventListener("input", renderGridProductosCliente);

  document.getElementById("btn-ver-carrito-cliente").addEventListener("click", abrirCarritoCliente);
  document.getElementById("cerrar-carrito-cliente").addEventListener("click", () => cerrarModal("modal-carrito-cliente"));

  document.getElementById("form-pedido-cliente").addEventListener("submit", async (e) => {
    e.preventDefault();
    await enviarPedidoCliente();
  });

  renderChipsCategoriaPedido();
  renderGridProductosCliente();
  actualizarBarraCarritoCliente();
}

/* ---------------------- Filtro por categoría (chips, no navegación) ---------------------- */

function renderChipsCategoriaPedido() {
  const cont = document.getElementById("chips-categoria-pedido");
  const categorias = RosaState.categorias;

  const chipTodas = `
    <button type="button" class="chip ${categoriaFiltroPedido === "" ? "active" : ""}" data-categoria-pedido="">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
      Todas
    </button>`;
  const chipsCategorias = categorias
    .map(
      (nombre) => `
      <button type="button" class="chip ${categoriaFiltroPedido === nombre ? "active" : ""}" data-categoria-pedido="${escaparHTML(nombre)}">
        ${svgIconoCategoria(nombre, 14)}
        ${escaparHTML(nombre)}
      </button>`
    )
    .join("");

  cont.innerHTML = chipTodas + chipsCategorias;

  cont.querySelectorAll("[data-categoria-pedido]").forEach((chip) => {
    chip.addEventListener("click", () => {
      categoriaFiltroPedido = chip.dataset.categoriaPedido;
      cont.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderGridProductosCliente();
    });
  });
}

/* ---------------------- Grilla de productos ---------------------- */

function renderGridProductosCliente() {
  const query = document.getElementById("buscar-pedido-producto").value.trim().toLowerCase();
  let productos = [...RosaState.productos];

  if (categoriaFiltroPedido) productos = productos.filter((p) => p.categoria === categoriaFiltroPedido);
  if (query) productos = productos.filter((p) => p.nombre.toLowerCase().includes(query));
  productos.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const cont = document.getElementById("grid-productos-cliente");

  if (productos.length === 0) {
    cont.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <div>${query ? "No se encontraron productos." : "Todavía no hay productos en esta categoría."}</div>
      </div>`;
    return;
  }

  cont.innerHTML = productos.map(tarjetaProductoCliente).join("");
  enlazarTarjetasProductoCliente(cont);
}

function tarjetaProductoCliente(p) {
  const enCarrito = carritoCliente.find((i) => i.id === p.id);
  const cantidadEnCarrito = enCarrito ? enCarrito.cantidad : 0;
  const controlado = p.stock !== null && p.stock !== undefined;
  const agotado = controlado && p.stock <= 0;
  const alTope = controlado && cantidadEnCarrito >= p.stock;

  return `
    <div class="prod-card ${agotado ? "agotado" : ""}" data-id="${p.id}">
      <div class="prod-card-img">
        <img src="${rutaImagenProducto(p.nombre)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('sin-imagen')" />
        <span class="prod-card-icono-fallback">${svgIconoCategoria(p.categoria, 20)}</span>
        ${agotado ? '<div class="prod-card-agotado-banner">Agotado</div>' : ""}
      </div>
      <div class="prod-card-info">
        <div class="prod-card-nombre">${escaparHTML(p.nombre)}</div>
        <div class="prod-card-precio">${formatoMoneda(p.precio)}</div>
      </div>
      <div class="prod-card-accion">
        ${
          cantidadEnCarrito > 0
            ? `<div class="qty-control prod-qty-control">
                 <button type="button" class="qty-btn" data-accion-cliente="menos" data-id="${p.id}">−</button>
                 <span class="qty-val">${cantidadEnCarrito}</span>
                 <button type="button" class="qty-btn" data-accion-cliente="mas" data-id="${p.id}" ${alTope ? "disabled" : ""}>+</button>
               </div>`
            : `<button type="button" class="btn-agregar-producto" data-accion-cliente="mas" data-id="${p.id}" ${agotado ? "disabled" : ""}>
                 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 5v14M5 12h14"/></svg>
               </button>`
        }
      </div>
    </div>`;
}

function enlazarTarjetasProductoCliente(cont) {
  cont.querySelectorAll("[data-accion-cliente]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const producto = RosaState.productos.find((p) => p.id === btn.dataset.id);
      if (!producto) return;
      if (btn.dataset.accionCliente === "mas") agregarAlCarritoCliente(producto);
      if (btn.dataset.accionCliente === "menos") quitarDelCarritoCliente(producto.id);
    });
  });
}

/* ---------------------- Carrito del cliente ---------------------- */

function agregarAlCarritoCliente(producto) {
  const existente = carritoCliente.find((i) => i.id === producto.id);
  const cantidadActual = existente ? existente.cantidad : 0;

  if (producto.stock !== null && producto.stock !== undefined && cantidadActual >= producto.stock) {
    mostrarToast("No hay más stock disponible", "error");
    return;
  }

  if (existente) {
    existente.cantidad += 1;
  } else {
    carritoCliente.push({ id: producto.id, ean: producto.ean, nombre: producto.nombre, precio: producto.precio, cantidad: 1 });
  }

  RosaAudio.popAgregado();
  renderGridProductosCliente();
  actualizarBarraCarritoCliente();
}

function quitarDelCarritoCliente(id) {
  const item = carritoCliente.find((i) => i.id === id);
  if (!item) return;
  item.cantidad -= 1;
  if (item.cantidad <= 0) carritoCliente = carritoCliente.filter((i) => i.id !== id);

  renderGridProductosCliente();
  actualizarBarraCarritoCliente();
  if (document.getElementById("modal-carrito-cliente").classList.contains("open")) renderCarritoCliente();
}

function actualizarBarraCarritoCliente() {
  const barra = document.getElementById("total-bar-cliente");
  const totalItems = carritoCliente.reduce((acc, i) => acc + i.cantidad, 0);
  const total = carritoCliente.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  barra.classList.toggle("hidden", totalItems === 0);
  document.getElementById("contador-carrito-cliente").textContent = `${totalItems} producto${totalItems === 1 ? "" : "s"}`;
  document.getElementById("total-carrito-cliente").textContent = formatoMoneda(total);
}

function abrirCarritoCliente() {
  renderCarritoCliente();
  abrirModal("modal-carrito-cliente");
}

function renderCarritoCliente() {
  const cont = document.getElementById("lista-carrito-cliente");

  if (carritoCliente.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
        <div>Tu pedido está vacío. Agrega productos del catálogo.</div>
      </div>`;
  } else {
    cont.innerHTML = carritoCliente.map(filaCarritoCliente).join("");
    enlazarTarjetasProductoCliente(cont);
  }

  const total = carritoCliente.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  document.getElementById("carrito-cliente-total").textContent = formatoMoneda(total);
}

/** Fila de carrito para el cliente: cantidad editable, precio SIEMPRE fijo. */
function filaCarritoCliente(item) {
  return `
    <div class="sale-item" data-id="${item.id}">
      <div class="sale-item-info">
        <div class="sale-item-name">${escaparHTML(item.nombre)}</div>
        <div class="field-hint" style="margin-top:2px;">${formatoMoneda(item.precio)} c/u</div>
      </div>
      <div class="qty-control">
        <button type="button" class="qty-btn" data-accion-cliente="menos" data-id="${item.id}">−</button>
        <span class="qty-val">${item.cantidad}</span>
        <button type="button" class="qty-btn" data-accion-cliente="mas" data-id="${item.id}">+</button>
      </div>
      <div class="sale-item-total">${formatoMoneda(item.precio * item.cantidad)}</div>
    </div>`;
}

/* ---------------------- Enviar pedido (se guarda como Lista pendiente) ---------------------- */

async function enviarPedidoCliente() {
  if (carritoCliente.length === 0) {
    mostrarToast("Tu pedido está vacío", "error");
    return;
  }
  const nombre = document.getElementById("pedido-cliente-nombre").value.trim();
  const telefono = document.getElementById("pedido-cliente-telefono").value.trim();
  if (!nombre) {
    mostrarToast("Escribe tu nombre para enviar el pedido", "error");
    return;
  }
  if (!RosaState.firebaseListo) {
    mostrarToast("No hay conexión en este momento. Intenta de nuevo.", "error");
    return;
  }

  const btn = document.getElementById("btn-enviar-pedido-cliente");
  btn.disabled = true;
  try {
    await RosaState.db.collection("listas").add({
      cliente: nombre,
      telefono: telefono || null,
      items: carritoCliente.map((i) => ({ ...i, precioOriginal: i.precio })),
      estado: "pendiente",
      origen: "catalogo-cliente",
      creadaEn: firebase.firestore.FieldValue.serverTimestamp(),
      actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
    });

    RosaAudio.beepConfirmacion();
    cerrarModal("modal-carrito-cliente");
    abrirModal("modal-pedido-enviado");

    carritoCliente = [];
    document.getElementById("form-pedido-cliente").reset();
    renderGridProductosCliente();
    actualizarBarraCarritoCliente();
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo enviar el pedido. Intenta de nuevo.", "error");
  } finally {
    btn.disabled = false;
  }
}
