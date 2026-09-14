/* ==========================================================================
   LISTAS.JS
   "Clientes de confianza": arma el pedido de alguien con anticipación
   (por escaneo, texto o voz), lo guarda como cotización, y cuando el
   cliente llega se convierte en una venta con un solo toque — sin volver
   a escribir nada. El precio de cada producto se puede ajustar SOLO
   dentro de esa lista puntual; el catálogo original nunca se toca.
   ========================================================================== */

let listaActualId = null;
let listaActualItems = [];

function initListas() {
  document.getElementById("btn-nueva-lista").addEventListener("click", () => abrirModal("modal-nueva-lista"));
  document.getElementById("cerrar-nueva-lista").addEventListener("click", () => cerrarModal("modal-nueva-lista"));

  document.getElementById("form-nueva-lista").addEventListener("submit", async (e) => {
    e.preventDefault();
    const cliente = document.getElementById("nueva-lista-nombre").value.trim();
    const telefono = document.getElementById("nueva-lista-telefono").value.trim();

    if (!cliente) {
      mostrarToast("Ingresa el nombre del cliente", "error");
      return;
    }
    if (!RosaState.firebaseListo) {
      mostrarToast("Firebase no está conectado todavía", "error");
      return;
    }

    try {
      const ref = await RosaState.db.collection("listas").add({
        cliente,
        telefono: telefono || null,
        items: [],
        estado: "pendiente",
        creadaEn: firebase.firestore.FieldValue.serverTimestamp(),
        actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      document.getElementById("form-nueva-lista").reset();
      cerrarModal("modal-nueva-lista");
      abrirDetalleLista(ref.id, { cliente, telefono, items: [] });
    } catch (err) {
      console.error(err);
      mostrarToast("No se pudo crear la lista", "error");
    }
  });

  document.getElementById("buscar-listas").addEventListener("input", (e) => {
    renderListaDeListas(e.target.value);
  });

  document.getElementById("buscar-lista-producto").addEventListener("input", (e) => {
    renderResultadosListaProducto(e.target.value);
  });
  initBusquedaVoz("buscar-lista-producto", "btn-mic-lista", (texto) => renderResultadosListaProducto(texto));

  document.getElementById("cerrar-lista-detalle").addEventListener("click", cerrarDetalleLista);
  document.getElementById("btn-guardar-lista").addEventListener("click", () => guardarListaFirestore(true));
  document.getElementById("btn-convertir-lista").addEventListener("click", convertirListaAVenta);
  document.getElementById("btn-eliminar-lista").addEventListener("click", eliminarListaActual);
}

/* ---------------------- Listado de listas pendientes ---------------------- */

function renderListaDeListas(query) {
  const cont = document.getElementById("contenedor-listas");
  const q = query.trim().toLowerCase();

  const pendientes = RosaState.listas
    .filter((l) => l.estado !== "convertida")
    .filter((l) => !q || l.cliente.toLowerCase().includes(q))
    .sort((a, b) => {
      const ta = a.actualizadaEn && a.actualizadaEn.seconds ? a.actualizadaEn.seconds : 0;
      const tb = b.actualizadaEn && b.actualizadaEn.seconds ? b.actualizadaEn.seconds : 0;
      return tb - ta;
    });

  if (pendientes.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/></svg>
        <div>${q ? "No hay listas de ese cliente." : "Todavía no tienes listas guardadas."}</div>
      </div>`;
    return;
  }

  cont.innerHTML = pendientes
    .map((l) => {
      const totalItems = (l.items || []).reduce((acc, i) => acc + i.cantidad, 0);
      const total = (l.items || []).reduce((acc, i) => acc + i.precio * i.cantidad, 0);
      const esPedidoWeb = l.origen === "catalogo-cliente";
      return `
        <div class="lista-card" data-id="${l.id}" style="cursor:pointer">
          <div class="lista-card-icon" style="${esPedidoWeb ? "background:var(--sky-soft); color:var(--sky);" : ""}">
            ${
              esPedidoWeb
                ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>'
                : '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/></svg>'
            }
          </div>
          <div class="lista-card-info">
            <div class="lista-card-nombre">${escaparHTML(l.cliente)}</div>
            <div class="lista-card-meta">
              ${totalItems} producto${totalItems === 1 ? "" : "s"}
              ${esPedidoWeb ? '<span class="pill pill-sky" style="margin-left:6px;">Pedido web</span>' : ""}
            </div>
          </div>
          <div class="lista-card-total">${formatoMoneda(total)}</div>
        </div>`;
    })
    .join("");

  cont.querySelectorAll(".lista-card").forEach((card) => {
    card.addEventListener("click", () => {
      const lista = RosaState.listas.find((l) => l.id === card.dataset.id);
      if (lista) abrirDetalleLista(lista.id, lista);
    });
  });
}

/* ---------------------- Detalle de una lista ---------------------- */

function abrirDetalleLista(id, datosLista) {
  listaActualId = id;
  listaActualItems = (datosLista.items || []).map((i) => ({ ...i }));

  document.getElementById("detalle-lista-nombre").textContent = datosLista.cliente;
  document.getElementById("buscar-lista-producto").value = "";
  document.getElementById("resultados-lista-producto").innerHTML = "";
  document.getElementById("resultados-lista-producto").classList.add("hidden");

  renderDetalleListaMeta();
  renderDetalleListaItems();
  abrirModal("modal-lista-detalle");
}

function renderDetalleListaMeta() {
  const totalItems = listaActualItems.reduce((acc, i) => acc + i.cantidad, 0);
  document.getElementById("detalle-lista-meta").textContent =
    totalItems > 0 ? `Pendiente · ${totalItems} producto${totalItems === 1 ? "" : "s"}` : "Pendiente · lista vacía";
}

function renderResultadosListaProducto(query) {
  const cont = document.getElementById("resultados-lista-producto");
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
          <div class="list-meta">EAN ${escaparHTML(p.ean)}</div>
        </div>
        <div class="pill pill-green">${formatoMoneda(p.precio)}</div>
      </div>`
    )
    .join("");

  cont.querySelectorAll(".list-row").forEach((row) => {
    row.addEventListener("click", () => {
      const producto = RosaState.productos.find((p) => p.id === row.dataset.id);
      if (producto) {
        agregarProductoALista(producto);
        document.getElementById("buscar-lista-producto").value = "";
        cont.innerHTML = "";
        cont.classList.add("hidden");
      }
    });
  });
}

function agregarProductoALista(producto) {
  if (!listaActualId) {
    mostrarToast("Abre o crea una lista primero", "error");
    return;
  }
  const existente = listaActualItems.find((i) => i.id === producto.id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    listaActualItems.push({
      id: producto.id,
      ean: producto.ean,
      nombre: producto.nombre,
      precio: producto.precio,
      precioOriginal: producto.precio,
      cantidad: 1
    });
  }
  RosaAudio.popAgregado();
  renderDetalleListaMeta();
  renderDetalleListaItems();
}

function renderDetalleListaItems() {
  const cont = document.getElementById("lista-detalle-items");
  const totalEl = document.getElementById("lista-detalle-total");

  if (listaActualItems.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
        <div>Busca, escanea o di en voz alta el primer producto.</div>
      </div>`;
  } else {
    cont.innerHTML = listaActualItems.map(construirFilaCarrito).join("");

    cont.querySelectorAll("[data-accion]").forEach((btn) => {
      const id = btn.dataset.id;
      btn.addEventListener("click", () => {
        const accion = btn.dataset.accion;
        const item = listaActualItems.find((i) => i.id === id);
        if (accion === "mas" && item) item.cantidad += 1;
        if (accion === "menos" && item) {
          item.cantidad -= 1;
          if (item.cantidad <= 0) listaActualItems = listaActualItems.filter((i) => i.id !== id);
        }
        if (accion === "borrar") listaActualItems = listaActualItems.filter((i) => i.id !== id);
        if (accion === "editar-precio" && item) {
          activarEdicionPrecioInline(btn.closest(".sale-item"), item.precio, (nuevoPrecio) => {
            item.precio = nuevoPrecio;
            renderDetalleListaItems();
          });
          return;
        }
        renderDetalleListaMeta();
        renderDetalleListaItems();
      });
    });
  }

  const total = listaActualItems.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  totalEl.textContent = formatoMoneda(total);
}

async function guardarListaFirestore(mostrarConfirmacion) {
  if (!listaActualId) return;
  if (!RosaState.firebaseListo) {
    mostrarToast("Firebase no está conectado todavía", "error");
    return;
  }
  try {
    await RosaState.db
      .collection("listas")
      .doc(listaActualId)
      .update({
        items: listaActualItems,
        actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
      });
    if (mostrarConfirmacion) mostrarToast("Lista guardada");
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo guardar la lista", "error");
  }
}

function cerrarDetalleLista() {
  guardarListaFirestore(false); // guarda en silencio para no perder cambios
  cerrarModal("modal-lista-detalle");
  listaActualId = null;
  listaActualItems = [];
}

async function convertirListaAVenta() {
  if (listaActualItems.length === 0) {
    mostrarToast("Esta lista todavía está vacía", "error");
    return;
  }
  if (RosaState.venta.length > 0) {
    const continuar = confirm("Ya hay una venta en curso en 'Vender'. ¿Reemplazarla con esta lista?");
    if (!continuar) return;
  }

  RosaState.venta = listaActualItems.map((i) => ({ ...i }));
  renderVenta();

  if (RosaState.firebaseListo && listaActualId) {
    try {
      await RosaState.db.collection("listas").doc(listaActualId).update({
        estado: "convertida",
        actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  }

  RosaAudio.beepConvertir();
  cerrarModal("modal-lista-detalle");
  listaActualId = null;
  listaActualItems = [];
  cambiarPantalla("vender");
  mostrarToast("Lista convertida. Revisa el carrito y confirma la venta.");
}

async function eliminarListaActual() {
  if (!listaActualId) return;
  if (!confirm("¿Eliminar esta lista? Esta acción no se puede deshacer.")) return;

  try {
    await RosaState.db.collection("listas").doc(listaActualId).delete();
    mostrarToast("Lista eliminada");
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo eliminar la lista", "error");
  }
  cerrarModal("modal-lista-detalle");
  listaActualId = null;
  listaActualItems = [];
}
