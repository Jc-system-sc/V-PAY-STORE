/* ==========================================================================
   CERVEZAS.JS
   Cuentas de cerveza por cajas/docenas: un cliente pide, por ejemplo, 12
   unidades, pero se las lleva de a poco (3 hoy, 3 la próxima vez...) y
   paga por su cuenta -a veces todo, a veces una parte, a veces nada
   todavía-. Por eso cada cuenta lleva DOS números completamente
   independientes:
     - cuántas cervezas le faltan por llevarse (no tiene que ver con la plata)
     - cuánto dinero le falta pagar (no tiene que ver con las cervezas)
   ========================================================================== */

let cervezaDetalleId = null;
let movCervezaTipo = "entrega"; // "entrega" | "pago"

function initCervezas() {
  document.getElementById("buscar-cervezas").addEventListener("input", (e) => renderListaCuentasCerveza(e.target.value));

  document.getElementById("btn-nuevo-pedido-cerveza").addEventListener("click", abrirModalNuevoPedido);
  document.getElementById("cerrar-pedido-cerveza").addEventListener("click", () => cerrarModal("modal-pedido-cerveza"));

  ["pedido-cerveza-cantidad", "pedido-cerveza-precio"].forEach((id) => {
    document.getElementById(id).addEventListener("input", actualizarTotalPedidoCerveza);
  });

  document.getElementById("form-pedido-cerveza").addEventListener("submit", async (e) => {
    e.preventDefault();
    await registrarNuevoPedido();
  });

  document.getElementById("cerrar-cerveza-detalle").addEventListener("click", () => cerrarModal("modal-cerveza-detalle"));
  document.getElementById("btn-entrega-cerveza").addEventListener("click", () => abrirModalMovCerveza("entrega"));
  document.getElementById("btn-pago-cerveza").addEventListener("click", () => abrirModalMovCerveza("pago"));
  document.getElementById("btn-pdf-cerveza").addEventListener("click", () => {
    const cuenta = RosaState.cuentasCerveza.find((c) => c.id === cervezaDetalleId);
    if (cuenta) descargarPDFCuentaCerveza(cuenta);
  });
  document.getElementById("btn-eliminar-cerveza").addEventListener("click", eliminarCuentaCervezaActual);

  initModalMovCerveza();
}

/* ---------------------- Lista de cuentas ---------------------- */

function renderListaCuentasCerveza(query) {
  const cont = document.getElementById("lista-cuentas-cerveza");
  const q = (query || "").trim().toLowerCase();

  const filtradas = RosaState.cuentasCerveza
    .filter((c) => !q || c.cliente.toLowerCase().includes(q))
    .sort((a, b) => (b.saldoDinero || 0) - (a.saldoDinero || 0) || a.cliente.localeCompare(b.cliente));

  if (filtradas.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 8h9v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8Z"/><path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/><path d="M8 8V5a2 2 0 0 1 2-2h1"/></svg>
        <div>${q ? "No hay cuentas con ese nombre." : "Todavía no tienes cuentas de cerveza abiertas."}</div>
      </div>`;
    return;
  }

  cont.innerHTML = filtradas
    .map((c) => {
      const pendientes = Math.max(0, (c.cervezasPedidas || 0) - (c.cervezasEntregadas || 0));
      const alDia = !c.saldoDinero || c.saldoDinero <= 0;
      return `
      <div class="lista-card" data-id="${c.id}" style="cursor:pointer">
        <div class="lista-card-icon">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8h9v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8Z"/><path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/><path d="M8 8V5a2 2 0 0 1 2-2h1"/></svg>
        </div>
        <div class="lista-card-info">
          <div class="lista-card-nombre">${escaparHTML(c.cliente)}</div>
          <div class="lista-card-meta">
            ${pendientes > 0 ? `${pendientes} cerveza${pendientes === 1 ? "" : "s"} pendiente${pendientes === 1 ? "" : "s"}` : "Sin cervezas pendientes"}
          </div>
        </div>
        <div class="lista-card-total" style="color:${alDia ? "var(--price)" : "var(--coral)"}">${alDia ? "Al día" : formatoMoneda(c.saldoDinero)}</div>
      </div>`;
    })
    .join("");

  cont.querySelectorAll(".lista-card").forEach((card) => {
    card.addEventListener("click", () => abrirDetalleCuentaCerveza(card.dataset.id));
  });
}

/* ---------------------- Nuevo pedido (abre la cuenta si no existía) ---------------------- */

function abrirModalNuevoPedido() {
  document.getElementById("form-pedido-cerveza").reset();
  document.getElementById("pedido-cerveza-total").textContent = formatoMoneda(0);
  abrirModal("modal-pedido-cerveza");
  setTimeout(() => document.getElementById("pedido-cerveza-nombre").focus(), 200);
}

function actualizarTotalPedidoCerveza() {
  const cantidad = parseInt(document.getElementById("pedido-cerveza-cantidad").value, 10) || 0;
  const precio = parseFloat(document.getElementById("pedido-cerveza-precio").value) || 0;
  document.getElementById("pedido-cerveza-total").textContent = formatoMoneda(cantidad * precio);

  // Los campos "se lleva ahora" y "paga ahora" no pueden superar el pedido.
  document.getElementById("pedido-cerveza-entrega-ahora").max = cantidad || "";
  document.getElementById("pedido-cerveza-pago-ahora").max = (cantidad * precio) || "";
}

async function registrarNuevoPedido() {
  const nombre = document.getElementById("pedido-cerveza-nombre").value.trim();
  const telefono = document.getElementById("pedido-cerveza-telefono").value.trim();
  const cantidad = parseInt(document.getElementById("pedido-cerveza-cantidad").value, 10);
  const precio = parseFloat(document.getElementById("pedido-cerveza-precio").value);
  let entregaAhora = parseInt(document.getElementById("pedido-cerveza-entrega-ahora").value, 10) || 0;
  let pagoAhora = parseFloat(document.getElementById("pedido-cerveza-pago-ahora").value) || 0;

  if (!nombre) {
    mostrarToast("Ingresa el nombre del cliente", "error");
    return;
  }
  if (!cantidad || cantidad <= 0 || isNaN(precio) || precio < 0) {
    mostrarToast("Completa la cantidad y el precio correctamente", "error");
    return;
  }
  if (!RosaState.firebaseListo) {
    mostrarToast("Firebase no está conectado todavía", "error");
    return;
  }

  const total = cantidad * precio;
  if (entregaAhora > cantidad) entregaAhora = cantidad;
  if (pagoAhora > total) pagoAhora = total;

  try {
    const cuentaId = await asegurarCuentaCerveza(nombre, telefono);
    if (!cuentaId) throw new Error("No se pudo crear la cuenta");

    const cuenta = RosaState.cuentasCerveza.find((c) => c.id === cuentaId);
    const movimientosPrevios = cuenta ? cuenta.movimientos || [] : [];
    const pedidasPrevias = cuenta ? cuenta.cervezasPedidas || 0 : 0;
    const entregadasPrevias = cuenta ? cuenta.cervezasEntregadas || 0 : 0;
    const saldoPrevio = cuenta ? cuenta.saldoDinero || 0 : 0;

    const nuevosMovimientos = [
      {
        id: generarIdLocal("mov"),
        tipo: "pedido",
        cantidad,
        precioUnitario: precio,
        monto: total,
        fecha: new Date().toISOString()
      }
    ];
    if (entregaAhora > 0) {
      nuevosMovimientos.push({ id: generarIdLocal("mov"), tipo: "entrega", cantidad: entregaAhora, fecha: new Date().toISOString() });
    }
    if (pagoAhora > 0) {
      nuevosMovimientos.push({ id: generarIdLocal("mov"), tipo: "pago", monto: pagoAhora, fecha: new Date().toISOString() });
    }

    await RosaState.db
      .collection("cuentasCerveza")
      .doc(cuentaId)
      .update({
        cervezasPedidas: pedidasPrevias + cantidad,
        cervezasEntregadas: entregadasPrevias + entregaAhora,
        saldoDinero: Math.max(0, saldoPrevio + total - pagoAhora),
        movimientos: [...movimientosPrevios, ...nuevosMovimientos],
        actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
      });

    mostrarToast("Pedido registrado");
    cerrarModal("modal-pedido-cerveza");
    abrirDetalleCuentaCerveza(cuentaId);
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo registrar el pedido", "error");
  }
}

/* ---------------------- Detalle de una cuenta ---------------------- */

function abrirDetalleCuentaCerveza(id) {
  cervezaDetalleId = id;
  renderDetalleCuentaCerveza();
  abrirModal("modal-cerveza-detalle");
}

function renderDetalleCuentaCerveza() {
  const cuenta = RosaState.cuentasCerveza.find((c) => c.id === cervezaDetalleId);
  if (!cuenta) {
    cerrarModal("modal-cerveza-detalle");
    return;
  }

  const pendientes = Math.max(0, (cuenta.cervezasPedidas || 0) - (cuenta.cervezasEntregadas || 0));

  document.getElementById("detalle-cerveza-nombre").textContent = cuenta.cliente;
  document.getElementById("detalle-cerveza-meta").textContent = cuenta.telefono || "Sin celular registrado";

  document.getElementById("detalle-cerveza-pendientes").textContent = pendientes;
  document.getElementById("detalle-cerveza-pedidas-sub").textContent = `de ${cuenta.cervezasPedidas || 0} pedidas en total`;

  document.getElementById("detalle-cerveza-saldo").textContent = formatoMoneda(cuenta.saldoDinero || 0);
  document.getElementById("detalle-cerveza-saldo").style.color = cuenta.saldoDinero > 0 ? "var(--coral)" : "var(--price)";

  document.getElementById("btn-entrega-cerveza").disabled = pendientes <= 0;
  document.getElementById("btn-eliminar-cerveza").classList.toggle("hidden", pendientes > 0 || (cuenta.saldoDinero || 0) > 0);

  const movimientos = [...(cuenta.movimientos || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const cont = document.getElementById("detalle-cerveza-movimientos");

  if (movimientos.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
        <div>Todavía no hay movimientos en esta cuenta.</div>
      </div>`;
    return;
  }

  cont.innerHTML = movimientos.map(filaMovimientoCerveza).join("");
}

function filaMovimientoCerveza(m) {
  if (m.tipo === "pedido") {
    return `
      <div class="list-row">
        <div class="list-icon" style="background:var(--amber-soft); color:var(--amber);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8h9v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8Z"/><path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/></svg>
        </div>
        <div class="list-info">
          <div class="list-name">Pedido de ${m.cantidad} cerveza${m.cantidad === 1 ? "" : "s"}</div>
          <div class="list-meta">${formatoFechaHora(m.fecha)} · ${formatoMoneda(m.precioUnitario)} c/u</div>
        </div>
        <div class="sale-item-total" style="color:var(--coral)">+${formatoMoneda(m.monto)}</div>
      </div>`;
  }
  if (m.tipo === "entrega") {
    return `
      <div class="list-row">
        <div class="list-icon" style="background:var(--sky-soft); color:var(--sky);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
        <div class="list-info">
          <div class="list-name">Se llevó ${m.cantidad} cerveza${m.cantidad === 1 ? "" : "s"}</div>
          <div class="list-meta">${formatoFechaHora(m.fecha)}</div>
        </div>
      </div>`;
  }
  // pago
  return `
    <div class="list-row">
      <div class="list-icon" style="background:var(--price-soft); color:var(--price);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>
      </div>
      <div class="list-info">
        <div class="list-name">Pago recibido</div>
        <div class="list-meta">${formatoFechaHora(m.fecha)}</div>
      </div>
      <div class="sale-item-total" style="color:var(--price)">−${formatoMoneda(m.monto)}</div>
    </div>`;
}

async function eliminarCuentaCervezaActual() {
  if (!cervezaDetalleId) return;
  const cuenta = RosaState.cuentasCerveza.find((c) => c.id === cervezaDetalleId);
  if (!cuenta) return;
  const pendientes = Math.max(0, (cuenta.cervezasPedidas || 0) - (cuenta.cervezasEntregadas || 0));
  if (pendientes > 0 || cuenta.saldoDinero > 0) {
    mostrarToast("No puedes eliminar una cuenta con cervezas o saldo pendiente", "error");
    return;
  }
  if (!confirm(`¿Eliminar la cuenta de cerveza de "${cuenta.cliente}"? Esta acción no se puede deshacer.`)) return;

  try {
    await RosaState.db.collection("cuentasCerveza").doc(cervezaDetalleId).delete();
    mostrarToast("Cuenta eliminada");
    cerrarModal("modal-cerveza-detalle");
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo eliminar la cuenta", "error");
  }
}

/* ---------------------- Modal: registrar entrega o pago ---------------------- */

function initModalMovCerveza() {
  document.querySelectorAll("#modal-mov-cerveza .chip[data-tipo-mov-cerveza]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#modal-mov-cerveza .chip[data-tipo-mov-cerveza]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      movCervezaTipo = chip.dataset.tipoMovCerveza;
      actualizarTextosModalMovCerveza();
    });
  });

  document.getElementById("cerrar-mov-cerveza").addEventListener("click", () => cerrarModal("modal-mov-cerveza"));

  document.getElementById("form-mov-cerveza").addEventListener("submit", async (e) => {
    e.preventDefault();
    await confirmarMovCerveza();
  });
}

function abrirModalMovCerveza(tipo) {
  movCervezaTipo = tipo;
  document.querySelectorAll("#modal-mov-cerveza .chip[data-tipo-mov-cerveza]").forEach((c) => {
    c.classList.toggle("active", c.dataset.tipoMovCerveza === tipo);
  });
  document.getElementById("mov-cerveza-cantidad").value = "";
  document.getElementById("mov-cerveza-monto").value = "";
  actualizarTextosModalMovCerveza();
  abrirModal("modal-mov-cerveza");
}

function actualizarTextosModalMovCerveza() {
  const cuenta = RosaState.cuentasCerveza.find((c) => c.id === cervezaDetalleId);
  const pendientes = cuenta ? Math.max(0, (cuenta.cervezasPedidas || 0) - (cuenta.cervezasEntregadas || 0)) : 0;
  const esEntrega = movCervezaTipo === "entrega";

  document.getElementById("modal-mov-cerveza-titulo").textContent = esEntrega ? "Registrar entrega" : "Registrar pago";
  document.getElementById("campo-mov-cerveza-cantidad").classList.toggle("hidden", !esEntrega);
  document.getElementById("campo-mov-cerveza-monto").classList.toggle("hidden", esEntrega);

  if (esEntrega) {
    document.getElementById("modal-mov-cerveza-sub").textContent = `Le quedan ${pendientes} cerveza${pendientes === 1 ? "" : "s"} pendiente${pendientes === 1 ? "" : "s"} por llevarse.`;
    document.getElementById("mov-cerveza-cantidad").max = pendientes;
  } else {
    const saldo = cuenta ? cuenta.saldoDinero || 0 : 0;
    document.getElementById("modal-mov-cerveza-sub").textContent = `Debe ${formatoMoneda(saldo)} en total.`;
    document.getElementById("mov-cerveza-monto").max = saldo;
  }
}

async function confirmarMovCerveza() {
  const cuenta = RosaState.cuentasCerveza.find((c) => c.id === cervezaDetalleId);
  if (!cuenta) return;
  if (!RosaState.firebaseListo) {
    mostrarToast("Firebase no está conectado todavía", "error");
    return;
  }

  const esEntrega = movCervezaTipo === "entrega";
  const pendientes = Math.max(0, (cuenta.cervezasPedidas || 0) - (cuenta.cervezasEntregadas || 0));

  if (esEntrega) {
    let cantidad = parseInt(document.getElementById("mov-cerveza-cantidad").value, 10);
    if (!cantidad || cantidad <= 0) {
      mostrarToast("Ingresa cuántas se lleva", "error");
      return;
    }
    if (cantidad > pendientes) {
      cantidad = pendientes;
      mostrarToast(`Se ajustó a ${pendientes}, las que quedaban pendientes`, "ok");
    }
    const movimiento = { id: generarIdLocal("mov"), tipo: "entrega", cantidad, fecha: new Date().toISOString() };
    try {
      await RosaState.db
        .collection("cuentasCerveza")
        .doc(cuenta.id)
        .update({
          cervezasEntregadas: (cuenta.cervezasEntregadas || 0) + cantidad,
          movimientos: [...(cuenta.movimientos || []), movimiento],
          actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
        });
      mostrarToast("Entrega registrada");
      cerrarModal("modal-mov-cerveza");
    } catch (err) {
      console.error(err);
      mostrarToast("No se pudo registrar la entrega", "error");
    }
    return;
  }

  // pago
  let monto = parseFloat(document.getElementById("mov-cerveza-monto").value);
  const saldoActual = cuenta.saldoDinero || 0;
  if (isNaN(monto) || monto <= 0) {
    mostrarToast("Ingresa un monto válido", "error");
    return;
  }
  if (monto > saldoActual) {
    monto = saldoActual;
    mostrarToast(`El pago se ajustó a ${formatoMoneda(saldoActual)}, el saldo pendiente`, "ok");
  }
  const movimiento = { id: generarIdLocal("mov"), tipo: "pago", monto, fecha: new Date().toISOString() };
  try {
    await RosaState.db
      .collection("cuentasCerveza")
      .doc(cuenta.id)
      .update({
        saldoDinero: Math.max(0, saldoActual - monto),
        movimientos: [...(cuenta.movimientos || []), movimiento],
        actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
      });
    mostrarToast("Pago registrado");
    cerrarModal("modal-mov-cerveza");
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo registrar el pago", "error");
  }
}

/* ---------------------- Resumen ---------------------- */

function renderResumenCervezas() {
  const totalPendientesCervezas = RosaState.cuentasCerveza.reduce(
    (acc, c) => acc + Math.max(0, (c.cervezasPedidas || 0) - (c.cervezasEntregadas || 0)),
    0
  );
  const totalDinero = RosaState.cuentasCerveza.reduce((acc, c) => acc + (c.saldoDinero || 0), 0);

  document.getElementById("resumen-cervezas-pendientes").textContent = totalPendientesCervezas;
  document.getElementById("resumen-cervezas-dinero").textContent = formatoMoneda(totalDinero);

  const conPendiente = RosaState.cuentasCerveza.filter(
    (c) => (c.saldoDinero || 0) > 0 || (c.cervezasPedidas || 0) - (c.cervezasEntregadas || 0) > 0
  );
  const ranking = [...conPendiente].sort((a, b) => (b.saldoDinero || 0) - (a.saldoDinero || 0)).slice(0, 5);

  const cont = document.getElementById("lista-mayores-pendientes-cerveza");
  if (ranking.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 6 9 17l-5-5"/></svg>
        <div>Ninguna cuenta tiene pendientes. ¡Todo entregado y pagado!</div>
      </div>`;
    return;
  }

  cont.innerHTML = ranking
    .map((c, idx) => {
      const pendientes = Math.max(0, (c.cervezasPedidas || 0) - (c.cervezasEntregadas || 0));
      return `
      <div class="list-row" data-id="${c.id}" style="cursor:pointer">
        <div class="rank-badge">${idx + 1}</div>
        <div class="list-info">
          <div class="list-name">${escaparHTML(c.cliente)}</div>
          <div class="list-meta">${pendientes > 0 ? `${pendientes} cerveza${pendientes === 1 ? "" : "s"} pendiente${pendientes === 1 ? "" : "s"}` : "Cervezas al día"}</div>
        </div>
        <div class="pill pill-coral">${formatoMoneda(c.saldoDinero || 0)}</div>
      </div>`;
    })
    .join("");

  cont.querySelectorAll("[data-id]").forEach((row) => {
    row.addEventListener("click", () => abrirDetalleCuentaCerveza(row.dataset.id));
  });
}
