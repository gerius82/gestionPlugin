let supabaseUrl = "", supabaseKey = "";
let alumnosActivos = [];

fetch("config.json")
  .then(res => res.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
    return fetchAlumnosActivos();
  })
  .then(alumnos => {
    alumnosActivos = alumnos;
  });

const headers = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`
});

async function fetchAlumnosActivos() {
  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.true&select=nombre,apellido,telefono,creado_en`, {
    headers: headers()
  });
  return await res.json();
}

document.getElementById("guardar").onclick = () => {
  const mensajeBase = document.getElementById("mensaje").value.trim();
  const lista = document.getElementById("listaAlumnos");
  lista.innerHTML = "";

  if (!mensajeBase) {
    alert("Escribí un mensaje primero.");
    return;
  }
  const criterio = document.getElementById("ordenarPor").value;

  //alumnosActivos.forEach(a => {
    alumnosActivos
    .slice()
    .sort((a, b) => {
      if (criterio === "fecha_desc") {
        return new Date(b.creado_en) - new Date(a.creado_en); // más reciente primero
      } else if (criterio === "fecha_asc") {
        return new Date(a.creado_en) - new Date(b.creado_en); // más antigua primero
      } else if (criterio === "nombre") {
        return a.nombre.localeCompare(b.nombre);
      }
      return 0;
    })
    .forEach(a => {
    const li = document.createElement("li");
    const tel = a.telefono?.replace(/\D/g, "");
    if (!tel) return;

    const mensajePersonalizado = `${mensajeBase}`;
    const url = `https://wa.me/54${tel}?text=${encodeURIComponent(mensajePersonalizado)}`;

    const btn = document.createElement("a");
    btn.href = url;
    btn.target = "_blank";
    btn.className = "boton-verde";
    btn.textContent = "Enviar aviso";

    li.textContent = `${a.nombre} ${a.apellido} `;
    li.appendChild(btn);
    lista.appendChild(li);
  });
};

document.getElementById("cancelar").onclick = () => {
  document.getElementById("mensaje").value = "";
  document.getElementById("listaAlumnos").innerHTML = "";
};
