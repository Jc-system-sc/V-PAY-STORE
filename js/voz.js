/* ==========================================================================
   VOZ.JS
   Búsqueda de productos por voz, reutilizable en "Vender" y en "Listas".
   Usa la Web Speech API del propio navegador (sin librerías externas).
   No todos los navegadores la soportan (funciona bien en Chrome/Android;
   en iPhone/Safari puede no estar disponible) — si no existe, el botón
   de micrófono simplemente se queda oculto, sin romper nada más.
   ========================================================================== */

function initBusquedaVoz(inputId, btnId, alReconocer) {
  const btn = document.getElementById(btnId);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    btn.classList.add("hidden");
    return;
  }
  btn.classList.remove("hidden");

  const reconocedor = new Recognition();
  reconocedor.lang = "es-PE";
  reconocedor.interimResults = false;
  reconocedor.maxAlternatives = 1;

  let escuchando = false;

  btn.addEventListener("click", () => {
    if (escuchando) return;
    try {
      RosaAudio.beepEscuchando();
      reconocedor.start();
    } catch (e) {
      /* ya había una sesión en curso: se ignora */
    }
  });

  reconocedor.onstart = () => {
    escuchando = true;
    btn.classList.add("escuchando");
  };

  reconocedor.onend = () => {
    escuchando = false;
    btn.classList.remove("escuchando");
  };

  reconocedor.onerror = (e) => {
    escuchando = false;
    btn.classList.remove("escuchando");
    if (e.error !== "no-speech" && e.error !== "aborted") {
      mostrarToast("No se pudo usar el micrófono", "error");
    }
  };

  reconocedor.onresult = (e) => {
    const texto = e.results[0][0].transcript;
    const input = document.getElementById(inputId);
    input.value = texto;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (typeof alReconocer === "function") alReconocer(texto);
  };
}
