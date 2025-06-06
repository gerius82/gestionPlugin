let supabaseUrl = "", supabaseKey = "", todosLosAlumnos = [];

fetch("config.json")
.then(res => res.json())
.then(cfg => {
supabaseUrl = cfg.supabaseUrl;
supabaseKey = cfg.supabaseKey;
return cargarMeses();
})
.then(() => cargarAlumnos());

const headers = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`
});

let valores = {};
fetch("valores.json")
.then(res => res.json())
.then(json => valores = json);


async function cargarAlumnos() {
    const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?select=id,nombre,apellido,telefono,tiene_promo`, {
      headers: headers()
    });
    todosLosAlumnos = await res.json();
    actualizarTabla();
}
  

async function cargarPagosPorMes(mes) {
  const res = await fetch(`${supabaseUrl}/rest/v1/pagos?select=alumno_id,mes,pago_mes&mes=eq.${mes}&pago_mes=eq.true`, {
    headers: headers()
  });
  return await res.json();
}

function cargarMeses() {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const sel = document.getElementById("mes");
  const actual = new Date().toLocaleString('es-AR', { month: 'long' });
  meses.forEach(m => {
    const opt = new Option(m, m, m.toLowerCase() === actual.toLowerCase(), m.toLowerCase() === actual.toLowerCase());
    sel.appendChild(opt);
  });
  sel.addEventListener("change", actualizarTabla);
}

async function actualizarTabla() {
    const mes = document.getElementById("mes").value;
    const pagos = await cargarPagosPorMes(mes);
    const pagados = new Set(pagos.map(p => p.alumno_id));
  
    const alumnos = [...todosLosAlumnos].map(a => ({
      ...a,
      pago: pagados.has(a.id)
    }));
  
    if (ordenActual === "nombre") {
      alumnos.sort((a, b) =>
        asc
          ? a.nombre.localeCompare(b.nombre)
          : b.nombre.localeCompare(a.nombre)
      );
    } else {
      alumnos.sort((a, b) =>
        asc
          ? Number(b.pago) - Number(a.pago)
          : Number(a.pago) - Number(b.pago)
      );
    }
  
    // Contador de pagos
    const cantidadPagados = alumnos.filter(a => a.pago).length;
    const cantidadNoPagados = alumnos.length - cantidadPagados;

    document.getElementById("contadorPagados").textContent = cantidadPagados;
    document.getElementById("contadorNoPagados").textContent = cantidadNoPagados;

    
    const tbody = document.querySelector("#tablaPagos tbody");
    tbody.innerHTML = "";
  
    alumnos.forEach(a => {
        const fila = document.createElement("tr");

        const nombreTd = document.createElement("td");
        nombreTd.textContent = `${a.nombre} ${a.apellido}`;

        const pagoTd = document.createElement("td");
        pagoTd.className = a.pago ? "pago-si" : "pago-no";
        
        if (a.pago) {
            const span = document.createElement("span");
            span.textContent = "Sí";
          
            const btn = document.createElement("button");
            btn.textContent = "📄";
            btn.className = "btn-mini";
            btn.style.marginLeft = "8px";
            btn.onclick = () => generarComprobanteDesdeEstadisticas(a.id, mes);
          
            pagoTd.appendChild(span);
            pagoTd.appendChild(btn);
          } else {
            pagoTd.textContent = "No";
          
            if (a.telefono) {
              const mesTexto = document.getElementById("mes").value;
              const tel = "54" + a.telefono.replace(/\D/g, ""); // solo números
              const msg = encodeURIComponent(
                `Hola, cómo estás? Notamos que todavía no tenemos registro del pago de la cuota correspondiente a ${mesTexto}. Si ya lo realizaste, quizás se nos pasó registrarlo. Nos podrías confirmar? Gracias! y disculpas por la molestia...`
              );
              const url = `https://wa.me/${tel}?text=${msg}`;
          
              const btn = document.createElement("a");
              btn.href = url;
              btn.target = "_blank";
              btn.textContent = "Recordar 💬";
              btn.className = "boton-wpp";
              btn.style.marginLeft = "10px";

              // Crear contenedor en línea
                const contenedor = document.createElement("span");
                contenedor.style.display = "inline-flex";
                contenedor.style.alignItems = "center";
                contenedor.appendChild(document.createTextNode("No"));
                contenedor.appendChild(btn);
          
              pagoTd.appendChild(btn);
            }
        }
        
        fila.appendChild(nombreTd);
        fila.appendChild(pagoTd);
        tbody.appendChild(fila);

    });
}
  

let ordenActual = "nombre";  // "nombre" o "pago"
let asc = true;

document.getElementById("ordenNombre").addEventListener("click", () => {
  ordenActual = "nombre";
  asc = !asc;
  actualizarTabla();
});

document.getElementById("ordenPago").addEventListener("click", () => {
  ordenActual = "pago";
  asc = !asc;
  actualizarTabla();
});

async function generarComprobanteDesdeEstadisticas(alumnoId, mes) {
    // Buscar datos del alumno
    const resAlumno = await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumnoId}&select=nombre,apellido,telefono,tiene_promo`, {
      headers: headers()
    });
    const [alumno] = await resAlumno.json();
    if (!alumno) {
      alert("Alumno no encontrado.");
      return;
    }
  
    // Buscar datos del pago
    const resPago = await fetch(`${supabaseUrl}/rest/v1/pagos?alumno_id=eq.${alumnoId}&mes=eq.${mes}&pago_mes=eq.true&select=medio_pago,pago_inscripcion,monto_total`, {
      headers: headers()
    });
    const [pago] = await resPago.json();
    if (!pago) {
      alert("No se encontró información de pago.");
      return;
    }
  
    // Armar nombre completo
    let nombres = [`${alumno.nombre} ${alumno.apellido}`];
    const nombreCompleto = nombres.join(" y ");

    // Calcular el monto total real (sumar si hay hermano)
    let montoTotal = pago.monto_total;
    
    // Si tiene promo, buscar si hay un hermano
    if (alumno.tiene_promo) {
      const hermanos = todosLosAlumnos.filter(a =>
        a.id !== alumnoId &&
        a.tiene_promo &&
        a.apellido === alumno.apellido &&
        a.telefono === alumno.telefono
      );
      if (hermanos.length > 0) {
        nombres.push(`${hermanos[0].nombre} ${hermanos[0].apellido}`);
        montoTotal *= 2;  // 👈 sumamos el segundo pago
        
      }
    }
  
    
  
    // Llamar a la función que genera el PDF
    await generarComprobantePDF({
      alumno: nombreCompleto,
      total: montoTotal,
      mes,
      pagaMes: true,
      pagaInscripcion: pago.pago_inscripcion,
      tienePromo: alumno.tiene_promo,
      medio: pago.medio_pago
    });
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
    doc.text(formData.medio.charAt(0).toUpperCase() + formData.medio.slice(1), 5, y + 5);
  
  
    // Fecha
    const fecha = new Date();
    const fechaTxt = fecha.toLocaleDateString("es-AR");
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Fecha: ${fechaTxt}`, 85, 132, { align: "right" });
  
    //doc.save(`Comprobante_${formData.alumno.replace(/ /g, "_")}_${formData.mes}.pdf`);
    const pdfBlob = doc.output("blob");

    if (navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], "comprobante.pdf", { type: "application/pdf" })] })) {
    const file = new File([pdfBlob], "comprobante.pdf", { type: "application/pdf" });
    try {
        await navigator.share({
        files: [file],
        title: "Comprobante de Pago",
        text: "Te comparto el comprobante de pago generado.",
        });
    } catch (err) {
        alert("El usuario canceló el envío o ocurrió un error.");
        console.error(err);
    }
    } else {
    // Si no se puede compartir, se descarga el PDF como antes
    doc.save(`Comprobante_${formData.alumno.replace(/ /g, "_")}_${formData.mes}.pdf`);
    }

}