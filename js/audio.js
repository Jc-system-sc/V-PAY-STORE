/* ==========================================================================
   AUDIO.JS
   Genera pequeños sonidos con la Web Audio API (no requiere archivos .mp3).
   ========================================================================== */

const RosaAudio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone({ freq = 880, duration = 0.09, type = "sine", volume = 0.18, delay = 0 }) {
    try {
      const audioCtx = getCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const start = audioCtx.currentTime + delay;
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch (e) {
      console.warn("Audio no disponible:", e);
    }
  }

  return {
    /** Beep corto y agudo al leer un código de barras con éxito */
    beepEscaneo() {
      tone({ freq: 1200, duration: 0.07, type: "sine", volume: 0.2 });
    },
    /** Doble tono grave cuando el código escaneado no existe en el catálogo */
    beepNoEncontrado() {
      tone({ freq: 320, duration: 0.12, type: "square", volume: 0.15 });
      tone({ freq: 250, duration: 0.14, type: "square", volume: 0.15, delay: 0.13 });
    },
    /** "Pop" suave al agregar un producto manualmente o por voz */
    popAgregado() {
      tone({ freq: 700, duration: 0.06, type: "sine", volume: 0.16 });
      tone({ freq: 980, duration: 0.08, type: "sine", volume: 0.14, delay: 0.05 });
    },
    /** Tono breve cuando empieza a escuchar el micrófono */
    beepEscuchando() {
      tone({ freq: 1500, duration: 0.05, type: "sine", volume: 0.12 });
    },
    /** Melodía de confirmación al generar la boleta */
    beepConfirmacion() {
      tone({ freq: 880, duration: 0.09, volume: 0.2 });
      tone({ freq: 1175, duration: 0.14, volume: 0.2, delay: 0.1 });
    },
    /** Campanita al convertir una lista en venta */
    beepConvertir() {
      tone({ freq: 660, duration: 0.08, volume: 0.18 });
      tone({ freq: 880, duration: 0.08, volume: 0.18, delay: 0.09 });
      tone({ freq: 1100, duration: 0.16, volume: 0.2, delay: 0.18 });
    }
  };
})();
