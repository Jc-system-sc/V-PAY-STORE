/* ==========================================================================
   MAIN-CUENTAS.JS
   Arranca la página de Cuentas (fiado). Conecta Firebase y sincroniza
   solo la colección de cuentas.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.title = `Cuentas · ${NEGOCIO.nombre}`;

  initUI();
  initTemas();
  initCuentas();

  window.alCambiarPantalla = (pantalla) => {
    if (pantalla === "cuentas") renderListaCuentas(document.getElementById("buscar-cuentas").value);
    if (pantalla === "resumen") renderResumenCuentas();
  };

  conectarFirebaseCuentas();
});

function conectarFirebaseCuentas() {
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

    RosaState.db.collection("cuentas").onSnapshot(
      (snapshot) => {
        RosaState.cuentas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        RosaState.firebaseListo = true;
        actualizarEstadoConexion(true);

        const activa = document.querySelector(".screen.active")?.dataset.screen;
        if (activa === "cuentas") renderListaCuentas(document.getElementById("buscar-cuentas").value);
        if (activa === "resumen") renderResumenCuentas();
        if (document.getElementById("modal-cuenta-detalle").classList.contains("open")) renderDetalleCuenta();
      },
      (err) => {
        console.error(err);
        actualizarEstadoConexion(false);
        mostrarToast("Error al leer las cuentas desde Firebase", "error");
      }
    );
  } catch (err) {
    console.error(err);
    actualizarEstadoConexion(false);
    mostrarToast("No se pudo inicializar Firebase. Revisa config.js", "error");
  }
}
