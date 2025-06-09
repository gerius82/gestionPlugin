let supabaseUrl = "", supabaseKey = "";
let cuposMaximos = {};
let todosLosAlumnos = [];
let recuperadores = [];

// Mostrar mensaje de carga
const mensajeCarga = document.createElement("p");
mensajeCarga.id = "mensajeCarga";
mensajeCarga.textContent = "Cargando alumnos...";
document.querySelector(".container").prepend(mensajeCarga);

document.getElementById("buscar").disabled = true;

fetch("config.json")
  .then(res => res.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
    return fetch("turnos.json")
  })
  .then(res => res.json())
  .then(turnos => {
    cuposMaximos = turnos;
    return fetchAlumnos();
  })
  .then(alumnos => {
    todosLosAlumnos = alumnos;
    cargarRecuperadores();
    document.getElementById("buscar").disabled = false;
    document.getElementById("mensajeCarga").remove();
  });

const headers = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`
});

async function fetchAlumnos() {
    const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.true&select=id,nombre,apellido,sede,turno_1,curso,creado_en`, {
      headers: headers()
    });
    return await res.json();
}
  

function turnoCompleto(dia, horario) {
  return `${dia} ${horario}`;
}

function filtrarHorarios(sede, dia) {
  const select = document.getElementById("horario");
  select.innerHTML = '<option value="">-- Seleccionar horario --</option>';

  const turnos = Object.keys(cuposMaximos[sede] || {});
  const horariosUnicos = turnos.filter(t => t.startsWith(dia)).map(t => t.split(" ").slice(1).join(" "));

  horariosUnicos.forEach(h => {
    const op = new Option(h, h);
    select.appendChild(op);
  });
}

function mostrarAlumnos(turno, sede) {
  const lista = document.getElementById("listaAlumnos");
  lista.innerHTML = "";

  const alumnosDelTurno = todosLosAlumnos.filter(a => a.sede === sede && a.turno_1 === turno);
  alumnosDelTurno.sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en));


  alumnosDelTurno.forEach(alumno => {
    const li = document.createElement("li");
    
    li.innerHTML = `
    <label>
        <input type="checkbox" name="presente" value="${alumno.id}" checked>
        ${alumno.nombre} ${alumno.apellido}
        <span class="curso">${alumno.curso || ""}</span>
    </label>`;

    lista.appendChild(li);
  });
}

function cargarRecuperadores() {
  const select = document.getElementById("recuperador");
  select.innerHTML = '<option value="">-- Seleccionar alumno para agregar como recuperador --</option>';

  todosLosAlumnos
  .sort((a, b) => a.nombre.localeCompare(b.nombre))
  .forEach(a => {
    const op = new Option(`${a.nombre} ${a.apellido}`, a.id);
    select.appendChild(op);
  });


  select.onchange = () => {
    const id = select.value;
    if (!id) return;
    const alumno = todosLosAlumnos.find(a => a.id === id);
    if (!alumno || recuperadores.some(r => r.id === id)) return;

    recuperadores.push(alumno);
    actualizarListaRecuperadores();
  };
}

function actualizarListaRecuperadores() {
    const ul = document.getElementById("listaRecuperadores");
    ul.innerHTML = "";
    recuperadores.forEach((a, index) => {
      const li = document.createElement("li");
      li.textContent = `${a.nombre} ${a.apellido}`;
      li.style.cursor = "pointer";
      li.title = "Clic para quitar";
  
      li.onclick = () => {
        recuperadores.splice(index, 1);
        actualizarListaRecuperadores();
      };
  
      ul.appendChild(li);
    });
    
}
  
function guardarAsistencia(fecha, turno, sede) {
    const presentesIds = [...document.querySelectorAll("input[name='presente']:checked")].map(el => el.value);
    const todosIds = [...document.querySelectorAll("input[name='presente']")].map(el => el.value);
    const ausentesIds = todosIds.filter(id => !presentesIds.includes(id));
  
    const registros = [
      ...presentesIds.map(id => ({ alumno_id: id, fecha, turno, sede, tipo: "regular" })),
      ...recuperadores.map(a => ({ alumno_id: a.id, fecha, turno, sede, tipo: "recuperacion" })),
      ...ausentesIds.map(id => ({ alumno_id: id, fecha, turno, sede, tipo: "ausente" }))
    ];
  
    return Promise.all(registros.map(reg => {
      return fetch(`${supabaseUrl}/rest/v1/asistencias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers()
        },
        body: JSON.stringify(reg)
      });
    }));
}
  


// Eventos

document.getElementById("sede").addEventListener("change", () => {
  const sede = document.getElementById("sede").value;
  const dia = document.getElementById("dia").value;
  if (sede && dia) filtrarHorarios(sede, dia);
});

document.getElementById("dia").addEventListener("change", () => {
  const sede = document.getElementById("sede").value;
  const dia = document.getElementById("dia").value;
  if (sede && dia) filtrarHorarios(sede, dia);
});

document.getElementById("buscar").onclick = () => {
  const sede = document.getElementById("sede").value;
  const dia = document.getElementById("dia").value;
  const horario = document.getElementById("horario").value;
  if (!sede || !dia || !horario) return;

  const turno = turnoCompleto(dia, horario);
  mostrarAlumnos(turno, sede);

  document.getElementById("asistenciaContainer").style.display = "block";
};

document.getElementById("formAsistencia").addEventListener("submit", async function (e) {
  e.preventDefault();
  const sede = document.getElementById("sede").value;
  const dia = document.getElementById("dia").value;
  const horario = document.getElementById("horario").value;
  const turno = turnoCompleto(dia, horario);
  const fechaSeleccionada = document.getElementById("fecha").value;
  const fecha = fechaSeleccionada || new Date().toISOString().split('T')[0];

  await guardarAsistencia(fecha, turno, sede);
  alert("Asistencia guardada correctamente.");
  this.reset();
  document.getElementById("asistenciaContainer").style.display = "none";
  recuperadores = [];
  actualizarListaRecuperadores();
});

document.getElementById("volverMenu").onclick = () => {
    window.location.href = "index.html"; // Cambiar si el archivo se llama distinto
};

/*
document.getElementById("volverMenu").onclick = () => {
    const origen = localStorage.getItem("origenMenu") || "index.html";
    window.location.href = origen;
};
*/

document.getElementById("volverMenu").onclick = () => {
    const params = new URLSearchParams(window.location.search);
    const origen = params.get("from") || "index";
    window.location.href = `${origen}.html`;
  };