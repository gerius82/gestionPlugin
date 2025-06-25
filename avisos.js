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
  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.true&select=nombre,apellido,telefono`, {
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

  //alumnosActivos.forEach(a => {
    alumnosActivos
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .forEach(a => {
    const li = document.createElement("li");
    const tel = a.telefono?.replace(/\D/g, "");
    if (!tel) return;

    const mensajePersonalizado = `Hola ${a.nombre}, ${mensajeBase}`;
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
