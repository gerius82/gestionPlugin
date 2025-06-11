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

  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?telefono=ilike.*${tel}*&select=id,nombre,apellido,sede,turno_1`, {
    headers: headers()
  });
  const alumnos = await res.json();

  const contenedor = document.getElementById("resultado");
  const lista = document.getElementById("listaAlumnos");
  const infoCambio = document.getElementById("infoCambio");
  lista.innerHTML = "";
  contenedor.style.display = alumnos.length ? "block" : "none";
  infoCambio.style.display = "none";

  if (!alumnos.length) {
    alert("No se encontraron alumnos con ese teléfono.");
    return;
  }

  alumnos.forEach(a => {
    const li = document.createElement("li");
    li.textContent = `${a.nombre} ${a.apellido}`;
    lista.appendChild(li);
  });

  await mostrarTurnosDisponibles(alumnos);
};

async function mostrarTurnosDisponibles(alumnos) {
  const infoCambio = document.getElementById("infoCambio");
  infoCambio.style.display = "block";

  const turnoActual = document.getElementById("turnoActual");
  turnoActual.innerHTML = "";
  const turnosActuales = new Set(alumnos.map(a => a.turno_1));

  turnosActuales.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    turnoActual.appendChild(li);
  });

  const sede = alumnos[0].sede;
  const cantidad = alumnos.length;

  const resCupos = await fetch("turnos.json");
  const cuposMaximos = await resCupos.json();
  const turnosSede = Object.keys(cuposMaximos[sede] || {}).filter(t => !turnosActuales.has(t));

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
  cuadro.innerHTML = "";

  for (const turno of turnosSede) {
    const maximo = cuposMaximos[sede][turno];
    const actuales = conteoPorTurno[turno] || 0;
    const hayLugar = (maximo - actuales) >= cantidad;

    const div = document.createElement("div");
    div.className = "turno-opcion";
    div.textContent = turno;

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

  document.getElementById("btnWhatsapp").onclick = () => {
    const seleccionado = document.querySelector(".turno-opcion.seleccionado");
    if (!seleccionado) {
      alert("Seleccioná un nuevo turno antes de confirmar.");
      return;
    }

    const nuevoTurno = seleccionado.textContent;
    const mensaje = encodeURIComponent(
      `Solicitud de cambio de turno:\n` +
      alumnos.map(a => `Alumno: ${a.nombre} ${a.apellido}\nTurno actual: ${a.turno_1}\nNuevo turno: ${nuevoTurno}`).join("\n\n")
    );

    const link = `https://wa.me/543412153057?text=${mensaje}`;
    window.open(link, "_blank");
  };
}

document.getElementById("volverMenu").onclick = () => {
    const params = new URLSearchParams(window.location.search);
    const origen = params.get("from") || "index";
    window.location.href = `${origen}.html`;
};
  
