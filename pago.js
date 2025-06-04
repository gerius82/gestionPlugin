let supabaseUrl = "", supabaseKey = "", todosLosAlumnos = [];

let valores = {};
fetch("valores.json")
  .then(res => res.json())
  .then(json => valores = json);

fetch("config.json")
  .then(res => res.json())
  .then(cfg => {
    supabaseUrl = cfg.supabaseUrl;
    supabaseKey = cfg.supabaseKey;
    return fetchAlumnos();
  })
  .then(alumnos => {
    todosLosAlumnos = alumnos;
    cargarSelectorAlumnos(alumnos);
  });

const headers = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`
});

async function fetchAlumnos() {
  const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?select=id,nombre,apellido,telefono,tiene_promo,beneficiario_id`, {
    headers: headers()
  });
  return await res.json();
}


function cargarSelectorAlumnos(alumnos) {
  const sel = document.getElementById("alumno");
  sel.innerHTML = '<option value="">-- Seleccionar alumno --</option>';
  alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  alumnos.forEach(a => {
    const opt = new Option(`${a.nombre} ${a.apellido}`, a.id);
    sel.appendChild(opt);
  });
}

document.getElementById("alumno").addEventListener("change", () => {
  const id = document.getElementById("alumno").value;
  if (!id) return;

  const alumno = todosLosAlumnos.find(a => a.id == id);
  //document.getElementById("promoInfo").textContent = alumno.tiene_promo ? "Sí" : "No";
  document.getElementById("tienePromo").checked = alumno.tiene_promo;
  calcularMonto();
});

// Eventos que recalculan el monto dinámicamente
document.getElementById("alumno").addEventListener("change", calcularMonto);
document.getElementById("pagaMes").addEventListener("change", () => {
  document.getElementById("mesPagoContainer").style.display = 
    document.getElementById("pagaMes").checked ? "block" : "none";
  calcularMonto();
});
document.getElementById("mes").addEventListener("change", calcularMonto);
document.getElementById("pagaInscripcion").addEventListener("change", calcularMonto);

document.querySelectorAll('input[name="medioPago"]').forEach(radio => {
  radio.addEventListener("change", calcularMonto);
});

function calcularMonto() {
  const id = document.getElementById("alumno").value;
  if (!id) return;

  const alumno = todosLosAlumnos.find(a => a.id == id);
  const pagaMes = document.getElementById("pagaMes").checked;
  const pagaInscripcion = document.getElementById("pagaInscripcion").checked;

  let monto = 0;

  // CUOTA MENSUAL
  if (pagaMes) {
    monto += alumno.tiene_promo ? valores.cuota_promo : valores.cuota_normal;
    // Si tiene promo, buscar hermano vinculado
    if (alumno.tiene_promo) {
      const hermanos = todosLosAlumnos.filter(a =>
        a.id !== alumno.id &&
        a.tiene_promo &&
        (a.telefono === alumno.telefono && a.apellido === alumno.apellido)
      );
      if (hermanos.length > 0) {
        monto += valores.cuota_promo; // cuota del hermano
      }
    }
  }

  // INSCRIPCIÓN
  if (pagaInscripcion) {
    monto += alumno.tiene_promo ? valores.inscripcion_promo : valores.inscripcion_normal;

    // Si tiene promo, buscar hermano vinculado
    if (alumno.tiene_promo) {
      const hermanos = todosLosAlumnos.filter(a =>
        a.id !== alumno.id &&
        a.tiene_promo &&
        (a.telefono === alumno.telefono && a.apellido === alumno.apellido)
      );
      if (hermanos.length > 0) {
        monto += valores.inscripcion_promo; // inscripción del hermano
      }
    }
  }

  document.getElementById("totalValor").textContent = `$${monto.toLocaleString()}`;
}


document.getElementById("formPago").addEventListener("submit", async e => {
  e.preventDefault();

  const alumnoId = document.getElementById("alumno").value;
  const alumno = todosLosAlumnos.find(a => a.id == alumnoId);
  const pagaMes = document.getElementById("pagaMes").checked;
  const pagaInscripcion = document.getElementById("pagaInscripcion").checked;
  const medio = document.querySelector('input[name="medioPago"]:checked')?.value;
  const mes = document.getElementById("mes").value;

  if (!alumnoId || !medio || (pagaMes && !mes)) {
    alert("Faltan datos requeridos.");
    return;
  }

  const pagos = [];

  pagos.push({
    alumno_id: alumnoId,
    mes: pagaMes ? mes : "N/A",
    pago_mes: pagaMes,
    pago_inscripcion: pagaInscripcion,
    medio_pago: medio,
    monto_total: calcularMontoIndividual(alumno, pagaMes, pagaInscripcion),
  });

  if ((pagaMes || pagaInscripcion)&& alumno.tiene_promo) {
    const hermanos = todosLosAlumnos.filter(a =>
      a.id !== alumno.id &&
      a.tiene_promo &&
      (a.telefono === alumno.telefono && a.apellido === alumno.apellido)
    );

    if (hermanos.length > 0) {
      const hermano = hermanos[0]; // suponemos solo uno
      if (pagaMes) {
      pagos.push({
        alumno_id: hermano.id,
        mes: mes,
        pago_mes: true,
        pago_inscripcion: false,
        medio_pago: medio,
        monto_total: valores.cuota_promo,
      });
      }
      if (pagaInscripcion) {
        const hermano = hermanos[0];
        pagos.push({
          alumno_id: hermano.id,
          mes: "N/A",
          pago_mes: false,
          pago_inscripcion: true,
          medio_pago: medio,
          monto_total: valores.inscripcion_promo,
        });
      }
    }
  }
  
  let errores = [];

  for (const pago of pagos) {
    const res = await fetch(`${supabaseUrl}/rest/v1/pagos`, {
      method: "POST",
      headers: {
        ...headers(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(pago)
    });

    if (!res.ok) {
      const error = await res.text();
      errores.push(`Alumno ID ${pago.alumno_id}: ${error}`);
    }
  }

  if (errores.length === 0) {
    document.getElementById("formPago").reset();
    document.getElementById("mesPagoContainer").style.display = "none";
    document.getElementById("totalValor").textContent = "$0";
    document.getElementById("tienePromo").checked = false;

    const mensaje = document.getElementById("confirmacionPago");
    mensaje.style.display = "block";
    setTimeout(() => mensaje.style.display = "none", 3000);
  } else {
    alert("Ocurrió un error al registrar algunos pagos:\n" + errores.join("\n"));
    console.error(errores);
  }

  //const montoTotal = pagos.reduce((sum, p) => sum + p.monto_total, 0);


  let monto = calcularMontoIndividual(alumno, pagaMes, pagaInscripcion);

  const tienePromo = alumno.tiene_promo;

  if ((pagaMes || pagaInscripcion) && tienePromo) {
    const hermanos = todosLosAlumnos.filter(a =>
      a.id !== alumno.id &&
      a.tiene_promo &&
      (a.telefono === alumno.telefono && a.apellido === alumno.apellido)
    );

    if (hermanos.length > 0) {
      if (pagaMes) monto += valores.cuota_promo;
      if (pagaInscripcion) monto += valores.inscripcion_promo;
    }
  }

  let nombres = [`${alumno.nombre} ${alumno.apellido}`];

  if (tienePromo) {
    const hermanos = todosLosAlumnos.filter(a =>
      a.id !== alumno.id &&
      a.tiene_promo &&
      (a.telefono === alumno.telefono && a.apellido === alumno.apellido)
    );
    if (hermanos.length > 0) {
      const h = hermanos[0];
      nombres.push(`${h.nombre} ${h.apellido}`);
    }
  }

  const nombreCompleto = nombres.join(" y ");
  
  /*
  await generarComprobantePDF({
    alumno: nombreCompleto,
    total: monto,
    mes,
    pagaMes,
    pagaInscripcion,
    tienePromo,
    medio
  });
  */
  


});

function calcularMontoIndividual(alumno, pagaMes, pagaInscripcion) {
  let monto = 0;
  if (pagaMes) {
    monto += alumno.tiene_promo ? valores.cuota_promo : valores.cuota_normal;
  }
  if (pagaInscripcion) {
    monto += alumno.tiene_promo ? valores.inscripcion_promo : valores.inscripcion_normal;
  }
  return monto;
}

async function generarComprobantePDF(formData) {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [90, 140] // Aumentamos el ancho a 90mm
  });

  // Logo
  const logoImg = new Image();
  logoImg.src = "Logo_Plugin_2025.png";
  await new Promise(res => (logoImg.onload = res));

  // Obtener dimensiones originales
  const originalWidth = logoImg.width;
  const originalHeight = logoImg.height;

  // Definí el ancho deseado, por ejemplo 40 mm
  const desiredWidth = 40;

  // Calcular el alto proporcional
  const aspectRatio = originalHeight / originalWidth;
  const desiredHeight = desiredWidth * aspectRatio;

  // Insertar el logo en la parte superior (centrado o no)
  const logoX = 25; // Cambiá esto si querés centrarlo
  const logoY = 10;

  doc.addImage(logoImg, "PNG", logoX, logoY, desiredWidth, desiredHeight);


// Líneas punteadas
  doc.setDrawColor(150);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, 35, 85, 35);
  doc.line(5, 43, 85, 43);

  // Título
  doc.setFontSize(14);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(0);

  // Centro entre 5 y 85 => (5 + 85) / 2 = 45
  const centerX = (5 + 85) / 2;

  doc.text(["COMPROBANTE DE PAGO"], centerX, 41, { align: "center" });

  let y = 50;
  const small = 11;
  const label = "Helvetica";

  doc.setFontSize(small);
  doc.setFont(label, "bold");
  doc.text("Recibí de:", 5, y);
  doc.setFont(label, "normal");
  doc.setTextColor(100);
  doc.text(formData.alumno, 5, y + 5);

  y += 12;
  doc.setFont(label, "bold");
  doc.setTextColor(0);
  doc.text("Importe:", 5, y);
  doc.setFont(label, "normal");
  doc.setTextColor(100);
  doc.text(`$${formData.total.toLocaleString('es-AR')}`, 5, y + 5);

  y += 12;
  doc.setFont(label, "bold");
  doc.setTextColor(0);
  doc.text("Concepto:", 5, y);
  doc.setFont(label, "normal");
  doc.setTextColor(100);
  /*
  let conceptos = [`Pago cuota mes ${formData.mes}`];
  if (formData.pagaInscripcion) conceptos.push("Inscripción");
  if (formData.tienePromo) conceptos.push("Con promo");
  */
  let conceptos = [];
  if (formData.pagaMes) conceptos.push(`Pago cuota mes ${formData.mes}`);
  if (formData.pagaInscripcion) conceptos.push("Inscripción");
  if (formData.tienePromo) conceptos.push("Con promo");
  
  conceptos.forEach((c, i) => {
    doc.text(`- ${c}`, 8, y + 6 + i * 5);
  });

  y += 6 + conceptos.length * 5 + 3; // MÁS SEPARACIÓN

  doc.setFont(label, "bold");
  doc.setTextColor(0);
  doc.text("Medio de pago:", 5, y);
  doc.setFont(label, "normal");
  doc.setTextColor(100);
  //doc.text(formData.medio, 5, y + 5);
  doc.text(formData.medio.charAt(0).toUpperCase() + formData.medio.slice(1), 5, y + 5);


  // Fecha
  const fecha = new Date();
  const fechaTxt = fecha.toLocaleDateString("es-AR");
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Fecha: ${fechaTxt}`, 85, 132, { align: "right" });

  doc.save(`Comprobante_${formData.alumno.replace(/ /g, "_")}_${formData.mes}.pdf`);
}
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
