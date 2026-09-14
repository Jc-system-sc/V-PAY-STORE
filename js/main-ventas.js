/* ==========================================================================
   MAIN-VENTAS.JS
   Arranca la página de Ventas (Vender · Listas · Resumen). Conecta
   Firebase y sincroniza solo lo que esta página necesita: productos y
   categorías (para vender), listas (clientes de confianza) y cuentas
   (para no duplicar una cuenta al vender a fiado).
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.title = `Ventas · ${NEGOCIO.nombre}`;

  initUI();
  initTemas();
  initEscanerGenerico();
  initVentas();
  initListas();
  initBoleta();
  initResumen();

  // Reacciona cuando el usuario cambia de pestaña dentro de Ventas.
  window.alCambiarPantalla = (pantalla) => {
    document.getElementById("total-bar").classList.toggle("hidden", pantalla !== "vender");
    if (pantalla !== "vender" && RosaState.scannerActivo) detenerEscaner();

    if (pantalla === "listas") renderListaDeListas(document.getElementById("buscar-listas").value);
    if (pantalla === "resumen") {
      cargarResumenDelDia();
      cargarUltimasVentas();
      cargarTopProductos();
      cargarClientesFrecuentes();
    }
  };

  conectarFirebaseVentas();
});

function conectarFirebaseVentas() {
  const configSinCompletar =
    !firebaseConfig.apiKey || firebaseConfig.apiKey === "TU_API_KEY" || !firebaseConfig.projectId;

  if (configSinCompletar) {
    actualizarEstadoConexion(false);
    mostrarToast("Falta configurar Firebase. Abre js/config.js", "error");
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    RosaState.db = firebase.firestore();

    RosaState.db.collection("productos").onSnapshot(
      (snapshot) => {
        RosaState.productos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        RosaState.firebaseListo = true;
        actualizarEstadoConexion(true);
      },
      (err) => {
        console.error(err);
        actualizarEstadoConexion(false);
        mostrarToast("Error al leer el catálogo desde Firebase", "error");
      }
    );

    RosaState.db.collection("categorias").onSnapshot((snapshot) => {
      RosaState.categorias = snapshot.docs.map((doc) => doc.data().nombre).sort((a, b) => a.localeCompare(b));
      actualizarDatalistCategorias();
    });

    RosaState.db.collection("listas").onSnapshot((snapshot) => {
      RosaState.listas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const pantallaActiva = document.querySelector('.screen[data-screen="listas"]')?.classList.contains("active");
      if (pantallaActiva) renderListaDeListas(document.getElementById("buscar-listas").value);

      const badge = document.getElementById("badge-tab-listas");
      const pendientes = RosaState.listas.filter((l) => l.estado !== "convertida").length;
      if (badge) {
        badge.textContent = pendientes > 99 ? "99+" : String(pendientes);
        badge.classList.toggle("hidden", pendientes === 0);
      }
    });

    RosaState.db.collection("cuentas").onSnapshot((snapshot) => {
      RosaState.cuentas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    });
  } catch (err) {
    console.error(err);
    actualizarEstadoConexion(false);
    mostrarToast("No se pudo inicializar Firebase. Revisa config.js", "error");
  }
}
