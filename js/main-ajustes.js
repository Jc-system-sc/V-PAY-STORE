/* ==========================================================================
   MAIN-AJUSTES.JS
   Arranca la página de Ajustes: apariencia, información general del
   sistema y ayuda. Conecta Firebase solo para mostrar contadores.
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
    });
    RosaState.db.collection("categorias").onSnapshot((snapshot) => {
      RosaState.categorias = snapshot.docs.map((doc) => doc.data().nombre);
      actualizarInfoSistema();
    });
    RosaState.db.collection("listas").onSnapshot((snapshot) => {
      RosaState.listas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      actualizarInfoSistema();
    });
    RosaState.db.collection("cuentas").onSnapshot((snapshot) => {
      RosaState.cuentas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      actualizarInfoSistema();
    });
  } catch (err) {
    console.error(err);
    actualizarEstadoConexion(false);
  }
}
