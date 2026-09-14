/* ==========================================================================
   STATE.JS
   Estado global de la app + helpers reutilizados por todos los módulos.
   ========================================================================== */

const UMBRAL_STOCK_BAJO = 3; // a partir de qué cantidad se considera "bajo stock"

const RosaState = {
  db: null,
  firebaseListo: false,
  productos: [],          // caché del catálogo, sincronizada en tiempo real
  categorias: [],          // nombres de categoría, sincronizados en tiempo real
  listas: [],               // listas de clientes de confianza (pedidos/cotizaciones)
  cuentas: [],                // cuentas "a fiado" de clientes, sincronizadas en tiempo real
  cuentasCerveza: [],           // cuentas de cervezas por cajas: pedidos, entregas y pagos
  movimientosInventario: [],   // historial de entradas/salidas de stock
  venta: [],                     // items de la venta activa en la pestaña "Vender"
  scannerActivo: false,
  html5QrCode: null
};

/** Formatea un número como moneda, ej: 19.9 -> "S/ 19.90" */
function formatoMoneda(valor) {
  const n = Number(valor) || 0;
  return `${NEGOCIO.moneda} ${n.toFixed(2)}`;
}

/** Escapa texto para insertarlo de forma segura dentro de innerHTML */
function escaparHTML(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

/** Convierte cualquier fecha (Timestamp de Firestore, Date o string ISO) a un objeto Date */
function aFecha(valor) {
  if (!valor) return new Date();
  if (valor.toDate) return valor.toDate();
  if (valor instanceof Date) return valor;
  return new Date(valor);
}

/** Formatea fecha + hora de forma corta y consistente en toda la app */
function formatoFechaHora(valor) {
  const fecha = aFecha(valor);
  const dia = fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  return `${dia} · ${hora}`;
}

/** Genera un identificador local corto, único, para items dentro de arrays (no requiere Firestore) */
function generarIdLocal(prefijo) {
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Busca un producto en la caché local por EAN exacto */
function buscarProductoPorEAN(ean) {
  return RosaState.productos.find((p) => p.ean === String(ean).trim());
}

/** Busca productos por coincidencia parcial de nombre, EAN o categoría */
function buscarProductos(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return RosaState.productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.ean.includes(q) ||
      (p.categoria || "").toLowerCase().includes(q)
  );
}

/** Devuelve los productos con stock controlado igual o por debajo del umbral de bajo stock */
function productosStockBajo() {
  return RosaState.productos
    .filter((p) => p.stock !== null && p.stock !== undefined && p.stock <= UMBRAL_STOCK_BAJO)
    .sort((a, b) => (a.stock || 0) - (b.stock || 0));
}

/** Bloque reutilizable de "no hay nada que mostrar todavía" */
function mensajeVacio(mensaje, icono) {
  const path =
    icono === "chart"
      ? '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'
      : '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>';
  return `
    <div class="empty-state">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${path}</svg>
      <div>${mensaje}</div>
    </div>`;
}

/** Muestra una notificación flotante breve, con un ícono según el tipo */
let toastTimer = null;
function mostrarToast(mensaje, tipo = "ok") {
  const toast = document.getElementById("toast");
  const texto = document.getElementById("toast-text");
  const icono = document.getElementById("toast-icon");
  texto.textContent = mensaje;
  toast.classList.toggle("error", tipo === "error");
  if (icono) {
    icono.innerHTML =
      tipo === "error"
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg>';
  }
  toast.classList.remove("show");
  void toast.offsetWidth; // reinicia la animación aunque el toast anterior siga visible
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

/** Refleja el estado de conexión (se consulta desde "Ajustes") */
function actualizarEstadoConexion(ok) {
  RosaState.firebaseListo = ok;
  if (typeof actualizarInfoSistema === "function") actualizarInfoSistema();
}

/* ---------------------- Categorías ---------------------- */

/** Refresca el <datalist> que alimenta de sugerencias a todos los campos de categoría */
function actualizarDatalistCategorias() {
  const datalist = document.getElementById("lista-categorias-datalist");
  datalist.innerHTML = RosaState.categorias
    .map((nombre) => `<option value="${escaparHTML(nombre)}"></option>`)
    .join("");
}

/**
 * Garantiza que una categoría exista en Firestore (si el usuario escribió
 * una nueva, la crea). Devuelve el nombre "canónico" — si ya existe una
 * categoría con el mismo texto (sin importar mayúsculas/minúsculas), se
 * respeta como está guardada, para no duplicar "Lácteos" y "lacteos".
 */
async function asegurarCategoria(nombreEscrito) {
  const nombre = nombreEscrito.trim();
  const existente = RosaState.categorias.find((c) => c.toLowerCase() === nombre.toLowerCase());
  if (existente) return existente;

  if (RosaState.firebaseListo) {
    try {
      await RosaState.db.collection("categorias").add({
        nombre,
        creadaEn: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("No se pudo crear la categoría:", err);
    }
  }
  return nombre;
}

/* ---------------------- Cuentas de cervezas (por cajas/docenas) ---------------------- */

/**
 * Busca una cuenta de cerveza abierta por nombre de cliente (sin importar
 * mayúsculas). Si no existe, la crea. Devuelve el id de la cuenta.
 */
async function asegurarCuentaCerveza(nombreCliente, telefono) {
  const nombre = nombreCliente.trim();
  const existente = RosaState.cuentasCerveza.find((c) => c.cliente.toLowerCase() === nombre.toLowerCase());
  if (existente) {
    if (telefono && !existente.telefono && RosaState.firebaseListo) {
      RosaState.db.collection("cuentasCerveza").doc(existente.id).update({ telefono }).catch(() => {});
    }
    return existente.id;
  }
  if (!RosaState.firebaseListo) return null;
  const ref = await RosaState.db.collection("cuentasCerveza").add({
    cliente: nombre,
    telefono: telefono || null,
    saldoDinero: 0,
    cervezasPedidas: 0,
    cervezasEntregadas: 0,
    movimientos: [],
    creadaEn: firebase.firestore.FieldValue.serverTimestamp(),
    actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

/* ---------------------- Cuentas (fiado) ---------------------- */

/**
 * Busca una cuenta abierta por nombre de cliente (sin importar mayúsculas).
 * Si no existe, la crea. Devuelve el id de la cuenta. Igual que con las
 * categorías, evita duplicar "Don Carlos" y "don carlos".
 */
async function asegurarCuenta(nombreCliente, telefono) {
  const nombre = nombreCliente.trim();
  const existente = RosaState.cuentas.find((c) => c.cliente.toLowerCase() === nombre.toLowerCase());
  if (existente) {
    if (telefono && !existente.telefono && RosaState.firebaseListo) {
      RosaState.db.collection("cuentas").doc(existente.id).update({ telefono }).catch(() => {});
    }
    return existente.id;
  }
  if (!RosaState.firebaseListo) return null;
  const ref = await RosaState.db.collection("cuentas").add({
    cliente: nombre,
    telefono: telefono || null,
    saldo: 0,
    movimientos: [],
    creadaEn: firebase.firestore.FieldValue.serverTimestamp(),
    actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

/**
 * Agrega un cargo (compra a cuenta) a la cuenta de un cliente. Crea la
 * cuenta si todavía no existe. Devuelve el id de la cuenta afectada.
 */
async function registrarCargoEnCuenta({ cliente, telefono, items, total }) {
  if (!RosaState.firebaseListo) return null;
  const cuentaId = await asegurarCuenta(cliente, telefono);
  if (!cuentaId) return null;

  const movimiento = {
    id: generarIdLocal("mov"),
    tipo: "cargo",
    monto: total,
    fecha: new Date().toISOString(),
    detalle: items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio }))
  };

  const cuenta = RosaState.cuentas.find((c) => c.id === cuentaId);
  const movimientosPrevios = cuenta ? cuenta.movimientos || [] : [];
  const saldoPrevio = cuenta ? cuenta.saldo || 0 : 0;

  await RosaState.db
    .collection("cuentas")
    .doc(cuentaId)
    .update({
      saldo: saldoPrevio + total,
      movimientos: [...movimientosPrevios, movimiento],
      actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
    });

  return cuentaId;
}

/* ---------------------- Movimientos de inventario (entradas/salidas) ---------------------- */

/** Registra en el historial una entrada (compra) o salida (venta/ajuste) de stock */
async function registrarMovimientoInventario({ tipo, productoId, productoNombre, cantidad, motivo, costoUnitario }) {
  if (!RosaState.firebaseListo) return;
  try {
    await RosaState.db.collection("movimientosInventario").add({
      tipo, // "entrada" | "salida"
      productoId: productoId || null,
      productoNombre,
      cantidad,
      motivo: motivo || (tipo === "entrada" ? "compra" : "venta"),
      costoUnitario: costoUnitario ?? null,
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error("No se pudo registrar el movimiento de inventario:", err);
  }
}

/** Pill de stock: nada si no se controla, y colores según qué tan bajo esté */
function pillDeStock(stock) {
  if (stock === null || stock === undefined) return "";
  if (stock <= 0) return `<span class="pill pill-coral">Agotado</span>`;
  if (stock <= UMBRAL_STOCK_BAJO) return `<span class="pill pill-amber">Stock: ${stock}</span>`;
  return `<span class="pill pill-soft">Stock: ${stock}</span>`;
}

/**
 * Descuenta del stock los productos vendidos (se llama al confirmar una
 * venta, sea pagada o a cuenta — el producto de todas formas salió de la
 * tienda) y deja constancia de la salida en el historial de movimientos.
 */
async function descontarStock(items) {
  if (!RosaState.firebaseListo) return;
  const actualizaciones = items
    .filter((i) => !i.esLibre && i.id)
    .map(async (i) => {
      const producto = RosaState.productos.find((p) => p.id === i.id);
      if (!producto) return;
      if (producto.stock !== null && producto.stock !== undefined) {
        const nuevoStock = Math.max(0, producto.stock - i.cantidad);
        await RosaState.db
          .collection("productos")
          .doc(i.id)
          .update({ stock: nuevoStock })
          .catch((err) => console.error("No se pudo actualizar el stock:", err));
      }
      await registrarMovimientoInventario({
        tipo: "salida",
        productoId: i.id,
        productoNombre: i.nombre,
        cantidad: i.cantidad,
        motivo: "venta"
      });
    });
  await Promise.all(actualizaciones);
}

/* ---------------------- Carrito compartido (Vender y Listas) ---------------------- */

/**
 * Construye el HTML de una fila de producto dentro de un carrito.
 * La usan tanto la venta activa ("Vender") como el detalle de una lista.
 * item = { id, nombre, precio, precioOriginal, cantidad, esLibre? }
 */
function construirFilaCarrito(item) {
  const editado = item.precio !== item.precioOriginal;
  return `
    <div class="sale-item nuevo" data-id="${item.id}">
      <div class="sale-item-info">
        <div class="sale-item-name">
          ${escaparHTML(item.nombre)}
          ${item.esLibre ? '<span class="mini-tag">Libre</span>' : ""}
        </div>
        <div class="sale-item-price-row">
          <span class="sale-item-price ${editado ? "editado" : ""}">${formatoMoneda(item.precio)} c/u</span>
          <button class="price-edit-btn" data-accion="editar-precio" data-id="${item.id}" title="Editar precio solo aquí">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
        </div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" data-accion="menos" data-id="${item.id}">−</button>
        <span class="qty-val">${item.cantidad}</span>
        <button class="qty-btn" data-accion="mas" data-id="${item.id}">+</button>
      </div>
      <div class="sale-item-total">${formatoMoneda(item.precio * item.cantidad)}</div>
      <button class="remove-btn" data-accion="borrar" data-id="${item.id}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`;
}

/**
 * Reemplaza el precio de una fila por un campo editable. Al confirmar
 * (Enter o quitar el foco) llama a `alGuardar(nuevoPrecio)`. Si el valor
 * no es válido, restaura el texto original sin cambiar nada.
 */
function activarEdicionPrecioInline(filaEl, valorActual, alGuardar) {
  const filaPrecio = filaEl.querySelector(".sale-item-price-row");
  const contenidoOriginal = filaPrecio.innerHTML;
  filaPrecio.innerHTML = `<input type="number" step="0.01" min="0" class="price-edit-input" value="${valorActual.toFixed(2)}" />`;
  const input = filaPrecio.querySelector("input");
  input.focus();
  input.select();

  const confirmar = () => {
    const nuevo = parseFloat(input.value);
    if (!isNaN(nuevo) && nuevo >= 0) {
      alGuardar(nuevo);
    } else {
      filaPrecio.innerHTML = contenidoOriginal;
    }
  };
  input.addEventListener("blur", confirmar, { once: true });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
  });
}
