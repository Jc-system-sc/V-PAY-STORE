/* ==========================================================================
   MAIN-PEDIDOS.JS
   Arranca el catálogo para clientes. Sin PIN (es de acceso libre, para que
   cualquier cliente pueda usarlo) y sin acceso a nada del resto del
   sistema — solo lee el catálogo (productos y categorías) y, al enviar el
   pedido, escribe una nueva "lista" pendiente para que la dueña la vea.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.title = `Catálogo · ${NEGOCIO.nombre}`;

  initUI();
  initTemas();
  initPedidos();

  conectarFirebasePedidos();
});

function conectarFirebasePedidos() {
  const configSinCompletar =
    !firebaseConfig.apiKey || firebaseConfig.apiKey === "TU_API_KEY" || !firebaseConfig.projectId;

  if (configSinCompletar) {
    mostrarToast("El catálogo no está disponible todavía", "error");
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    RosaState.db = firebase.firestore();

    RosaState.db.collection("productos").onSnapshot(
      (snapshot) => {
        RosaState.productos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        RosaState.firebaseListo = true;
        renderGridProductosCliente();
      },
      (err) => {
        console.error(err);
        mostrarToast("No se pudo cargar el catálogo", "error");
      }
    );

    RosaState.db.collection("categorias").onSnapshot((snapshot) => {
      RosaState.categorias = snapshot.docs.map((doc) => doc.data().nombre).sort((a, b) => a.localeCompare(b));
      renderChipsCategoriaPedido();
    });
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo conectar el catálogo", "error");
  }
}
