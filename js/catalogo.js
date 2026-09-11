/* ==========================================================================
   CATALOGO.JS
   - Registro de productos con categoría (nueva o existente) y EAN
     (escrito o escaneado) — vive en Inventario → Registrar.
   - Editar nombre/categoría/precio o eliminar un producto ya existente.
   - Escáner genérico reutilizado por Registrar (llenar EAN) y por Listas
     (agregar producto a una lista).
   - Descuento de stock al confirmar una venta, con su registro de salida
     en el historial de movimientos de inventario.
   ========================================================================== */

let productoEditandoId = null;

function initCatalogo() {
  const form = document.getElementById("form-producto");
  const inputEAN = document.getElementById("input-ean");
  const inputNombre = document.getElementById("input-nombre");
  const inputCategoria = document.getElementById("input-categoria");
  const inputPrecio = document.getElementById("input-precio");
  const inputStock = document.getElementById("input-stock");
  const errorEAN = document.getElementById("error-ean");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEAN.style.display = "none";

    const ean = inputEAN.value.trim();
    const nombre = inputNombre.value.trim();
    const categoriaTexto = inputCategoria.value.trim();
    const precio = parseFloat(inputPrecio.value);
    const stock = inputStock.value.trim() === "" ? null : parseInt(inputStock.value, 10);

    if (!ean || !nombre || !categoriaTexto || isNaN(precio) || precio < 0) {
      mostrarToast("Completa todos los campos correctamente", "error");
      return;
    }
    if (!RosaState.firebaseListo) {
      mostrarToast("Firebase no está conectado todavía", "error");
      return;
    }
    const yaExiste = buscarProductoPorEAN(ean);
    if (yaExiste) {
      errorEAN.textContent = `Ya existe: "${yaExiste.nombre}" con este código EAN.`;
      errorEAN.style.display = "block";
      mostrarToast("Ese código EAN ya está registrado", "error");
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const categoria = await asegurarCategoria(categoriaTexto);
      await RosaState.db.collection("productos").add({
        ean,
        nombre,
        categoria,
        precio,
        stock,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (stock !== null && stock > 0) {
        registrarMovimientoInventario({ tipo: "entrada", productoNombre: nombre, cantidad: stock, motivo: "compra" });
      }
      mostrarToast(`"${nombre}" agregado al catálogo`);
      form.reset();
      inputEAN.focus();
    } catch (err) {
      console.error(err);
      mostrarToast("No se pudo guardar. Revisa tu conexión.", "error");
    } finally {
      btn.disabled = false;
    }
  });

  inputEAN.addEventListener("input", () => (errorEAN.style.display = "none"));

  initEdicionProducto();
}

/* pillDeStock() y descontarStock() ahora viven en state.js (compartido:
   los usan tanto Ventas como Inventario, que ahora son páginas separadas). */

/* ---------------------- Editar / eliminar producto ---------------------- */

function initEdicionProducto() {
  document.getElementById("cerrar-editar").addEventListener("click", () => cerrarModal("modal-editar-producto"));

  document.getElementById("form-editar-producto").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!productoEditandoId) return;

    const nombre = document.getElementById("editar-nombre").value.trim();
    const categoriaTexto = document.getElementById("editar-categoria").value.trim();
    const precio = parseFloat(document.getElementById("editar-precio").value);
    const inputStockEditar = document.getElementById("editar-stock");
    const stock = inputStockEditar.value.trim() === "" ? null : parseInt(inputStockEditar.value, 10);
    const errorEditar = document.getElementById("error-editar");
    errorEditar.style.display = "none";

    if (!nombre || !categoriaTexto || isNaN(precio) || precio < 0) {
      mostrarToast("Completa todos los campos correctamente", "error");
      return;
    }
    if (!RosaState.firebaseListo) {
      mostrarToast("Firebase no está conectado todavía", "error");
      return;
    }

    try {
      const categoria = await asegurarCategoria(categoriaTexto);
      await RosaState.db.collection("productos").doc(productoEditandoId).update({ nombre, categoria, precio, stock });
      mostrarToast("Producto actualizado");
      cerrarModal("modal-editar-producto");
    } catch (err) {
      console.error(err);
      mostrarToast("No se pudo guardar los cambios", "error");
    }
  });

  document.getElementById("eliminar-producto").addEventListener("click", async () => {
    if (!productoEditandoId) return;
    const producto = RosaState.productos.find((p) => p.id === productoEditandoId);
    const nombre = producto ? producto.nombre : "este producto";
    if (!confirm(`¿Eliminar "${nombre}" del catálogo? Esta acción no se puede deshacer.`)) return;

    try {
      await RosaState.db.collection("productos").doc(productoEditandoId).delete();
      mostrarToast("Producto eliminado");
      cerrarModal("modal-editar-producto");
    } catch (err) {
      console.error(err);
      mostrarToast("No se pudo eliminar el producto", "error");
    }
  });
}

function abrirEdicionProducto(id) {
  const producto = RosaState.productos.find((p) => p.id === id);
  if (!producto) return;
  productoEditandoId = id;
  document.getElementById("editar-ean").value = producto.ean;
  document.getElementById("editar-nombre").value = producto.nombre;
  document.getElementById("editar-categoria").value = producto.categoria || "";
  document.getElementById("editar-precio").value = producto.precio.toFixed(2);
  document.getElementById("editar-stock").value =
    producto.stock === null || producto.stock === undefined ? "" : producto.stock;
  document.getElementById("error-editar").style.display = "none";
  abrirModal("modal-editar-producto");
}

/* El escáner genérico (usado para llenar el EAN aquí, y para agregar
   productos a una Lista en Ventas) ahora vive en js/escaner.js, compartido
   entre ambas páginas. */
