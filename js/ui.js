/* ==========================================================================
   UI.JS
   Utilidades compartidas por todas las páginas: abrir/cerrar modales, y
   cambiar de pestaña dentro de una página (cuando esa página tiene tab-bar
   propio, como Ventas o Inventario). No sabe nada de ninguna página en
   particular — cada página define, si quiere, un "window.alCambiarPantalla"
   para reaccionar cuando el usuario cambia de pestaña.
   ========================================================================== */

function abrirModal(id) {
  document.getElementById(id).classList.add("open");
}
function cerrarModal(id) {
  document.getElementById(id).classList.remove("open");
}

function cambiarPantalla(pantalla) {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.toggle("active", el.dataset.screen === pantalla);
  });

  // El tab activo puede ser distinto de la pantalla activa (ej: al entrar al
  // detalle de una categoría, la pestaña "Categorías" se mantiene resaltada).
  const pantallaEl = document.querySelector(`.screen[data-screen="${pantalla}"]`);
  const tabQueDebeQuedarActivo = (pantallaEl && pantallaEl.dataset.tabPadre) || pantalla;

  const tabbar = document.querySelector(".tab-bar[data-tabbar]");
  if (tabbar) {
    let btnActivo = null;
    tabbar.querySelectorAll(".tab-btn").forEach((btn) => {
      const activo = btn.dataset.tab === tabQueDebeQuedarActivo;
      btn.classList.toggle("active", activo);
      if (activo) btnActivo = btn;
    });
    moverIndicadorPestana(tabbar, btnActivo);
  }

  if (typeof window.alCambiarPantalla === "function") window.alCambiarPantalla(pantalla);
}

function moverIndicadorPestana(tabbarEl, btn) {
  const indicador = tabbarEl.querySelector(".tab-indicator");
  if (!btn || !indicador) return;
  indicador.style.width = `${btn.offsetWidth - 10}px`;
  indicador.style.transform = `translateX(${btn.offsetLeft + 5}px)`;
}

function initUI() {
  document.querySelectorAll(".tab-bar[data-tabbar] .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => cambiarPantalla(btn.dataset.tab));
  });

  const btnGuia = document.getElementById("btn-guia");
  if (btnGuia) btnGuia.addEventListener("click", () => abrirModal("modal-guia"));
  const cerrarGuia = document.getElementById("cerrar-guia");
  if (cerrarGuia) cerrarGuia.addEventListener("click", () => cerrarModal("modal-guia"));

  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.classList.remove("open");
    });
  });

  // Posiciona el indicador de pestaña una vez que todo tiene su tamaño real.
  requestAnimationFrame(() => {
    const tabbar = document.querySelector(".tab-bar[data-tabbar]");
    if (tabbar) moverIndicadorPestana(tabbar, tabbar.querySelector(".tab-btn.active"));
  });
}
