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

document.addEventListener("DOMContentLoaded", () => {
  const volverBtn = document.getElementById("volverMenu");
  if (volverBtn) {
    volverBtn.onclick = () => {
      const params = new URLSearchParams(window.location.search);
      const origen = params.get("from") || "index";
      window.location.href = `${origen}.html`;
    };
  }
});

document.getElementById("buscar").onclick = async () => {
  const tel = document.getElementById("telefono").value.trim().replace(/\D/g, "");
  if (!tel) {
    alert("Ingresá un número de teléfono válido.");
    return;
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.true&telefono=ilike.*${tel}*&select=id,nombre,apellido,telefono`, {
    headers: headers()
  });

  const alumnos = await res.json();
  const lista = document.getElementById("listaAlumnos");
  const contenedor = document.getElementById("resultado");
  lista.innerHTML = "";
  contenedor.style.display = alumnos.length ? "block" : "none";

  if (!alumnos.length) {
    alert("No se encontraron alumnos activos con ese teléfono.");
    return;
  }

  alumnos.forEach(a => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "10px";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = true;
    check.dataset.id = a.id;
    check.dataset.nombre = `${a.nombre} ${a.apellido}`;
    check.dataset.telefono = a.telefono;

    li.appendChild(check);
    li.appendChild(document.createTextNode(`${a.nombre} ${a.apellido}`));
    lista.appendChild(li);
  });
};

document.getElementById("darDeBaja").onclick = async () => {
  const seleccionados = Array.from(document.querySelectorAll("#listaAlumnos input:checked"));
  if (!seleccionados.length) {
    alert("Seleccioná al menos un alumno para dar de baja.");
    return;
  }

  const motivo = document.getElementById("motivoBaja").value.trim();
  if (!motivo) {
    alert("Por favor explicá brevemente el motivo de baja.");
    return;
  }

  let nombres = [];
  for (const input of seleccionados) {
    const id = input.dataset.id;
    nombres.push(input.dataset.nombre);

    const resAlumno = await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${id}&select=beneficiario_id`, {
      headers: headers()
    });
    const [alumno] = await resAlumno.json();

    if (alumno && alumno.beneficiario_id) {
      await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumno.beneficiario_id}`, {
        method: "PATCH",
        headers: {
          ...headers(),
          "Content-Type": "application/json",
          "prefer": "return=representation"
        },
        body: JSON.stringify({ tiene_promo: false, beneficiario_id: null })
      });
    }

    await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        ...headers(),
        "Content-Type": "application/json",
        "prefer": "return=representation"
      },
      body: JSON.stringify({ activo: false, tiene_promo: false, beneficiario_id: null })
    });
  }

  const texto = encodeURIComponent(
    `Solicitud de baja:\n👤 Alumno(s): ${nombres.join(", ")}\n📝 Motivo: ${motivo}`
  );
  const link = `https://wa.me/543412153057?text=${texto}`;
  window.open(link, "_blank");

  
  document.getElementById("resultado").style.display = "none";
  document.getElementById("telefono").value = "";
  document.getElementById("motivoBaja").value = "";
};
