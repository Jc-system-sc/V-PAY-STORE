/* ==========================================================================
   CUENTAS.JS
   "Fiado": cada cliente de confianza puede tener una cuenta abierta. Cada
   compra a cuenta se suma al saldo; cada abono lo resta. Todo queda
   registrado con fecha y hora, y se puede descargar como PDF por cuenta.
   ========================================================================== */

let cuentaDetalleId = null;

function initCuentas() {
  document.getElementById("buscar-cuentas").addEventListener("input", (e) => renderListaCuentas(e.target.value));

  document.getElementById("btn-nueva-cuenta").addEventListener("click", () => {
    document.getElementById("form-cuenta-nueva").reset();
    abrirModal("modal-cuenta-nueva");
  });
  document.getElementById("cerrar-cuenta-nueva").addEventListener("click", () => cerrarModal("modal-cuenta-nueva"));

  document.getElementById("form-cuenta-nueva").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("nueva-cuenta-nombre").value.trim();
    const telefono = document.getElementById("nueva-cuenta-telefono").value.trim();
    if (!nombre) {
      mostrarToast("Ingresa el nombre del cliente", "error");
      return;
    }
    if (!RosaState.firebaseListo) {
      mostrarToast("Firebase no está conectado todavía", "error");
      return;
    }
    const yaExiste = RosaState.cuentas.find((c) => c.cliente.toLowerCase() === nombre.toLowerCase());
    if (yaExiste) {
      mostrarToast("Ya existe una cuenta con ese nombre", "error");
      return;
    }
    try {
      const id = await asegurarCuenta(nombre, telefono);
      cerrarModal("modal-cuenta-nueva");
      mostrarToast("Cuenta creada");
      if (id) abrirDetalleCuenta(id);
    } catch (err) {
      console.error(err);
      mostrarToast("No se pudo crear la cuenta", "error");
    }
  });

  document.getElementById("cerrar-cuenta-detalle").addEventListener("click", () => cerrarModal("modal-cuenta-detalle"));

  document.getElementById("form-abono-cuenta").addEventListener("submit", async (e) => {
    e.preventDefault();
    await registrarAbono();
  });

  document.getElementById("btn-pdf-cuenta").addEventListener("click", () => {
    const cuenta = RosaState.cuentas.find((c) => c.id === cuentaDetalleId);
    if (cuenta) descargarPDFCuenta(cuenta);
  });

  document.getElementById("btn-eliminar-cuenta").addEventListener("click", eliminarCuentaActual);
}

/* ---------------------- Lista de cuentas ---------------------- */

function renderListaCuentas(query) {
  const cont = document.getElementById("lista-cuentas");
  const q = (query || "").trim().toLowerCase();

  const filtradas = RosaState.cuentas
    .filter((c) => !q || c.cliente.toLowerCase().includes(q))
    .sort((a, b) => (b.saldo || 0) - (a.saldo || 0) || a.cliente.localeCompare(b.cliente));

  if (filtradas.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7a2 2 0 0 1 2-2h11l4 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M16 13h3"/></svg>
        <div>${q ? "No hay cuentas con ese nombre." : "Todavía no tienes cuentas abiertas."}</div>
      </div>`;
    return;
  }

  cont.innerHTML = filtradas
    .map((c) => {
      const alDia = !c.saldo || c.saldo <= 0;
      return `
      <div class="lista-card" data-id="${c.id}" style="cursor:pointer">
        <div class="lista-card-icon" style="background:${alDia ? "var(--price-soft)" : "var(--coral-soft)"}; color:${alDia ? "var(--price)" : "var(--coral)"};">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 0 1 2-2h11l4 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M16 13h3"/></svg>
        </div>
        <div class="lista-card-info">
          <div class="lista-card-nombre">${escaparHTML(c.cliente)}</div>
          <div class="lista-card-meta">${c.telefono ? escaparHTML(c.telefono) : (alDia ? "Sin deuda pendiente" : "Debe desde " + formatoFechaHora(primerCargoPendiente(c)))}</div>
        </div>
        <div class="lista-card-total" style="color:${alDia ? "var(--price)" : "var(--coral)"}">${alDia ? "Al día" : formatoMoneda(c.saldo)}</div>
      </div>`;
    })
    .join("");

  cont.querySelectorAll(".lista-card").forEach((card) => {
    card.addEventListener("click", () => abrirDetalleCuenta(card.dataset.id));
  });
}

function primerCargoPendiente(cuenta) {
  const cargos = (cuenta.movimientos || []).filter((m) => m.tipo === "cargo");
  return cargos.length ? cargos[cargos.length - 1].fecha : cuenta.creadaEn;
}

/* ---------------------- Detalle de una cuenta ---------------------- */

function abrirDetalleCuenta(id) {
  cuentaDetalleId = id;
  renderDetalleCuenta();
  document.getElementById("input-abono-monto").value = "";
  abrirModal("modal-cuenta-detalle");
}

function renderDetalleCuenta() {
  const cuenta = RosaState.cuentas.find((c) => c.id === cuentaDetalleId);
  if (!cuenta) {
    cerrarModal("modal-cuenta-detalle");
    return;
  }

  document.getElementById("detalle-cuenta-nombre").textContent = cuenta.cliente;
  document.getElementById("detalle-cuenta-meta").textContent = cuenta.telefono || "Sin celular registrado";
  document.getElementById("detalle-cuenta-saldo").textContent = formatoMoneda(cuenta.saldo || 0);
  document.getElementById("detalle-cuenta-saldo").style.color = cuenta.saldo > 0 ? "var(--coral)" : "var(--price)";

  document.getElementById("btn-eliminar-cuenta").classList.toggle("hidden", (cuenta.saldo || 0) > 0);

  const movimientos = [...(cuenta.movimientos || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const cont = document.getElementById("detalle-cuenta-movimientos");

  if (movimientos.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
        <div>Todavía no hay compras ni abonos en esta cuenta.</div>
      </div>`;
    return;
  }

  cont.innerHTML = movimientos
    .map((m) => {
      const esCargo = m.tipo === "cargo";
      const detalle = esCargo ? (m.detalle || []).map((d) => `${d.nombre} x${d.cantidad}`).join(", ") : "Abono a la cuenta";
      return `
      <div class="list-row">
        <div class="list-icon" style="background:${esCargo ? "var(--coral-soft)" : "var(--price-soft)"}; color:${esCargo ? "var(--coral)" : "var(--price)"};">
          ${esCargo
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7 12 3 4 7v10l8 4 8-4V7Z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>'}
        </div>
        <div class="list-info">
          <div class="list-name">${escaparHTML(detalle)}</div>
          <div class="list-meta">${formatoFechaHora(m.fecha)}</div>
        </div>
        <div class="sale-item-total" style="color:${esCargo ? "var(--coral)" : "var(--price)"}">${esCargo ? "+" : "−"}${formatoMoneda(m.monto)}</div>
      </div>`;
    })
    .join("");
}

async function registrarAbono() {
  const cuenta = RosaState.cuentas.find((c) => c.id === cuentaDetalleId);
  if (!cuenta) return;

  let monto = parseFloat(document.getElementById("input-abono-monto").value);
  if (isNaN(monto) || monto <= 0) {
    mostrarToast("Ingresa un monto de abono válido", "error");
    return;
  }
  if (!RosaState.firebaseListo) {
    mostrarToast("Firebase no está conectado todavía", "error");
    return;
  }

  const saldoActual = cuenta.saldo || 0;
  if (monto > saldoActual) {
    monto = saldoActual;
    mostrarToast(`El abono se ajustó a ${formatoMoneda(saldoActual)}, el saldo pendiente`, "ok");
  }

  const movimiento = { id: generarIdLocal("mov"), tipo: "abono", monto, fecha: new Date().toISOString() };

  try {
    await RosaState.db
      .collection("cuentas")
      .doc(cuenta.id)
      .update({
        saldo: Math.max(0, saldoActual - monto),
        movimientos: [...(cuenta.movimientos || []), movimiento],
        actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
      });
    document.getElementById("input-abono-monto").value = "";
    mostrarToast("Abono registrado");
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo registrar el abono", "error");
  }
}

async function eliminarCuentaActual() {
  if (!cuentaDetalleId) return;
  const cuenta = RosaState.cuentas.find((c) => c.id === cuentaDetalleId);
  if (!cuenta) return;
  if (cuenta.saldo > 0) {
    mostrarToast("No puedes eliminar una cuenta con saldo pendiente", "error");
    return;
  }
  if (!confirm(`¿Eliminar la cuenta de "${cuenta.cliente}"? Esta acción no se puede deshacer.`)) return;

  try {
    await RosaState.db.collection("cuentas").doc(cuentaDetalleId).delete();
    mostrarToast("Cuenta eliminada");
    cerrarModal("modal-cuenta-detalle");
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo eliminar la cuenta", "error");
  }
}

/* ---------------------- Resumen de cuentas ---------------------- */

function renderResumenCuentas() {
  const totalPendiente = RosaState.cuentas.reduce((acc, c) => acc + (c.saldo || 0), 0);
  const cuentasConDeuda = RosaState.cuentas.filter((c) => (c.saldo || 0) > 0);

  document.getElementById("resumen-cuentas-total").textContent = formatoMoneda(totalPendiente);
  document.getElementById("resumen-cuentas-cantidad").textContent = cuentasConDeuda.length;

  const ranking = [...cuentasConDeuda].sort((a, b) => (b.saldo || 0) - (a.saldo || 0)).slice(0, 5);
  const cont = document.getElementById("lista-mayores-deudas");

  if (ranking.length === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 6 9 17l-5-5"/></svg>
        <div>Ninguna cuenta tiene saldo pendiente. ¡Todo al día!</div>
      </div>`;
    return;
  }

  cont.innerHTML = ranking
    .map(
      (c, idx) => `
      <div class="list-row" data-id="${c.id}" style="cursor:pointer">
        <div class="rank-badge">${idx + 1}</div>
        <div class="list-info">
          <div class="list-name">${escaparHTML(c.cliente)}</div>
          <div class="list-meta">${c.telefono ? escaparHTML(c.telefono) : "Cuenta a fiado"}</div>
        </div>
        <div class="pill pill-coral">${formatoMoneda(c.saldo)}</div>
      </div>`
    )
    .join("");

  cont.querySelectorAll("[data-id]").forEach((row) => {
    row.addEventListener("click", () => abrirDetalleCuenta(row.dataset.id));
  });
}
