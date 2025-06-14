console.log("Script de resumen_diario.js cargado correctamente.");

let supabaseUrl = "", supabaseKey = "";

fetch("config.json")
  .then(res => res.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
    document.getElementById("buscarFecha").onclick = () => {
      const fecha = document.getElementById("fechaSeleccionada").value;
      if (!fecha) return alert("Seleccioná una fecha");
      generarResumenDiario(fecha);
    };
  });

const headers = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`
});

async function generarResumenDiario(fecha) {
  const contenedor = document.getElementById("resultado");
  contenedor.innerHTML = `<h2>🗓️ ${formatearFecha(fecha)}</h2>`;

  // 1. Asistencias
  const asistenciasRes = await fetch(`${supabaseUrl}/rest/v1/asistencias?fecha=eq.${fecha}&select=alumno_id,turno,sede,tipo`, { headers: headers() });
  const asistencias = await asistenciasRes.json();
  if (asistencias.length) {
    contenedor.innerHTML += `<h3>✅ Asistencias registradas</h3>`;
    const agrupadas = agruparPorTurno(asistencias);
    const gruposOrdenados = Object.values(agrupadas).sort((a, b) => {
        // Orden por sede primero (alfabético)
        if (a.sede !== b.sede) return a.sede.localeCompare(b.sede);
      
        // Luego por hora (extraída del turno: "Día HH:MM")
        const horaA = a.turno.split(" ").slice(1).join(" ");
        const horaB = b.turno.split(" ").slice(1).join(" ");
        return horaA.localeCompare(horaB);
      });
      
      gruposOrdenados.forEach(grupo => {
        contenedor.innerHTML += `<p>• ${grupo.turno} (${grupo.sede}) → ${grupo.regulares.length} presentes, ${grupo.ausentes.length} ausentes, ${grupo.recuperaciones.length} recuperadores</p>`;
    });
      
  }

  // 2. Pagos
  const pagosRes = await fetch(`${supabaseUrl}/rest/v1/pagos?select=alumno_id,mes,pago_mes,pago_inscripcion,medio_pago,monto_total,creado_en&creado_en=gte.${fecha}T00:00:00&creado_en=lte.${fecha}T23:59:59`, { headers: headers() });
  const pagos = await pagosRes.json();
  if (pagos.length) {
    contenedor.innerHTML += `<h3>💰 Pagos registrados</h3>`;
    for (const p of pagos) {
      const alumno = await obtenerAlumno(p.alumno_id);
      const conceptos = [];
      if (p.pago_mes) conceptos.push(`Cuota ${p.mes}`);
      if (p.pago_inscripcion) conceptos.push("Inscripción");
      contenedor.innerHTML += `<p>• ${alumno} – $${p.monto_total} – ${capitalizar(p.medio_pago)} – ${conceptos.join(" + ")}</p>`;
    }
  }

  // 3. Nuevas inscripciones
  const inscRes = await fetch(`${supabaseUrl}/rest/v1/inscripciones?select=nombre,apellido,sede,turno_1,lista_espera,creado_en&creado_en=gte.${fecha}T00:00:00&creado_en=lte.${fecha}T23:59:59`, { headers: headers() });
  const inscripciones = await inscRes.json();
  if (inscripciones.length) {
    contenedor.innerHTML += `<h3>🧾 Nuevas inscripciones</h3>`;
    for (const a of inscripciones) {
      contenedor.innerHTML += `<p>• ${a.nombre} ${a.apellido} (${a.sede}) – ${a.turno_1} – Lista de espera: ${a.lista_espera ? "Sí" : "No"}</p>`;
    }
  }

  // 4. Inactivaciones del día (requiere campo actualizado_en con trigger)
  const inactivosRes = await fetch(
    `${supabaseUrl}/rest/v1/inscripciones?select=nombre,apellido,actualizado_en&activo=eq.false&actualizado_en=gte.${fecha}T00:00:00&actualizado_en=lt.${fecha}T23:59:59`,
    { headers: headers() }
  );
  const inactivos = await inactivosRes.json();
  if (inactivos.length) {
    contenedor.innerHTML += `<h3>❌ Inactivaciones</h3>`;
    for (const a of inactivos) {
      contenedor.innerHTML += `<p>• ${a.nombre} ${a.apellido}</p>`;
    }
  }

  if (!asistencias.length && !pagos.length && !inscripciones.length && !inactivos.length) {
    contenedor.innerHTML += `<p>No se registraron eventos en esta fecha.</p>`;
  }
}

function formatearFecha(fecha) {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function capitalizar(txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function agruparPorTurno(asistencias) {
  const grupos = {};
  asistencias.forEach(a => {
    const clave = `${a.turno}__${a.sede}`;
    if (!grupos[clave]) {
      grupos[clave] = { turno: a.turno, sede: a.sede, regulares: [], ausentes: [], recuperaciones: [] };
    }
    if (a.tipo === "regular") grupos[clave].regulares.push(a);
    else if (a.tipo === "ausente") grupos[clave].ausentes.push(a);
    else if (a.tipo === "recuperacion") grupos[clave].recuperaciones.push(a);
  });
  return grupos;
}

async function obtenerAlumno(id) {
  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${id}&select=nombre,apellido`, { headers: headers() });
  const [a] = await res.json();
  return a ? `${a.nombre} ${a.apellido}` : `ID ${id}`;
}
