/* ==========================================================================
   MAIN-CERVEZAS.JS
   Arranca la página de Cervezas. Conecta Firebase y sincroniza solo la
   colección de cuentas de cerveza.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.title = `Cervezas · ${NEGOCIO.nombre}`;

  protegerConPin("cervezas", NEGOCIO.pinCervezas);

  initUI();
  initTemas();
  initCervezas();

  window.alCambiarPantalla = (pantalla) => {
    if (pantalla === "cuentas") renderListaCuentasCerveza(document.getElementById("buscar-cervezas").value);
    if (pantalla === "resumen") renderResumenCervezas();
  };

  conectarFirebaseCervezas();
});

function conectarFirebaseCervezas() {
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

    RosaState.db.collection("cuentasCerveza").onSnapshot(
      (snapshot) => {
        RosaState.cuentasCerveza = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        RosaState.firebaseListo = true;
        actualizarEstadoConexion(true);

        const activa = document.querySelector(".screen.active")?.dataset.screen;
        if (activa === "cuentas") renderListaCuentasCerveza(document.getElementById("buscar-cervezas").value);
        if (activa === "resumen") renderResumenCervezas();
        if (document.getElementById("modal-cerveza-detalle").classList.contains("open")) renderDetalleCuentaCerveza();
      },
      (err) => {
        console.error(err);
        actualizarEstadoConexion(false);
        mostrarToast("Error al leer las cuentas de cerveza desde Firebase", "error");
      }
    );
  } catch (err) {
    console.error(err);
    actualizarEstadoConexion(false);
    mostrarToast("No se pudo inicializar Firebase. Revisa config.js", "error");
  }
}
