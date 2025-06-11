let supabaseUrl = "", supabaseKey = "";

fetch("config.json")
  .then(res => res.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
  });

const headers = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`
});

document.getElementById("buscar").onclick = async () => {
  const tel = document.getElementById("telefono").value.trim().replace(/\D/g, "");
  if (!tel) {
    alert("Ingresá un número de teléfono válido.");
    return;
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?telefono=ilike.*${tel}*&select=id,nombre,apellido`, {
    headers: headers()
  });
  const alumnos = await res.json();

  const contenedor = document.getElementById("resultado");
  const lista = document.getElementById("listaAlumnos");
  const infoRecuperacion = document.getElementById("infoRecuperacion");
  lista.innerHTML = "";
  contenedor.style.display = alumnos.length ? "block" : "none";
  infoRecuperacion.style.display = "none";

  if (!alumnos.length) {
    alert("No se encontraron alumnos con ese teléfono.");
    return;
  }

  alumnos.forEach(a => {
    const li = document.createElement("li");
    li.textContent = `${a.nombre} ${a.apellido}`;
    lista.appendChild(li);
  });

  // Por ahora tomamos el primer alumno como referencia
  const alumno = alumnos[0];
  await mostrarInfoRecuperacion(alumno.id);
};

async function mostrarInfoRecuperacion(alumnoId) {
  document.getElementById("infoRecuperacion").style.display = "block";

  // 🔍 Traer ausencias reales
  const res = await fetch(`${supabaseUrl}/rest/v1/asistencias?alumno_id=eq.${alumnoId}&tipo=eq.ausente&order=fecha.desc&limit=4&select=fecha`, {
    headers: headers()
  });
  const ausencias = await res.json();

  const selectFalta = document.getElementById("faltaSeleccionada");
  selectFalta.innerHTML = "";

  if (!ausencias.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No hay ausencias registradas";
    selectFalta.appendChild(opt);
  } else {
    ausencias.forEach(a => {
      const opt = document.createElement("option");
      const [anio, mes, dia] = a.fecha.split("T")[0].split("-");
      const formateada = `${parseInt(dia)} de ${obtenerNombreMes(parseInt(mes))}`;
      opt.value = formateada;
      opt.textContent = formateada;
      selectFalta.appendChild(opt);
    });
  }

  
  // 🔄 Obtener sede del alumno
const resAlumno = await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumnoId}&select=sede`, {
    headers: headers()
  });
  const alumnoData = await resAlumno.json();
  const sede = alumnoData[0]?.sede;
  
  if (!sede) {
    alert("No se encontró la sede del alumno.");
    return;
  }
  
  // 🧾 Cargar cupos máximos desde JSON
  const resCupos = await fetch("turnos.json");
  const cuposMaximos = await resCupos.json();
  
  // 🧩 Turnos definidos para esa sede
  const turnosSede = Object.keys(cuposMaximos[sede] || {});
  const cuadro = document.getElementById("cuadroTurnos");
  cuadro.innerHTML = "";
  
  for (const turno of turnosSede) {
    const maximo = cuposMaximos[sede][turno];
  
    // Buscar cantidad actual
    const r = await fetch(`${supabaseUrl}/rest/v1/inscripciones?sede=eq.${sede}&turno_1=eq.${encodeURIComponent(turno)}&activo=eq.true&select=id`, {
      headers: headers()
    });
    const inscriptos = await r.json();
    const cantidad = inscriptos.length;
  
    const div = document.createElement("div");
    div.className = "turno-opcion";
    div.textContent = turno;
  
    const hayLugar = cantidad < maximo;
  
    if (!hayLugar) {
      div.classList.add("no-disponible");
      div.style.cursor = "not-allowed";
      div.style.backgroundColor = "#fce4ec";
      div.style.border = "1px solid #f8bbd0";
    } else {
      div.onclick = () => {
        document.querySelectorAll(".turno-opcion").forEach(d => d.classList.remove("seleccionado"));
        div.classList.add("seleccionado");
      };
    }
  
    cuadro.appendChild(div);
}
  
  

  // WhatsApp
  document.getElementById("btnWhatsapp").onclick = () => {
    const falta = selectFalta.value || "sin especificar";
    const seleccionado = document.querySelector(".turno-opcion.seleccionado");
    if (!seleccionado) {
      alert("Seleccioná un turno antes de confirmar.");
      return;
    }

    const turno = seleccionado.textContent;
    const mensaje = encodeURIComponent(
      `Solicitud de recuperación de clase:\n❌ Ausencia: ${falta}\n✅ Recupera: ${turno}`
    );

    const link = `https://wa.me/543412153057?text=${mensaje}`;
    window.open(link, "_blank");
  };
}

function obtenerNombreMes(mes) {
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
                   "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return meses[mes - 1];
  }
  
