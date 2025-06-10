let supabaseUrl = "", supabaseKey = "";

fetch("config.json")
  .then(res => res.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
    return cargarInactivos();
  });

const headers = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`
});

async function cargarInactivos() {
  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.false&select=id,nombre,apellido,telefono`, {
    headers: headers()
  });

  const alumnos = await res.json();
  alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const tbody = document.querySelector("#tablaInactivos tbody");
  tbody.innerHTML = "";

  for (const a of alumnos) {
    const tr = document.createElement("tr");

    // Nombre
    const tdNombre = document.createElement("td");
    tdNombre.textContent = `${a.nombre} ${a.apellido}`;

    
    // WhatsApp
const tdWA = document.createElement("td");

if (a.telefono) {
  const tel = a.telefono.replace(/\D/g, "");
  const nombre = `${a.nombre} ${a.apellido}`;
  const mensajeDefault = `Hola ${nombre}, ¿cómo estás? 🌟

Nos encantaría volver a verte en las clases de robótica 🤖. Si querés retomar, te ayudamos a reactivar tu inscripción. ¡Contanos!

¡Saludos del equipo de Plugin! 👋`;

  const container = document.createElement("div");
  container.className = "wa-container";

  const btnMostrar = document.createElement("button");
  btnMostrar.className = "boton-verde";
  btnMostrar.textContent = "Enviar";

  const textarea = document.createElement("textarea");
  textarea.value = mensajeDefault;
  textarea.className = "wa-mensaje";
  textarea.style.display = "none";

  const btnEnviar = document.createElement("button");
  btnEnviar.className = "boton-verde";
  btnEnviar.textContent = "Enviar mensaje";
  btnEnviar.style.display = "none";

  const btnCancelar = document.createElement("button");
  btnCancelar.className = "boton-gris";
  btnCancelar.textContent = "Cancelar";
  btnCancelar.style.display = "none";

  btnMostrar.onclick = () => {
    btnMostrar.style.display = "none";
    textarea.style.display = "block";
    textarea.style.height = "120px";
    btnEnviar.style.display = "inline-block";
    btnCancelar.style.display = "inline-block";
  };

  btnCancelar.onclick = () => {
    textarea.value = mensajeDefault;
    textarea.style.display = "none";
    btnEnviar.style.display = "none";
    btnCancelar.style.display = "none";
    btnMostrar.style.display = "inline-block";
  };

  btnEnviar.onclick = () => {
    const mensaje = encodeURIComponent(textarea.value.trim());
    const link = `https://wa.me/54${tel}?text=${mensaje}`;
    window.open(link, "_blank");
    btnCancelar.click(); // vuelve al estado inicial
  };

  const contenedorBotones = document.createElement("div");
  contenedorBotones.className = "wa-botones";
  contenedorBotones.appendChild(btnEnviar);
  contenedorBotones.appendChild(btnCancelar);

  container.appendChild(btnMostrar);
  container.appendChild(textarea);
  container.appendChild(contenedorBotones);

  tdWA.appendChild(container);
} else {
  tdWA.textContent = "—";
}

    

    // Reactivar
    const tdReactivar = document.createElement("td");
    const btnReact = document.createElement("button");
    btnReact.className = "boton-verde";
    btnReact.textContent = "Reactivar";
    btnReact.onclick = async () => {
      await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${a.id}`, {
        method: "PATCH",
        headers: {
          ...headers(),
          "Content-Type": "application/json",
          "prefer": "return=representation"
        },
        body: JSON.stringify({ activo: true })
      });
      alert("Alumno reactivado con éxito");
      location.reload();
    };
    tdReactivar.appendChild(btnReact);

    tr.appendChild(tdNombre);
    tr.appendChild(tdWA);
    tr.appendChild(tdReactivar);
    tbody.appendChild(tr);
  }
}
