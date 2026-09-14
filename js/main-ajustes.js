/* ==========================================================================
   MAIN-AJUSTES.JS
   Arranca la página de Ajustes: resumen general, apariencia, información
   del sistema y ayuda. Conecta Firebase para mostrar contadores en vivo
   de todas las secciones (productos, listas, cuentas y cervezas).
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.title = `Ajustes · ${NEGOCIO.nombre}`;
  document.getElementById("info-creador").textContent = NEGOCIO.creador;

  initUI();
  initTemas();
  initMas();

  conectarFirebaseAjustes();
});

function conectarFirebaseAjustes() {
  const configSinCompletar =
    !firebaseConfig.apiKey || firebaseConfig.apiKey === "TU_API_KEY" || !firebaseConfig.projectId;

  if (configSinCompletar) {
    actualizarEstadoConexion(false);
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    RosaState.db = firebase.firestore();

    RosaState.db.collection("productos").onSnapshot((snapshot) => {
      RosaState.productos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      RosaState.firebaseListo = true;
      actualizarEstadoConexion(true);
      actualizarResumenGeneral();
    });
    RosaState.db.collection("categorias").onSnapshot((snapshot) => {
      RosaState.categorias = snapshot.docs.map((doc) => doc.data().nombre);
      actualizarInfoSistema();
    });
    RosaState.db.collection("listas").onSnapshot((snapshot) => {
      RosaState.listas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      actualizarInfoSistema();
      actualizarResumenGeneral();
    });
    RosaState.db.collection("cuentas").onSnapshot((snapshot) => {
      RosaState.cuentas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      actualizarInfoSistema();
      actualizarResumenGeneral();
    });
    RosaState.db.collection("cuentasCerveza").onSnapshot((snapshot) => {
      RosaState.cuentasCerveza = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      actualizarInfoSistema();
      actualizarResumenGeneral();
    });
  } catch (err) {
    console.error(err);
    actualizarEstadoConexion(false);
  }
}
