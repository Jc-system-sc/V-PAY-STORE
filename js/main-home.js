/* ==========================================================================
   MAIN-HOME.JS
   Arranca la página de Inicio. Ya no es solo un menú: cada acceso muestra
   una insignia con datos reales (bajo stock, deudas, pedidos de clientes
   esperando), para que Inicio funcione como un panel de un vistazo, no
   solo como una lista de accesos.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.title = NEGOCIO.nombre;
  document.getElementById("texto-titular-yape").textContent = NEGOCIO.propietaria;
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
        actualizarBadge("badge-home-inventario", productosStockBajo().length);
      },
      () => {}
    );

    RosaState.db.collection("cuentas").onSnapshot((snapshot) => {
      const cuentas = snapshot.docs.map((doc) => doc.data());
      const conDeuda = cuentas.filter((c) => (c.saldo || 0) > 0).length;
      actualizarBadge("badge-home-cuentas", conDeuda);
    });

    RosaState.db
      .collection("listas")
      .where("estado", "==", "pendiente")
      .onSnapshot((snapshot) => {
        actualizarBadge("badge-home-ventas", snapshot.size);
      });
  } catch (err) {
    console.error(err);
  }
}

function actualizarBadge(id, cantidad) {
  const badge = document.getElementById(id);
  if (!badge) return;
  if (cantidad > 0) {
    badge.textContent = cantidad > 99 ? "99+" : String(cantidad);
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}
