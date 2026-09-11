/* ==========================================================================
   RESUMEN.JS
   Pestaña "Resumen" dentro de Ventas: total del día, cierre de caja,
   más vendidos y clientes frecuentes. Se recarga cada vez que el usuario
   entra a esta pestaña (ver ui.js -> ejecutarHookDeEntrada).
   ========================================================================== */

let totalVentasHoyCache = 0;

function initResumen() {
  document.getElementById("input-efectivo-contado").addEventListener("input", actualizarDiferenciaCaja);
}

async function cargarResumenDelDia() {
  const statVentas = document.getElementById("stat-ventas-hoy");
  const statIngresos = document.getElementById("stat-ingresos-hoy");
  const cierreTotalEl = document.getElementById("cierre-total-sistema");

  if (!RosaState.firebaseListo) {
    statVentas.textContent = "0";
    statIngresos.textContent = formatoMoneda(0);
    cierreTotalEl.textContent = formatoMoneda(0);
    totalVentasHoyCache = 0;
    actualizarDiferenciaCaja();
    return;
  }

  try {
    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);
    const desde = firebase.firestore.Timestamp.fromDate(inicioDelDia);

    const snapshot = await RosaState.db.collection("ventas").where("fecha", ">=", desde).get();
    let totalIngresos = 0;
    let totalPagadas = 0;
    snapshot.forEach((doc) => {
      const venta = doc.data();
      totalIngresos += venta.total || 0;
      if (venta.estado !== "fiado") totalPagadas += venta.total || 0;
    });

    statVentas.textContent = snapshot.size;
    statIngresos.textContent = formatoMoneda(totalIngresos);
    cierreTotalEl.textContent = formatoMoneda(totalPagadas);
    totalVentasHoyCache = totalPagadas;
    actualizarDiferenciaCaja();
  } catch (err) {
    console.error(err);
    statVentas.textContent = "—";
    statIngresos.textContent = "—";
  }
}

/* ---------------------- Cierre de caja ---------------------- */

function actualizarDiferenciaCaja() {
  const inputEfectivo = document.getElementById("input-efectivo-contado");
  const fila = document.getElementById("fila-diferencia-caja");
  const span = document.getElementById("cierre-diferencia");
  const valor = parseFloat(inputEfectivo.value);

  if (isNaN(valor)) {
    fila.classList.add("hidden");
    return;
  }
  fila.classList.remove("hidden");
  const diferencia = valor - totalVentasHoyCache;
  span.textContent = (diferencia >= 0 ? "+" : "−") + formatoMoneda(Math.abs(diferencia));
  span.style.color = diferencia === 0 ? "var(--ink)" : diferencia > 0 ? "var(--price)" : "var(--coral)";
}

/* ---------------------- Últimas ventas ---------------------- */

async function cargarUltimasVentas() {
  const cont = document.getElementById("lista-ultimas-ventas");

  if (!RosaState.firebaseListo) {
    cont.innerHTML = mensajeVacio("Conecta Firebase para ver tu historial.", "circle");
    return;
  }

  try {
    const snapshot = await RosaState.db.collection("ventas").orderBy("fecha", "desc").limit(5).get();

    if (snapshot.empty) {
      cont.innerHTML = mensajeVacio("Todavía no registras ventas confirmadas.", "circle");
      return;
    }

    cont.innerHTML = snapshot.docs
      .map((doc) => {
        const venta = doc.data();
        const esFiado = venta.estado === "fiado";
        return `
          <div class="list-row">
            <div class="list-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
            </div>
            <div class="list-info">
              <div class="list-name">${escaparHTML(venta.cliente || "Cliente")}</div>
              <div class="list-meta">${formatoFechaHora(venta.fecha)} ${esFiado ? '<span class="pill pill-amber">Fiado</span>' : ""}</div>
            </div>
            <div class="pill pill-green">${formatoMoneda(venta.total)}</div>
          </div>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    cont.innerHTML = mensajeVacio("No se pudo cargar el historial.", "circle");
  }
}

/* ---------------------- Más vendidos (últimos 30 días) ---------------------- */

async function cargarTopProductos() {
  const cont = document.getElementById("lista-top-productos");
  if (!RosaState.firebaseListo) {
    cont.innerHTML = mensajeVacio("Conecta Firebase para ver el ranking.", "chart");
    return;
  }
  try {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    const desde = firebase.firestore.Timestamp.fromDate(hace30Dias);

    const snapshot = await RosaState.db.collection("ventas").where("fecha", ">=", desde).get();
    const conteo = {};
    snapshot.forEach((doc) => {
      const venta = doc.data();
      (venta.items || []).forEach((i) => {
        conteo[i.nombre] = (conteo[i.nombre] || 0) + i.cantidad;
      });
    });

    const ranking = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (ranking.length === 0) {
      cont.innerHTML = mensajeVacio("Todavía no hay ventas suficientes.", "chart");
      return;
    }

    cont.innerHTML = ranking
      .map(
        ([nombre, cantidad], idx) => `
        <div class="list-row">
          <div class="rank-badge">${idx + 1}</div>
          <div class="list-info">
            <div class="list-name">${escaparHTML(nombre)}</div>
            <div class="list-meta">${cantidad} vendido${cantidad === 1 ? "" : "s"}</div>
          </div>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    cont.innerHTML = mensajeVacio("No se pudo cargar el ranking.", "chart");
  }
}

/* ---------------------- Clientes frecuentes ---------------------- */

async function cargarClientesFrecuentes() {
  const cont = document.getElementById("lista-clientes-frecuentes");
  if (!RosaState.firebaseListo) {
    cont.innerHTML = mensajeVacio("Conecta Firebase para ver esto.", "circle");
    return;
  }
  try {
    const snapshot = await RosaState.db.collection("ventas").orderBy("fecha", "desc").limit(200).get();
    const clientes = {};
    snapshot.forEach((doc) => {
      const venta = doc.data();
      const nombre = venta.cliente || "Cliente";
      if (!clientes[nombre]) clientes[nombre] = { total: 0, compras: 0 };
      clientes[nombre].total += venta.total || 0;
      clientes[nombre].compras += 1;
    });

    const ranking = Object.entries(clientes)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

    if (ranking.length === 0) {
      cont.innerHTML = mensajeVacio("Todavía no hay clientes registrados.", "circle");
      return;
    }

    cont.innerHTML = ranking
      .map(
        ([nombre, datos], idx) => `
        <div class="list-row">
          <div class="rank-badge">${idx + 1}</div>
          <div class="list-info">
            <div class="list-name">${escaparHTML(nombre)}</div>
            <div class="list-meta">${datos.compras} compra${datos.compras === 1 ? "" : "s"}</div>
          </div>
          <div class="pill pill-green">${formatoMoneda(datos.total)}</div>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    cont.innerHTML = mensajeVacio("No se pudo cargar la lista.", "circle");
  }
}
