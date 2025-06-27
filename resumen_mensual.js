let supabaseUrl = "", supabaseKey = "", valores = {};

fetch("config.json")
  .then(r => r.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
    return fetch("valores.json")
  })
  .then(r => r.json())
  .then(json => {
    valores = json;
    cargarEstadisticas();
  });

const headers = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`
});

function aplicarColores(id, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.fontWeight = "bold";
  el.style.padding = "0.2rem 0.5rem";
  el.style.borderRadius = "6px";

  if (tipo === "verde") {
    el.style.backgroundColor = "#d4edda";
    el.style.color = "#155724";
  } else if (tipo === "rojo") {
    el.style.backgroundColor = "#f8d7da";
    el.style.color = "#721c24";
  } else if (tipo === "amarillo") {
    el.style.backgroundColor = "#fff3cd";
    el.style.color = "#856404";
  } else {
    el.style.backgroundColor = "#e2e3e5";
    el.style.color = "#383d41";
  }
}

async function cargarEstadisticas() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();
  const desde = new Date(año, mes, 1).toISOString();
  const hasta = new Date(año, mes + 1, 0).toISOString();

  const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const mesNombre = nombres[mes];

  // Inscripciones nuevas
  const inscripciones = await fetch(`${supabaseUrl}/rest/v1/inscripciones?creado_en=gte.${desde}&creado_en=lte.${hasta}`, { headers: headers() }).then(r => r.json());
  document.getElementById("nuevos").textContent = `${inscripciones.length} alumnos`;
  aplicarColores("nuevos", "verde");

  // Inactivaciones
  const inactivos = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.false&actualizado_en=gte.${desde}&actualizado_en=lte.${hasta}`, { headers: headers() }).then(r => r.json());
  document.getElementById("inactivos").textContent = `${inactivos.length} alumnos`;
  aplicarColores("inactivos", "rojo");

  // Pagos del mes
  const pagos = await fetch(`${supabaseUrl}/rest/v1/pagos?mes=eq.${mesNombre}&pago_mes=is.true&select=alumno_id`, { headers: headers() }).then(r => r.json());

  const alumnoIds = pagos.map(p => p.alumno_id);
  const filtroIds = `or=(${[...new Set(alumnoIds)].map(id => `id.eq.${id}`).join(',')})`;
  const alumnos = alumnoIds.length > 0 ? await fetch(`${supabaseUrl}/rest/v1/inscripciones?${filtroIds}&select=id,tiene_promo`, { headers: headers() }).then(r => r.json()) : [];
  const promoMap = new Map(alumnos.map(a => [a.id, a.tiene_promo]));

  let promoCount = 0;
  let normalCount = 0;

  alumnoIds.forEach(id => {
    const tienePromo = promoMap.get(id);
    if (tienePromo) {
      promoCount++;
    } else {
      normalCount++;
    }
  });

  const totalEstimado = (normalCount * valores.cuota_normal) + (promoCount * valores.cuota_promo);
  document.getElementById("totalPagado").textContent = `$${totalEstimado.toLocaleString("es-AR")}`;
  aplicarColores("totalPagado", "amarillo");

  document.getElementById("equivalenteAlumnos").textContent = `${normalCount} cuota normal / ${promoCount} con promo`;

  const activos = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.true&select=id,tiene_promo`, { headers: headers() }).then(r => r.json());
  const activosIds = activos.map(a => a.id);
  const pagosIds = [...new Set(alumnoIds)];
  const sinPago = activosIds.filter(id => !pagosIds.includes(id));
  document.getElementById("sinPago").textContent = `${sinPago.length} alumnos`;
  aplicarColores("sinPago", sinPago.length === 0 ? "verde" : "rojo");

  document.getElementById("totalActivos").textContent = `${activos.length} alumnos`;

  const activosPromo = activos.filter(a => a.tiene_promo).length;
  const activosNormales = activos.length - activosPromo;
  document.getElementById("activosPromo").textContent = `${activosNormales} sin promo / ${activosPromo} con promo`;
}
