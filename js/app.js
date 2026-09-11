/* ==========================================================================
   APP.JS
   Selector de temas pastel (pestaña "Más"). "Neutro" es el que viene por
   defecto (no está pensado solo para un público, sirve para cualquiera);
   además hay 4 colores pastel para elegir. La elección se guarda en el
   celular donde se use la app (esto es un archivo real fuera de claude.ai,
   así que localStorage sí funciona aquí sin problema).
   ========================================================================== */

const CLAVE_TEMA = "rosita-tema";

function aplicarTema(nombreTema) {
  document.body.classList.remove("theme-rosa", "theme-azul", "theme-verde", "theme-amarillo");
  if (nombreTema && nombreTema !== "neutro") {
    document.body.classList.add(`theme-${nombreTema}`);
  }
  document.querySelectorAll(".theme-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === nombreTema);
  });
  try {
    localStorage.setItem(CLAVE_TEMA, nombreTema);
  } catch (e) {
    /* si el navegador bloquea localStorage, el tema simplemente no se recuerda */
  }
}

function initTemas() {
  let temaGuardado = "neutro";
  try {
    temaGuardado = localStorage.getItem(CLAVE_TEMA) || "neutro";
  } catch (e) {
    /* sin acceso a localStorage: se usa el tema neutro por defecto */
  }
  aplicarTema(temaGuardado);

  document.querySelectorAll(".theme-option").forEach((btn) => {
    btn.addEventListener("click", () => aplicarTema(btn.dataset.theme));
  });
}
