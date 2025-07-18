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

  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?telefono=ilike.*${tel}*&select=id,nombre,apellido,sede, turno_1`, {
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
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = true;
    check.dataset.id = a.id;
    check.dataset.nombre = `${a.nombre} ${a.apellido}`;
    li.appendChild(check);
    li.appendChild(document.createTextNode(` ${a.nombre} ${a.apellido}`));
    lista.appendChild(li);
  });

  const sede = alumnos[0].sede;
  await mostrarInfoRecuperacion(alumnos, sede);
};

async function mostrarInfoRecuperacion(alumnos, sede) {
  document.getElementById("infoRecuperacion").style.display = "block";

  const ids = alumnos.map(a => a.id);
  /*
  const res = await fetch(`${supabaseUrl}/rest/v1/asistencias?alumno_id=in.(${ids.join(",")})&tipo=eq.ausente&order=fecha.desc&limit=4&select=fecha`, {
    headers: headers()
  });
  */

  const res = await fetch(`${supabaseUrl}/rest/v1/asistencias?alumno_id=in.(${ids.join(",")})&tipo=eq.ausente&recuperada=is.false&order=fecha.desc&limit=4&select=fecha`, {
    headers: headers()
  });
  

  const ausencias = await res.json();

const fechasIncluidas = new Set();
const selectFalta = document.getElementById("faltaSeleccionada");
selectFalta.innerHTML = "";

// Agregar ausencias pasadas
ausencias.forEach(a => {
  const [anio, mes, dia] = a.fecha.split("T")[0].split("-");
  const formateada = `${parseInt(dia)} de ${obtenerNombreMes(parseInt(mes))}`;
  const opt = document.createElement("option");
  opt.value = formateada;
  opt.textContent = formateada;
  selectFalta.appendChild(opt);
  fechasIncluidas.add(formateada);
});

// Estimar próxima fecha futura de clase
let seAgregoFutura = false;
const turnoAlumno = alumnos[0].turno_1?.toLowerCase(); // Ej: "lunes 18:00"
if (turnoAlumno) {
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const hoy = new Date();
  const [diaNombre] = turnoAlumno.split(" ");

  const diaDeseado = dias.findIndex(d => d === diaNombre);
  if (diaDeseado !== -1) {
    const proximaFecha = new Date(hoy);
    const deltaDias = (diaDeseado - hoy.getDay() + 7) % 7 || 7;
    proximaFecha.setDate(hoy.getDate() + deltaDias);

    const diaFuturo = proximaFecha.getDate();
    const mesFuturo = proximaFecha.getMonth() + 1;
    const formateadaFutura = `${diaFuturo} de ${obtenerNombreMes(mesFuturo)}`;

    if (!fechasIncluidas.has(formateadaFutura)) {
      const optFutura = document.createElement("option");
      optFutura.value = formateadaFutura;
      optFutura.textContent = `${formateadaFutura} (próxima clase)`;
      selectFalta.appendChild(optFutura);
      fechasIncluidas.add(formateadaFutura);
      seAgregoFutura = true;
    }
  }
}

// Si no hay ninguna fecha ni futura ni ausencias
if (ausencias.length === 0 && !seAgregoFutura) {
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "No hay fechas para recuperar";
  selectFalta.appendChild(opt);
}

  const resCupos = await fetch("turnos.json");
  const cuposMaximos = await resCupos.json();
  const turnosSede = Object.keys(cuposMaximos[sede] || {});

  const resInscriptos = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.true&sede=eq.${encodeURIComponent(sede)}&select=turno_1`, {
    headers: headers()
  });
  const inscriptos = await resInscriptos.json();

  const conteoPorTurno = {};
  inscriptos.forEach(i => {
    const turno = i.turno_1;
    conteoPorTurno[turno] = (conteoPorTurno[turno] || 0) + 1;
  });

  const cuadro = document.getElementById("cuadroTurnos");
  const mensajeNoTurnos = document.createElement("div");
  mensajeNoTurnos.textContent = "No hay turnos disponibles para la cantidad seleccionada.";
  mensajeNoTurnos.style.marginTop = "1rem";
  mensajeNoTurnos.style.color = "#c62828";
  mensajeNoTurnos.style.fontWeight = "bold";

  const renderTurnos = () => {
    cuadro.innerHTML = "";
    mensajeNoTurnos.remove();

    const seleccionados = document.querySelectorAll("#listaAlumnos input:checked").length;
    let disponibles = 0;

    for (const turno of turnosSede) {
      const maximo = cuposMaximos[sede][turno];
      const cantidad = conteoPorTurno[turno] || 0;

      const div = document.createElement("div");
      div.className = "turno-opcion";
      div.textContent = turno;

      if (cantidad + seleccionados > maximo) {
        div.classList.add("no-disponible");
        div.style.cursor = "not-allowed";
      } else {
        div.style.cursor = "pointer";
        div.onclick = () => {
          document.querySelectorAll(".turno-opcion").forEach(d => d.classList.remove("seleccionado"));
          div.classList.add("seleccionado");
        };
        disponibles++;
      }
      cuadro.appendChild(div);
    }

    if (disponibles === 0) {
      cuadro.parentElement.appendChild(mensajeNoTurnos);
    }
  };

  renderTurnos();
  document.querySelectorAll("#listaAlumnos input").forEach(input => {
    input.onchange = renderTurnos;
  });

  document.getElementById("btnWhatsapp").onclick = async () => {
    const falta = selectFalta.value || "sin especificar";
    const seleccionado = document.querySelector(".turno-opcion.seleccionado");
    if (!seleccionado) {
      alert("Seleccioná un turno antes de confirmar.");
      return;
    }

    const turno = seleccionado.textContent;
    const seleccionados = Array.from(document.querySelectorAll("#listaAlumnos input:checked"));
    const nombres = seleccionados.map(i => i.dataset.nombre);

    if (!nombres.length) {
      alert("Seleccioná al menos un alumno para recuperar.");
      return;
    }

    const mensaje = encodeURIComponent(
      `_Solicitud de recuperación de clase:_\n` +
      `👤 *Solicitante:* ${nombres.join("\n👤 *Solicitante:* ")}\n` +
      `❌ *Ausencia:* ${falta}\n` +
      `✅ *Recupera:* ${turno}`
    );

    const link = `https://wa.me/543412153057?text=${mensaje}`;
    window.open(link, "_blank");

    const alumnosSeleccionados = Array.from(document.querySelectorAll("#listaAlumnos input:checked"));
    const fechaFaltaISO = convertirFechaTextoAISO(falta);
    const turnoRecuperacion = seleccionado.textContent;

    for (const alumno of alumnosSeleccionados) {
      const alumnoId = alumno.dataset.id;

      if (!falta.toLowerCase().includes("próxima")) {
        const resBuscar = await fetch(`${supabaseUrl}/rest/v1/asistencias?alumno_id=eq.${alumnoId}&fecha=eq.${fechaFaltaISO}&tipo=eq.ausente&select=id`, {
          headers: headers()
        });
        const [registro] = await resBuscar.json();
        if (registro?.id) {
          await fetch(`${supabaseUrl}/rest/v1/asistencias?id=eq.${registro.id}`, {
            method: "PATCH",
            headers: {
              ...headers(),
              "Content-Type": "application/json",
              "prefer": "return=representation"
            },
            body: JSON.stringify({ recuperada: true })
          });
        }
      } else {
        const fechaProximaISO = convertirFechaTextoAISO(falta);
        await fetch(`${supabaseUrl}/rest/v1/asistencias`, {
          method: "POST",
          headers: {
            ...headers(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            alumno_id: alumnoId,
            fecha: fechaProximaISO,
            tipo: "ausente",
            recuperada: true,
            turno: alumnos[0].turno_1,
            sede: alumnos[0].sede
          })
        });
      }

      const fechaHoy = new Date().toISOString().split("T")[0];

      await fetch(`${supabaseUrl}/rest/v1/asistencias`, {
        method: "POST",
        headers: {
          ...headers(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          alumno_id: alumnoId,
          fecha: fechaHoy,
          tipo: "recuperacion",
          turno: turnoRecuperacion,
          sede: alumnos[0].sede
        })
      });
    }
  };
}

function obtenerNombreMes(mes) {
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
                 "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return meses[mes - 1];
}

document.getElementById("volverMenu").onclick = () => {
  const params = new URLSearchParams(window.location.search);
  const origen = params.get("from") || "index";
  window.location.href = `${origen}.html`;
};

function convertirFechaTextoAISO(texto) {
    const partes = texto.split(" ");
    const dia = partes[0].padStart(2, '0');
    const mesTexto = partes[2];
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
                   "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const mes = (meses.indexOf(mesTexto.toLowerCase()) + 1).toString().padStart(2, '0');
    const hoy = new Date();
    const año = hoy.getFullYear();
    return `${año}-${mes}-${dia}`;
  }
  
