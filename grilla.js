<<<<<<< HEAD
let supabaseUrl = "", supabaseKey = "", cuposMaximosPorTurno = {}, inscripciones = [];

fetch("config.json")
  .then(res => res.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
    return fetch("turnos.json");
  })
  .then(res => res.json())
  .then(data => {
    cuposMaximosPorTurno = data;
    iniciarGrilla();
  });

const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const bloquesVisuales = ['fila1', 'fila2', 'fila3'];

const asignacionDeTurnos = {
  'Lunes 14:30 a 16:00': 'fila1',
  'Lunes 16:30 a 18:00': 'fila2',
  'Lunes 18:30 a 20:00': 'fila3',
  'Martes 09:30 a 11:00': 'fila1',
  'Martes 16:30 a 18:00': 'fila2',
  'Martes 18:30 a 20:00': 'fila3',
  'Miércoles 16:30 a 18:00': 'fila2',
  'Miércoles 18:30 a 20:00': 'fila3',
  'Jueves 14:30 a 16:00': 'fila1',
  'Jueves 16:30 a 18:00': 'fila2',
  'Jueves 18:30 a 20:00': 'fila3',
  'Viernes 14:30 a 16:00': 'fila1',
  'Viernes 16:30 a 18:00': 'fila2',
  'Viernes 18:30 a 20:00': 'fila3',
  'Sábado 09:00 a 10:30': 'fila1',
  'Sábado 11:00 a 12:30': 'fila2'
};

async function fetchInscripciones() {
  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?select=nombre,apellido,edad,sede,turno_1,creado_en&order=creado_en`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  return await res.json();
}


function agrupar(inscripciones, sedeFiltro) {
  const mapa = {};
  dias.forEach(dia => {
    mapa[dia] = {};
    bloquesVisuales.forEach(fila => {
      mapa[dia][fila] = { turnoLabel: null, inscriptos: [] };
    });
  });

  inscripciones.forEach(insc => {
    if (!insc.turno_1 || (sedeFiltro && insc.sede !== sedeFiltro)) return;

    const turno = insc.turno_1.trim().replace(/hs$/i, '');
    const fila = asignacionDeTurnos[turno];
    const dia = turno.split(" ")[0];

    if (!fila || !mapa[dia]) return;

    if (mapa[dia][fila]) {
      mapa[dia][fila].turnoLabel = turno;
      mapa[dia][fila].inscriptos.push(insc);
    }
  });

  Object.entries(cuposMaximosPorTurno[sedeFiltro] || {}).forEach(([turno, max]) => {
    const normalizado = turno.trim().replace(/hs$/i, '');
    const dia = normalizado.split(" ")[0];
    const fila = asignacionDeTurnos[normalizado];
    if (mapa[dia] && mapa[dia][fila] && !mapa[dia][fila].turnoLabel) {
      mapa[dia][fila].turnoLabel = normalizado;
    }
  });

  return mapa;
}

function renderGrilla(mapa, sede) {
  const container = document.getElementById("grillaContainer");
  container.innerHTML = '';
  container.style.display = 'table';
  container.style.borderSpacing = '8px';
  container.style.width = '100%';

  const headerRow = document.createElement("div");
  headerRow.style.display = "table-row";

  dias.forEach(dia => {
    const cell = document.createElement("div");
    cell.textContent = dia;
    cell.style.display = "table-cell";
    cell.style.textAlign = "center";
    cell.style.fontWeight = "bold";
    cell.style.fontSize = "16px";
    headerRow.appendChild(cell);
  });

  container.appendChild(headerRow);

  bloquesVisuales.forEach(fila => {
    const row = document.createElement("div");
    row.style.display = "table-row";

    dias.forEach(dia => {
      const celda = mapa[dia][fila];
      const lista = celda?.inscriptos || [];
      const turno = celda?.turnoLabel;
      const clave = turno ? `${turno}hs` : '';
      const max = cuposMaximosPorTurno[sede]?.[clave] ?? 13;
      const completo = lista.length >= max;

      const cell = document.createElement("div");
      cell.style.display = "table-cell";
      cell.style.border = "1px solid #ccc";
      cell.style.borderRadius = "6px";
      cell.style.padding = "0.5rem";
      cell.style.background = completo ? "#ffe6e6" : "#e6ffe6";
      cell.style.height = "340px";
      cell.style.overflowY = "auto";
      cell.style.fontSize = "13px";
      cell.style.minWidth = "160px";
      cell.style.verticalAlign = "top";

      const soloHorario = turno?.split(" ").slice(1).join(" ") ?? '';
      const titulo = document.createElement("h5");
      titulo.style.margin = "0 0 6px";
      titulo.style.textAlign = "center";
      titulo.style.fontSize = "14px";
      titulo.textContent = turno ? `${soloHorario} (${lista.length}/${max})${completo ? " - Lista de espera" : ""}` : '';
      cell.appendChild(titulo);

      const tabla = document.createElement("table");
      tabla.style.width = "100%";
      tabla.style.borderCollapse = "collapse";

      lista.forEach((a, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td style="padding:2px 4px;">${i + 1}</td><td>${a.nombre} ${a.apellido}</td><td>${a.edad ?? ''}</td>`;
        tabla.appendChild(row);
      });

      cell.appendChild(tabla);
      row.appendChild(cell);
    });

    container.appendChild(row);
  });
}

function iniciarGrilla() {
  fetchInscripciones().then(data => {
    inscripciones = data;
    const sede = document.getElementById('selectorSede').value;
    const mapa = agrupar(inscripciones, sede);
    renderGrilla(mapa, sede);
  });

  document.getElementById('selectorSede').addEventListener('change', () => {
    const sede = document.getElementById('selectorSede').value;
    const mapa = agrupar(inscripciones, sede);
    renderGrilla(mapa, sede);
  });
}
=======
let supabaseUrl = "", supabaseKey = "", cuposMaximosPorTurno = {}, inscripciones = [];

fetch("config.json")
  .then(res => res.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
    return fetch("turnos.json");
  })
  .then(res => res.json())
  .then(data => {
    cuposMaximosPorTurno = data;
    iniciarGrilla();
  });

const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const bloquesVisuales = ['fila1', 'fila2', 'fila3'];

const asignacionDeTurnos = {
  'Lunes 14:30 a 16:00': 'fila1',
  'Lunes 16:30 a 18:00': 'fila2',
  'Lunes 18:30 a 20:00': 'fila3',
  'Martes 09:30 a 11:00': 'fila1',
  'Martes 16:30 a 18:00': 'fila2',
  'Martes 18:30 a 20:00': 'fila3',
  'Miércoles 16:30 a 18:00': 'fila2',
  'Miércoles 18:30 a 20:00': 'fila3',
  'Jueves 14:30 a 16:00': 'fila1',
  'Jueves 16:30 a 18:00': 'fila2',
  'Jueves 18:30 a 20:00': 'fila3',
  'Viernes 14:30 a 16:00': 'fila1',
  'Viernes 16:30 a 18:00': 'fila2',
  'Viernes 18:30 a 20:00': 'fila3',
  'Sábado 09:00 a 10:30': 'fila1',
  'Sábado 11:00 a 12:30': 'fila2'
};

async function fetchInscripciones() {
  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?select=nombre,apellido,edad,sede,turno_1,creado_en&order=creado_en`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  return await res.json();
}


function agrupar(inscripciones, sedeFiltro) {
  const mapa = {};
  dias.forEach(dia => {
    mapa[dia] = {};
    bloquesVisuales.forEach(fila => {
      mapa[dia][fila] = { turnoLabel: null, inscriptos: [] };
    });
  });

  inscripciones.forEach(insc => {
    if (!insc.turno_1 || (sedeFiltro && insc.sede !== sedeFiltro)) return;

    const turno = insc.turno_1.trim().replace(/hs$/i, '');
    const fila = asignacionDeTurnos[turno];
    const dia = turno.split(" ")[0];

    if (!fila || !mapa[dia]) return;

    if (mapa[dia][fila]) {
      mapa[dia][fila].turnoLabel = turno;
      mapa[dia][fila].inscriptos.push(insc);
    }
  });

  Object.entries(cuposMaximosPorTurno[sedeFiltro] || {}).forEach(([turno, max]) => {
    const normalizado = turno.trim().replace(/hs$/i, '');
    const dia = normalizado.split(" ")[0];
    const fila = asignacionDeTurnos[normalizado];
    if (mapa[dia] && mapa[dia][fila] && !mapa[dia][fila].turnoLabel) {
      mapa[dia][fila].turnoLabel = normalizado;
    }
  });

  return mapa;
}

function renderGrilla(mapa, sede) {
  const container = document.getElementById("grillaContainer");
  container.innerHTML = '';
  container.style.display = 'table';
  container.style.borderSpacing = '8px';
  container.style.width = '100%';

  const headerRow = document.createElement("div");
  headerRow.style.display = "table-row";

  dias.forEach(dia => {
    const cell = document.createElement("div");
    cell.textContent = dia;
    cell.style.display = "table-cell";
    cell.style.textAlign = "center";
    cell.style.fontWeight = "bold";
    cell.style.fontSize = "16px";
    headerRow.appendChild(cell);
  });

  container.appendChild(headerRow);

  bloquesVisuales.forEach(fila => {
    const row = document.createElement("div");
    row.style.display = "table-row";

    dias.forEach(dia => {
      const celda = mapa[dia][fila];
      const lista = celda?.inscriptos || [];
      const turno = celda?.turnoLabel;
      const clave = turno ? `${turno}hs` : '';
      const max = cuposMaximosPorTurno[sede]?.[clave] ?? 13;
      const completo = lista.length >= max;

      const cell = document.createElement("div");
      cell.style.display = "table-cell";
      cell.style.border = "1px solid #ccc";
      cell.style.borderRadius = "6px";
      cell.style.padding = "0.5rem";
      cell.style.background = completo ? "#ffe6e6" : "#e6ffe6";
      cell.style.height = "340px";
      cell.style.overflowY = "auto";
      cell.style.fontSize = "13px";
      cell.style.minWidth = "160px";
      cell.style.verticalAlign = "top";

      const soloHorario = turno?.split(" ").slice(1).join(" ") ?? '';
      const titulo = document.createElement("h5");
      titulo.style.margin = "0 0 6px";
      titulo.style.textAlign = "center";
      titulo.style.fontSize = "14px";
      titulo.textContent = turno ? `${soloHorario} (${lista.length}/${max})${completo ? " - Lista de espera" : ""}` : '';
      cell.appendChild(titulo);

      const tabla = document.createElement("table");
      tabla.style.width = "100%";
      tabla.style.borderCollapse = "collapse";

      lista.forEach((a, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td style="padding:2px 4px;">${i + 1}</td><td>${a.nombre} ${a.apellido}</td><td>${a.edad ?? ''}</td>`;
        tabla.appendChild(row);
      });

      cell.appendChild(tabla);
      row.appendChild(cell);
    });

    container.appendChild(row);
  });
}

function iniciarGrilla() {
  fetchInscripciones().then(data => {
    inscripciones = data;
    const sede = document.getElementById('selectorSede').value;
    const mapa = agrupar(inscripciones, sede);
    renderGrilla(mapa, sede);
  });

  document.getElementById('selectorSede').addEventListener('change', () => {
    const sede = document.getElementById('selectorSede').value;
    const mapa = agrupar(inscripciones, sede);
    renderGrilla(mapa, sede);
  });
}
>>>>>>> cdd0a8e (Primer commit automático)
