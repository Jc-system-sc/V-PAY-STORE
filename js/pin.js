/* ==========================================================================
   PIN.JS
   Candado de 4 dígitos, compartido por Ventas, Inventario, Cuentas y
   Ajustes — todo lo que un cliente no debería poder abrir (ver
   js/config.js, campo NEGOCIO.pin). "Pedidos" es la única página sin
   clave, porque es la que usan los clientes.

   Una vez ingresada la clave correcta, queda desbloqueada para el resto
   de esa pestaña del navegador (no hay que repetirla en cada página
   mientras trabajas), pero se vuelve a pedir si cierras el navegador o
   abres una pestaña nueva.
   ========================================================================== */

const PIN_SESSION_KEY = "admin_desbloqueado";
const PIN_CIRCUNFERENCIA = 207.3; // 2 * PI * 33 (radio del anillo)

let pinObjetivo = "";
let pinIngresado = "";

function protegerConPin(pin) {
  pinObjetivo = String(pin || "1234");

  const overlay = document.getElementById("pin-overlay");
  if (!overlay) return; // esta página no tiene candado en su HTML

  if (sessionStorage.getItem(PIN_SESSION_KEY) === "1") {
    overlay.classList.add("pin-oculto");
    return;
  }

  mostrarCandadoPin();

  overlay.querySelectorAll("[data-pin-tecla]").forEach((btn) => {
    btn.addEventListener("click", () => onTeclaPin(btn.dataset.pinTecla));
  });
}

function mostrarCandadoPin() {
  const overlay = document.getElementById("pin-overlay");
  if (!overlay) return;
  overlay.classList.remove("pin-correcto", "pin-oculto");
  document.getElementById("pin-error").classList.add("hidden");
  pinIngresado = "";
  actualizarAnilloPin();
}

function onTeclaPin(tecla) {
  const overlay = document.getElementById("pin-overlay");
  if (!overlay || overlay.classList.contains("pin-oculto")) return;

  if (tecla === "borrar") {
    pinIngresado = pinIngresado.slice(0, -1);
    actualizarAnilloPin();
    return;
  }

  if (pinIngresado.length >= 4) return;
  pinIngresado += tecla;
  actualizarAnilloPin();

  if (pinIngresado.length === 4) {
    setTimeout(() => verificarPin(), 150);
  }
}

/** Llena el anillo alrededor del candado y los puntitos, según cuántos dígitos van */
function actualizarAnilloPin() {
  const anillo = document.querySelector("#pin-overlay .pin-ring-fill");
  if (anillo) {
    const avance = pinIngresado.length / 4;
    anillo.style.strokeDashoffset = String(PIN_CIRCUNFERENCIA * (1 - avance));
  }
  document.querySelectorAll("#pin-overlay .pin-dot").forEach((dot, i) => {
    dot.classList.toggle("lleno", i < pinIngresado.length);
  });
}

function verificarPin() {
  const overlay = document.getElementById("pin-overlay");
  if (pinIngresado === pinObjetivo) {
    sessionStorage.setItem(PIN_SESSION_KEY, "1");
    overlay.classList.add("pin-correcto");
    if (navigator.vibrate) navigator.vibrate(35);
    setTimeout(() => overlay.classList.add("pin-oculto"), 480);
  } else {
    const teclado = overlay.querySelector(".pin-panel");
    overlay.classList.add("pin-error-flash");
    teclado.classList.remove("pin-shake");
    void teclado.offsetWidth; // reinicia la animación aunque se repita el error seguido
    teclado.classList.add("pin-shake");
    document.getElementById("pin-error").classList.remove("hidden");
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
    pinIngresado = "";
    setTimeout(() => {
      actualizarAnilloPin();
      overlay.classList.remove("pin-error-flash");
    }, 420);
  }
}
