/* ==========================================================================
   MAIN-INVENTARIO.JS
   Arranca la página de Inventario (Categorías · Movimientos · Alertas ·
   Registrar). Conecta Firebase y sincroniza productos, categorías y el
   historial de movimientos de stock.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.title = `Inventario · ${NEGOCIO.nombre}`;

  protegerConPin("inventario", NEGOCIO.pinInventario);

  initUI();
  initTemas();
  initEscanerGenerico();
  initCatalogo();
  initInventario();

  window.alCambiarPantalla = (pantalla) => {
    if (pantalla === "categorias") renderGridCategorias();
    if (pantalla === "categoria-detalle") renderProductosDeCategoria();
    if (pantalla === "movimientos") renderMovimientosInventario();
    if (pantalla === "alertas") renderAlertasStockBajo();
  };

  // Si se entra con el link "#alertas" (ej. desde el resumen de Ajustes),
  // salta directo a esa pestaña en vez de abrir siempre en Categorías.
  if (location.hash === "#alertas") cambiarPantalla("alertas");

  conectarFirebaseInventario();
});

function conectarFirebaseInventario() {
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
        refrescarPantallaActivaDeInventario();
        actualizarBadgesInventario();
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
      refrescarPantallaActivaDeInventario();
    });

    RosaState.db
      .collection("movimientosInventario")
      .orderBy("fecha", "desc")
      .limit(400)
      .onSnapshot((snapshot) => {
        RosaState.movimientosInventario = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        if (document.querySelector('.screen[data-screen="movimientos"]')?.classList.contains("active")) {
          renderMovimientosInventario();
        }
      });
  } catch (err) {
    console.error(err);
    actualizarEstadoConexion(false);
    mostrarToast("No se pudo inicializar Firebase. Revisa config.js", "error");
  }
}

/** Refresca la grilla de categorías, el detalle de categoría o las alertas, según cuál esté abierta */
function refrescarPantallaActivaDeInventario() {
  const activa = document.querySelector(".screen.active")?.dataset.screen;
  if (activa === "categorias") renderGridCategorias();
  if (activa === "categoria-detalle") renderProductosDeCategoria();
  if (activa === "alertas") renderAlertasStockBajo();
}
