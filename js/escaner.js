/* ==========================================================================
   ESCANER.JS
   Escáner de código de barras genérico y reutilizable. Lo usan dos
   páginas distintas, cada una con su propio "modo":
     - Inventario → Registrar   (modo "ean": llena el campo de código)
     - Ventas → Listas          (modo "lista": agrega el producto al pedido)
   Cada página incluye este archivo solo si lo necesita.
   ========================================================================== */

let html5QrGenerico = null;
let ultimoEscaneoGenerico = { codigo: "", hora: 0 };

function initEscanerGenerico() {
  document.querySelectorAll(".btn-scan-mini").forEach((btn) => {
    btn.addEventListener("click", () => abrirEscanerGenerico(btn.dataset.modo));
  });
  document.getElementById("cerrar-scan-generico").addEventListener("click", cerrarEscanerGenerico);
}

function abrirEscanerGenerico(modo) {
  if (typeof Html5Qrcode === "undefined") {
    mostrarToast("No se pudo cargar la librería de escaneo", "error");
    return;
  }

  const titulo = document.getElementById("scan-generico-titulo");
  const sub = document.getElementById("scan-generico-sub");
  if (modo === "lista") {
    titulo.textContent = "Agregar producto a la lista";
    sub.textContent = "Escanea uno o varios códigos seguidos.";
  } else {
    titulo.textContent = "Escanear código";
    sub.textContent = "Apunta la cámara al código de barras del producto.";
  }

  abrirModal("modal-scan-generico");
  ultimoEscaneoGenerico = { codigo: "", hora: 0 };

  setTimeout(() => {
    html5QrGenerico = new Html5Qrcode("qr-reader-generico");
    html5QrGenerico
      .start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: 220, height: 130 } },
        (decodedText) => onEscaneoGenerico(decodedText, modo),
        () => {}
      )
      .catch((err) => {
        console.error(err);
        mostrarToast("No se pudo acceder a la cámara. Revisa los permisos.", "error");
        cerrarEscanerGenerico();
      });
  }, 150);
}

function onEscaneoGenerico(decodedText, modo) {
  const ahora = Date.now();
  if (decodedText === ultimoEscaneoGenerico.codigo && ahora - ultimoEscaneoGenerico.hora < 1200) return;
  ultimoEscaneoGenerico = { codigo: decodedText, hora: ahora };

  if (modo === "ean") {
    document.getElementById("input-ean").value = decodedText;
    const errorEAN = document.getElementById("error-ean");
    const yaExiste = buscarProductoPorEAN(decodedText);
    if (yaExiste) {
      errorEAN.textContent = `Ya existe: "${yaExiste.nombre}" con este código EAN.`;
      errorEAN.style.display = "block";
    } else {
      errorEAN.style.display = "none";
    }
    RosaAudio.beepEscaneo();
    cerrarEscanerGenerico();
    document.getElementById("input-nombre").focus();
    return;
  }

  if (modo === "lista") {
    const producto = buscarProductoPorEAN(decodedText);
    if (producto) {
      RosaAudio.beepEscaneo();
      if (typeof agregarProductoALista === "function") {
        agregarProductoALista(producto);
      }
      // Se queda escaneando: así se pueden agregar varios productos seguidos.
    } else {
      RosaAudio.beepNoEncontrado();
      mostrarToast(`Código ${decodedText} no está en el catálogo`, "error");
    }
  }
}

function cerrarEscanerGenerico() {
  cerrarModal("modal-scan-generico");
  if (html5QrGenerico) {
    html5QrGenerico
      .stop()
      .then(() => html5QrGenerico.clear())
      .catch(() => {});
    html5QrGenerico = null;
  }
}
