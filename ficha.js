let supabaseUrl = "", supabaseKey = "", todosLosAlumnos = [];

fetch("config.json")
  .then(res => res.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
    return fetchAlumnos();
  })
  .then(alumnos => {
    todosLosAlumnos = alumnos;
    cargarSelectorAlumnos(alumnos);
  });

const headers = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`
});

async function fetchAlumnos() {
  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?select=responsable,email,curso,sede,id,nombre,apellido,turno_1,creado_en,telefono,beneficiario_id,tiene_promo,escuela,edad`, {
    headers: headers()
  });
  return await res.json();
}

async function fetchAsistencias(id, desde, hasta) {
  const res = await fetch(`${supabaseUrl}/rest/v1/asistencias?alumno_id=eq.${id}&fecha=gte.${desde}&fecha=lte.${hasta}`, {
    headers: headers()
  });
  return await res.json();
}

function formatearFechaArgentina(fechaISO) {
    const fecha = new Date(fechaISO);
    if (isNaN(fecha)) return "-";
    const opciones = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires'
    };
    return new Intl.DateTimeFormat('es-AR', opciones).format(fecha);
}
  
function generarMesesDesdeInscripcion(fechaInscripcion) {
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                     "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const inicio = new Date(fechaInscripcion);
    const hoy = new Date();
    const meses = [];
  
    let actual = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  
    while (actual <= hoy) {
      const nombreMes = nombres[actual.getMonth()];
      const mesTexto = nombreMes; // e.g. "Mayo"
      meses.push(mesTexto);
      actual.setMonth(actual.getMonth() + 1);
    }
  
    return meses;
}
  

function generarFechasEsperadas(mes, turno) {
    const diaTexto = turno.split(" ")[0];
    const diaNum = {
        Lunes: 1, Martes: 2, Miércoles: 3,
        Jueves: 4, Viernes: 5, Sábado: 6
    }[diaTexto];

    const fechas = [];
    const base = new Date(mes + "-01");
    while (base.getMonth() === new Date(mes).getMonth()) {
        if (base.getDay() === diaNum) {
        fechas.push(base.toISOString().slice(0, 10));
        }
        base.setDate(base.getDate() + 1);
    }
    return fechas;
}

function cargarBeneficiariosDisponibles(actualId) {
    const select = document.getElementById("vincularBeneficiario");
    select.innerHTML = '<option value="">-- Seleccionar beneficiario --</option>';
    todosLosAlumnos
        .filter(a => a.id !== actualId)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach(a => {
        const opt = new Option(`${a.nombre} ${a.apellido}`, a.id);
        select.appendChild(opt);
        });
}

async function actualizarVinculoPromocion(id) {
    const alumnoId = document.getElementById("alumno").value;
    if (!alumnoId) return;

    const headersConfig = {
        ...headers(),
        "Content-Type": "application/json",
        "prefer": "return=representation"
    };
    const alumno = todosLosAlumnos.find(a => a.id == alumnoId);

    const desvincularAnterior = alumno.beneficiario_id ? [
        fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumno.beneficiario_id}`, {
        method: "PATCH",
        headers: headersConfig,
        body: JSON.stringify({ tiene_promo: false, beneficiario_id: null })
        })
    ] : [];

    const updates = id
        ? [
            ...desvincularAnterior,
            fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumnoId}`, {
            method: "PATCH",
            headers: headersConfig,
            body: JSON.stringify({ tiene_promo: true, beneficiario_id: id })
            }),
            fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${id}`, {
            method: "PATCH",
            headers: headersConfig,
            body: JSON.stringify({ tiene_promo: true, beneficiario_id: alumnoId })
            })
        ]
        : [
            ...desvincularAnterior,
            fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumnoId}`, {
            method: "PATCH",
            headers: headersConfig,
            body: JSON.stringify({ tiene_promo: false, beneficiario_id: null })
            })
        ];

    Promise.all(updates)
        .then(() => fetchAlumnos())
        .then(alumnos => {
        todosLosAlumnos = alumnos;
        const alumno = todosLosAlumnos.find(a => a.id == alumnoId);
        mostrarFicha(alumno);
        alert(id ? "Alumnos vinculados con promoción." : "Promoción eliminada.");
        })
        .catch(console.error);
}

function mostrarFicha(alumno) {
    if (!alumno) return;
  
    document.getElementById("fichaAlumno").style.display = "block";
  
    // Asignación de datos básicos
    const creadoEl = document.getElementById("campo-creado_en");
    if (creadoEl) creadoEl.textContent = formatearFechaArgentina(alumno.creado_en);
  
    const map = {
      responsable: alumno.responsable,
      telefono: alumno.telefono,
      email: alumno.email,
      escuela: alumno.escuela,
      edad: alumno.edad,
      sede: alumno.sede,
      curso: alumno.curso,
    };
    for (const id in map) {
      const el = document.getElementById(`campo-${id}`);
      if (el) el.textContent = map[id] ?? '';
    }
  
    const turnoEl = document.getElementById("turnoTexto");
    if (turnoEl) turnoEl.textContent = alumno.turno_1?.trim().replace(/hs$/, '') ?? '';
  
    // Promo
    const chk = document.getElementById("tienePromo");
    const nombreBenef = document.getElementById("nombreBeneficiario");
    const selectBenef = document.getElementById("vincularBeneficiario");
    const labelBenef = document.getElementById("labelBeneficiario");
    const promoBox = document.getElementById("beneficiarioPromo");
  
    chk.checked = alumno.tiene_promo;
    chk.disabled = true;
  
    if (alumno.tiene_promo && alumno.beneficiario_id) {
      const otro = todosLosAlumnos.find(a => a.id === alumno.beneficiario_id);
      promoBox.style.display = "block";
      labelBenef.style.display = "block";
      nombreBenef.style.display = "block";
      nombreBenef.textContent = otro ? `${otro.nombre} ${otro.apellido}` : '';
      selectBenef.style.display = "none";
    } else {
      promoBox.style.display = "none";
      labelBenef.style.display = "none";
      nombreBenef.style.display = "none";
      selectBenef.style.display = "none";
      nombreBenef.textContent = '';
      selectBenef.innerHTML = '';
    }
  
    // Asistencias
    const meses = generarMesesDesdeInscripcion(alumno.creado_en);
    const selMes = document.getElementById("mes");
    selMes.innerHTML = "";
    meses.reverse().forEach(m => selMes.appendChild(new Option(m, m)));
  
    selMes.onchange = async () => {
      const turno = alumno.turno_1?.trim().replace(/hs$/, '');
      const { desde, hasta } = obtenerRangoFechas(selMes.value);
      const asistencias = await fetchAsistencias(alumno.id, desde, hasta);

      const esperadas = generarFechasEsperadas(selMes.value, turno);
  
      const presentes = asistencias.filter(a => a.tipo === "regular").map(a => a.fecha);
      const recuperadas = asistencias.filter(a => a.tipo === "recuperacion").map(a => a.fecha);
      const faltas = esperadas.filter(f => !presentes.includes(f));
  
      const pagado = await verificarPagoMes(alumno.id, selMes.value);
        document.getElementById("estadoPago").innerHTML = `
        <p class="${pagado ? 'pago-verde' : 'pago-rojo'}">${pagado ? 'Pagado' : 'Sin pago registrado'}</p>`;

  
      document.getElementById("asistenciasResumen").innerHTML = `
        <p><strong>Fechas esperadas:</strong> ${esperadas.length}</p>
        <p><strong>Asistencias:</strong> ${presentes.length}</p>
        <p><strong>Recuperaciones:</strong> ${recuperadas.length}</p>
        <p><strong>Faltas:</strong> ${faltas.length}</p>
        <table class="tabla-asistencias">
          <tr><th>Fecha</th><th>Estado</th></tr>
          ${esperadas.map(f => `<tr><td>${f}</td><td>${presentes.includes(f) ? 'Presente' : 'Ausente'}</td></tr>`).join("")}
        </table>`;
    };
  
    selMes.dispatchEvent(new Event("change"));
}
  
   
   
document.getElementById("alumno").addEventListener("change", () => {
    const id = document.getElementById("alumno").value;
    if (!id) return;
  
    // Reset visual
    document.getElementById("modoEdicionFicha").textContent = "Editar ficha";
    document.getElementById("guardarFicha").style.display = "none";
    document.getElementById("eliminarAlumno").style.display = "none";
    document.getElementById("tienePromo").disabled = true;
  
    // Restaurar campos que podrían haber sido convertidos en <input> o <select>
    const campos = ["responsable", "telefono", "email", "escuela", "sede", "curso", "edad"];
    campos.forEach(id => {
      const input = document.getElementById(`input-${id}`);
      if (input) {
        const span = document.createElement("span");
        span.id = `campo-${id}`;
        span.textContent = input.value;
        input.replaceWith(span);
      }
    });
  
    const turnoEdit = document.getElementById("turnoEdit");
    if (turnoEdit) {
      const span = document.createElement("span");
      span.id = "turnoTexto";
      span.textContent = turnoEdit.value;
      turnoEdit.replaceWith(span);
    }
  
    // Cargar nueva ficha
    const alumno = todosLosAlumnos.find(a => a.id == id);
    if (alumno) mostrarFicha(alumno);
});
           

function cargarSelectorAlumnos(alumnos) {
    const sel = document.getElementById("alumno");
    sel.innerHTML = '<option value="">-- Seleccionar alumno --</option>';
    alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));
    alumnos.forEach(a => {
        const opt = new Option(`${a.nombre} ${a.apellido}`, a.id);
        sel.appendChild(opt);
    });
}

document.getElementById("guardarFicha").onclick = async () => {
    const alumnoId = document.getElementById("alumno").value;
    if (!alumnoId) return;
  
    const headersConfig = {
      ...headers(),
      "Content-Type": "application/json",
      "prefer": "return=representation"
    };
  
    const alumno = todosLosAlumnos.find(a => a.id == alumnoId);
  
    const tienePromo = document.getElementById("tienePromo").checked;
    const beneficiarioId = tienePromo ? document.getElementById("vincularBeneficiario").value || null : null;
  
    const payload = {
      turno_1: document.getElementById("turnoEdit")?.value,
      responsable: document.getElementById("input-responsable")?.value,
      telefono: document.getElementById("input-telefono")?.value,
      email: document.getElementById("input-email")?.value,
      edad: document.getElementById("input-edad")?.value,
      escuela: document.getElementById("input-escuela")?.value,
      curso: document.getElementById("input-curso")?.value,
      sede: document.getElementById("input-sede")?.value,
      tiene_promo: tienePromo,
      beneficiario_id: beneficiarioId
    };
  
    // Guardar alumno actual
    await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumnoId}`, {
      method: "PATCH",
      headers: headersConfig,
      body: JSON.stringify(payload)
    });
  
    // Si tenía un beneficiario anterior y ahora se quitó, desvincular al otro también
    if (!tienePromo && alumno.beneficiario_id) {
      await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumno.beneficiario_id}`, {
        method: "PATCH",
        headers: headersConfig,
        body: JSON.stringify({ tiene_promo: false, beneficiario_id: null })
      });
    }
  
    // Si hay un nuevo vínculo, también actualizar al beneficiario seleccionado
    if (tienePromo && beneficiarioId) {
      await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${beneficiarioId}`, {
        method: "PATCH",
        headers: headersConfig,
        body: JSON.stringify({
          tiene_promo: true,
          beneficiario_id: alumnoId
        })
      });
    }
  
    // Refrescar datos
    const actualizado = await fetchAlumnos();
    todosLosAlumnos = actualizado;
    const nuevo = todosLosAlumnos.find(a => a.id == alumnoId);
    mostrarFicha(nuevo);
  
    // Restaurar los campos editables a spans
    const campos = ["responsable", "telefono", "email", "escuela", "sede", "curso", "edad"];
    campos.forEach(id => {
    const input = document.getElementById(`input-${id}`);
    if (input) {
        const span = document.createElement("span");
        span.id = `campo-${id}`;
        span.textContent = input.value;
        input.replaceWith(span);
    }
    });

    const turnoEdit = document.getElementById("turnoEdit");
    if (turnoEdit) {
    const span = document.createElement("span");
    span.id = "turnoTexto";
    span.textContent = turnoEdit.value;
    turnoEdit.replaceWith(span);
    }

    // Volver al modo lectura
    document.getElementById("modoEdicionFicha").textContent = "Editar ficha";
    document.getElementById("guardarFicha").style.display = "none";
    document.getElementById("eliminarAlumno").style.display = "none";
    document.getElementById("tienePromo").disabled = true;

    // Confirmación visual
    const msg = document.createElement("p");
    msg.textContent = "Cambios guardados correctamente.";
    msg.style.color = "green";
    msg.style.fontWeight = "bold";
    document.getElementById("infoBasica").prepend(msg);
    setTimeout(() => msg.remove(), 3000);

};
  
  
  
document.getElementById("eliminarAlumno").onclick = async () => {
    const alumnoId = document.getElementById("alumno").value;
    if (!alumnoId) return;
  
    const alumno = todosLosAlumnos.find(a => a.id == alumnoId);
    if (!confirm(`¿Estás seguro de eliminar a ${alumno.nombre} ${alumno.apellido}?`)) return;
  
    const headersConfig = {
      ...headers(),
      "prefer": "return=representation"
    };
  
    // Desvincular beneficiario si lo hay
    if (alumno.beneficiario_id) {
      await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumno.beneficiario_id}`, {
        method: "PATCH",
        headers: {
          ...headersConfig,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tiene_promo: false, beneficiario_id: null })
      });
    }
  
    // Eliminar alumno
    await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumnoId}`, {
      method: "DELETE",
      headers: headersConfig
    });
  
    todosLosAlumnos = await fetchAlumnos();
    cargarSelectorAlumnos(todosLosAlumnos);
    document.getElementById("fichaAlumno").style.display = "none";
    alert("Alumno eliminado correctamente.");
};
  
document.getElementById("modoEdicionFicha").onclick = () => {
    const alumnoId = document.getElementById("alumno").value;
    const alumno = todosLosAlumnos.find(a => a.id == alumnoId);

    const enEdicion = document.getElementById("modoEdicionFicha").textContent === "Cancelar";
  
    if (enEdicion) {
      document.getElementById("fichaAlumno").style.display = "none";
      setTimeout(() => {
          document.getElementById("alumno").dispatchEvent(new Event("change"));
      }, 0);

      document.getElementById("modoEdicionFicha").textContent = "Editar ficha";
      document.getElementById("guardarFicha").style.display = "none";
      document.getElementById("eliminarAlumno").style.display = "none";
      document.getElementById("tienePromo").disabled = true;
      return;
    }

        // ✅ Insertá esto al entrar en modo edición
    const chk = document.getElementById("tienePromo");
    const promoBox = document.getElementById("beneficiarioPromo");
    const labelBenef = document.getElementById("labelBeneficiario");
    const nombreBenef = document.getElementById("nombreBeneficiario");
    const selectBenef = document.getElementById("vincularBeneficiario");

    chk.disabled = false;

    promoBox.style.display = "block";
    labelBenef.style.display = "none";
    nombreBenef.style.display = "none";
    selectBenef.style.display = "none";
    chk.onchange = () => {
    const marcado = chk.checked;
    if (marcado) {
        labelBenef.style.display = "block";
        selectBenef.style.display = "block";
        cargarBeneficiariosDisponibles(alumno.id);
    } else {
        labelBenef.style.display = "none";
        selectBenef.style.display = "none";
        selectBenef.innerHTML = "";
    }
    };


  
    const camposTexto = ["responsable", "telefono", "email", "escuela", "edad"];
    const camposSelect = {
      curso: ["Robótica Básica", "Robótica Avanzada", "Programación con Scratch"],
      sede: ["Calle Mendoza", "Fisherton"]
    };
  
    camposTexto.forEach(id => {
      const span = document.getElementById(`campo-${id}`);
      if (!span) return;
      const input = document.createElement("input");
      input.id = `input-${id}`;
      input.value = span.textContent.trim();
      span.replaceWith(input);
    });
  
    for (const id in camposSelect) {
      const span = document.getElementById(`campo-${id}`);
      if (!span) continue;
      const select = document.createElement("select");
      select.id = `input-${id}`;
      camposSelect[id].forEach(op => {
        const opt = new Option(op, op, false, op === span.textContent.trim());
        select.appendChild(opt);
      });
      span.replaceWith(select);
    }
  
    let turnoActual = "";
    let turnoSpan = document.getElementById("turnoTexto");

    // Si ya fue reemplazado por <select>, reconstruir el <span>
    if (!turnoSpan) {
    const turnoSelect = document.getElementById("turnoEdit");
    if (turnoSelect) {
        turnoActual = turnoSelect.value;
        turnoSpan = document.createElement("span");
        turnoSpan.id = "turnoTexto";
        turnoSpan.textContent = turnoActual;
        turnoSelect.replaceWith(turnoSpan);
    } else {
        // No hay forma de recuperar, cancelamos edición
        alert("No se pudo encontrar el turno actual.");
        return;
    }
    } else {
    turnoActual = turnoSpan.textContent.trim();
    }

    const selectTurno = document.createElement("select");
    selectTurno.id = "turnoEdit";
  
    const turnos = [
      "Lunes 14:30 a 16:00hs", "Lunes 16:30 a 18:00hs", "Lunes 18:30 a 20:00hs",
      "Martes 09:30 a 11:00hs", "Martes 16:30 a 18:00hs", "Martes 18:30 a 20:00hs",
      "Miércoles 16:30 a 18:00hs", "Miércoles 18:30 a 20:00hs",
      "Jueves 14:30 a 16:00hs", "Jueves 16:30 a 18:00hs", "Jueves 18:30 a 20:00hs",
      "Viernes 14:30 a 16:00hs", "Viernes 16:30 a 18:00hs", "Viernes 18:30 a 20:00hs",
      "Sábado 09:00 a 10:30hs", "Sábado 11:00 a 12:30hs"
    ];
    turnos.forEach(t => {
      const opt = new Option(t, t, false, t === turnoActual);
      selectTurno.appendChild(opt);
    });
    turnoSpan.replaceWith(selectTurno);
  
    document.getElementById("guardarFicha").style.display = "inline-block";
    document.getElementById("eliminarAlumno").style.display = "inline-block";
    document.getElementById("modoEdicionFicha").textContent = "Cancelar";
};
  
async function verificarPagoMes(alumnoId, mesTexto) {
    const res = await fetch(`${supabaseUrl}/rest/v1/pagos?alumno_id=eq.${alumnoId}&mes=eq.${mesTexto}&pago_mes=is.true`, {
      headers: headers()
    });
    const datos = await res.json();
    return datos.length > 0;
}
  
function obtenerRangoFechas(mesTexto) {
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                     "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const index = nombres.indexOf(mesTexto);
    const hoy = new Date();
    const año = hoy.getFullYear(); // o usar el año de inscripción si lo tenés
    const desde = new Date(año, index, 1);
    const hasta = new Date(año, index + 1, 0); // último día del mes
  
    return {
      desde: desde.toISOString().slice(0, 10),
      hasta: hasta.toISOString().slice(0, 10)
    };
}
   
