let supabaseUrl = "", supabaseKey = "";

fetch("config.json")
  .then(res => res.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
    return cargarResumenAsistencias();
  });

const headers = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`
});
/*
async function cargarResumenAsistencias() {
    const sedeSel = document.getElementById("filtroSede").value;
    const turnoSel = document.getElementById("filtroTurno").value;
  
    let filtro = "";
    if (sedeSel) filtro += `&sede=eq.${encodeURIComponent(sedeSel)}`;
    if (turnoSel) filtro += `&turno_1=eq.${encodeURIComponent(turnoSel)}`;
  
    const alumnosRes = await fetch(`${supabaseUrl}/rest/v1/inscripciones?select=id,nombre,apellido,turno_1,sede${filtro}`, {
      headers: headers()
    });
  
    const alumnos = await alumnosRes.json();
    const tbody = document.querySelector("#tablaResumen tbody");
    tbody.innerHTML = "";
  
    alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));


  for (const a of alumnos) {
    const asistenciaRes = await fetch(`${supabaseUrl}/rest/v1/asistencias?alumno_id=eq.${a.id}&select=tipo&order=fecha.desc&limit=10`, {
      headers: headers()
    });
    const registros = await asistenciaRes.json();

    const tr = document.createElement("tr");

    const tdNombre = document.createElement("td");
    tdNombre.textContent = `${a.nombre} ${a.apellido}`;

    const tdTurno = document.createElement("td");
    tdTurno.textContent = a.turno_1;

    const tdRegistro = document.createElement("td");
    registros.reverse().forEach(r => {
      const sq = document.createElement("span");
      sq.classList.add("square");
      if (r.tipo === "regular") sq.classList.add("verde");
      else if (r.tipo === "ausente") sq.classList.add("rojo");
      else if (r.tipo === "recuperacion") sq.classList.add("azul");
      tdRegistro.appendChild(sq);
    });

    tr.appendChild(tdNombre);
    tr.appendChild(tdTurno);
    tr.appendChild(tdRegistro);
    tbody.appendChild(tr);
  }
}
*/


async function cargarResumenAsistencias() {
    const sedeSel = document.getElementById("filtroSede").value;
    const turnoSel = document.getElementById("filtroTurno").value;
  
    let filtro = "";
    if (sedeSel) filtro += `&sede=eq.${encodeURIComponent(sedeSel)}`;
    if (turnoSel) filtro += `&turno_1=eq.${encodeURIComponent(turnoSel)}`;
  
    const alumnosRes = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.true&select=id,nombre,apellido,turno_1,sede${filtro}`, {

      headers: headers()
    });
    const alumnos = await alumnosRes.json();
    alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  
    // Lanzar todas las consultas en paralelo
    const asistenciaPromises = alumnos.map(a =>
      fetch(`${supabaseUrl}/rest/v1/asistencias?alumno_id=eq.${a.id}&select=tipo&order=fecha.desc&limit=10`, {
        headers: headers()
      }).then(res => res.json())
    );
  
    const asistenciasPorAlumno = await Promise.all(asistenciaPromises);
  
    const tbody = document.querySelector("#tablaResumen tbody");
    tbody.innerHTML = "";
  
    alumnos.forEach((a, idx) => {
      const registros = asistenciasPorAlumno[idx];
      const tr = document.createElement("tr");
  
      const tdNombre = document.createElement("td");
      tdNombre.textContent = `${a.nombre} ${a.apellido}`;
  
      const tdTurno = document.createElement("td");
      tdTurno.textContent = a.turno_1;
  
      const tdRegistro = document.createElement("td");
      registros.reverse().forEach(r => {
        const sq = document.createElement("span");
        sq.classList.add("square");
        if (r.tipo === "regular") sq.classList.add("verde");
        else if (r.tipo === "ausente") sq.classList.add("rojo");
        else if (r.tipo === "recuperacion") sq.classList.add("azul");
        tdRegistro.appendChild(sq);
      });
  
      tr.appendChild(tdNombre);
      tr.appendChild(tdTurno);
      tr.appendChild(tdRegistro);
      tbody.appendChild(tr);
    });
}
  


document.getElementById("filtroSede").addEventListener("change", () => {
    actualizarTurnos();
    cargarResumenAsistencias();
});
  
document.getElementById("filtroTurno").addEventListener("change", cargarResumenAsistencias);
  
async function actualizarTurnos() {
    const sede = document.getElementById("filtroSede").value;
    const turnoSelect = document.getElementById("filtroTurno");
    turnoSelect.innerHTML = `<option value="">Todos</option>`;
  
    const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?select=turno_1${sede ? `&sede=eq.${encodeURIComponent(sede)}` : ""}`, {
      headers: headers()
    });
    const datos = await res.json();
  
    const diasOrden = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  
    const turnosUnicos = [...new Set(datos.map(d => d.turno_1))];
  
    // Orden personalizado por día de la semana
    turnosUnicos.sort((a, b) => {
      const [diaA] = a.split(" ");
      const [diaB] = b.split(" ");
      const idxA = diasOrden.indexOf(diaA);
      const idxB = diasOrden.indexOf(diaB);
      return idxA - idxB || a.localeCompare(b);
    });
  
    turnosUnicos.forEach(turno => {
      turnoSelect.appendChild(new Option(turno, turno));
    });
}
  
  