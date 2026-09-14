/* ==========================================================================
   PIN.JS
   Candado de 4 dígitos reutilizable. Se usa en Inventario y en Cuentas,
   cada una con su propia clave (ver js/config.js). No es un login de
   verdad —la clave vive en el propio código— pero evita que alguien
   entre por accidente o sin permiso a ver el stock o las deudas.

   A propósito NO se recuerda nunca: si sales de la página (cambias de
   pestaña, minimizas el navegador, mandas la app al fondo) y vuelves,
   se vuelve a pedir el PIN desde cero.
   ========================================================================== */

let pinObjetivo = "";
let pinIngresado = "";
let pinDesbloqueadoAhora = false;

/**
 * Bloquea la página hasta que se ingrese el PIN correcto.
 * nombreSeccion: solo para el texto en pantalla (ej. "Inventario").
 * pin: la clave de 4 dígitos correcta, desde config.js.
 */
function protegerConPin(nombreSeccion, pin) {
  pinObjetivo = String(pin || "1234");

  const overlay = document.getElementById("pin-overlay");
  if (!overlay) return; // esta página no tiene candado en su HTML

  mostrarCandadoPin();

  overlay.querySelectorAll("[data-pin-tecla]").forEach((btn) => {
    btn.addEventListener("click", () => onTeclaPin(btn.dataset.pinTecla));
  });

  // Si el usuario sale de la app (cambia de pestaña, minimiza, la manda al
  // fondo) y luego vuelve, se bloquea de nuevo — nunca queda "recordado".
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && pinDesbloqueadoAhora) {
      pinDesbloqueadoAhora = false;
      mostrarCandadoPin();
    }
  });
}

function mostrarCandadoPin() {
  const overlay = document.getElementById("pin-overlay");
  if (!overlay) return;
  overlay.classList.remove("pin-correcto", "pin-oculto");
  document.getElementById("pin-error").classList.add("hidden");
  pinIngresado = "";
  actualizarPuntosPin();
}

function onTeclaPin(tecla) {
  const overlay = document.getElementById("pin-overlay");
  if (!overlay || overlay.classList.contains("pin-oculto")) return;

  if (tecla === "borrar") {
    pinIngresado = pinIngresado.slice(0, -1);
    actualizarPuntosPin();
    return;
  }

  if (pinIngresado.length >= 4) return;
  pinIngresado += tecla;
  actualizarPuntosPin();

  if (pinIngresado.length === 4) {
    setTimeout(() => verificarPin(), 120);
  }
}

function actualizarPuntosPin() {
  document.querySelectorAll("#pin-overlay .pin-dot").forEach((dot, i) => {
    dot.classList.toggle("lleno", i < pinIngresado.length);
  });
}

function verificarPin() {
  const overlay = document.getElementById("pin-overlay");
  if (pinIngresado === pinObjetivo) {
    pinDesbloqueadoAhora = true;
    overlay.classList.add("pin-correcto");
    setTimeout(() => overlay.classList.add("pin-oculto"), 260);
  } else {
    const teclado = overlay.querySelector(".pin-panel");
    teclado.classList.remove("pin-shake");
    // Fuerza el reinicio de la animación aunque se repita el error seguido
    void teclado.offsetWidth;
    teclado.classList.add("pin-shake");
    document.getElementById("pin-error").classList.remove("hidden");
    pinIngresado = "";
    setTimeout(() => actualizarPuntosPin(), 180);
  }
}
