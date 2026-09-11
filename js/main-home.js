/* ==========================================================================
   MAIN-HOME.JS
   Arranca la página de Inicio. Es la página más simple: solo necesita
   saber si hay productos con bajo stock, para mostrar el avisito sobre
   el acceso a "Inventario".
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.title = NEGOCIO.nombre;
  initTemas();
  conectarFirebaseHome();
});

function conectarFirebaseHome() {
  const configSinCompletar =
    !firebaseConfig.apiKey || firebaseConfig.apiKey === "TU_API_KEY" || !firebaseConfig.projectId;
  if (configSinCompletar) return; // en Inicio no molestamos con el aviso; ya se ve en cada sección

  try {
    firebase.initializeApp(firebaseConfig);
    RosaState.db = firebase.firestore();
    RosaState.db.collection("productos").onSnapshot(
      (snapshot) => {
        RosaState.productos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        RosaState.firebaseListo = true;
        const badge = document.getElementById("badge-home-inventario");
        if (!badge) return;
        const n = productosStockBajo().length;
        if (n > 0) {
          badge.textContent = n > 99 ? "99+" : String(n);
          badge.classList.remove("hidden");
        } else {
          badge.classList.add("hidden");
        }
      },
      () => {}
    );
  } catch (err) {
    console.error(err);
  }
}
