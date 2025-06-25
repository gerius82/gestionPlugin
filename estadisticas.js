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
    const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.true&select=id,nombre,apellido,telefono,tiene_promo`, {
        headers: headers()
    });
    todosLosAlumnos = await res.json();
    actualizarTabla();
}
  
async function cargarPagosPorMes(mes, medio = "todos") {
    let filtro = `mes=eq.${mes}&pago_mes=eq.true`;
    if (medio !== "todos") {
      filtro += `&medio_pago=eq.${medio}`;
    }
  
    const res = await fetch(`${supabaseUrl}/rest/v1/pagos?select=alumno_id,mes,pago_mes,medio_pago&${filtro}`, {
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
    const medio = document.getElementById("medioPago").value;

    const pagos = await cargarPagosPorMes(mes,medio);
    // const pagados = new Set(pagos.map(p => p.alumno_id));
    const pagados = new Map(); // Mapear ID del alumno a medio de pago

    pagos.forEach(p => {
        pagados.set(p.alumno_id, p.medio_pago);
    });

    let alumnos = [];

    if (medio === "todos") {
        alumnos = [...todosLosAlumnos].map(a => ({
            ...a,
            pago: pagados.has(a.id),
            medio_pago: pagados.get(a.id) || null
        }));
    } else {
        // Solo mostrar los que pagaron con el medio seleccionado
        alumnos = todosLosAlumnos
            .filter(a => pagados.has(a.id))
            .map(a => ({
                ...a,
                pago: true,
                medio_pago: pagados.get(a.id)
            }));
    }
    /*

  
    const alumnos = [...todosLosAlumnos].map(a => ({
      ...a,
      pago: pagados.has(a.id)
    }));
    */
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
            //btn.textContent = "📄";
            //btn.className = "btn-mini";
            btn.className = "boton-icono boton-comprobante";
            //btn.textContent = "📄";
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
            viewBox="0 0 16 16">
            <path d="M4 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5.5L9.5 1H4zm5 1.5L13 6h-3a1 1 0 0 1-1-1V2.5zM4 9.5A.5.5 0 0 1 4.5 9h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 9.5zm0 2a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/>
            </svg>`;

            btn.title = "Ver comprobante de pago";

            btn.style.marginLeft = "10px";
            btn.onclick = () => generarComprobanteDesdeEstadisticas(a.id, mes);
          
            pagoTd.appendChild(span);
            pagoTd.appendChild(btn);
          } else {
            if (a.telefono) {
                const mesTexto = document.getElementById("mes").value;
                const tel = "54" + a.telefono.replace(/\D/g, "");
                const msg = encodeURIComponent(
                  `Hola, cómo estás? Notamos que todavía no tenemos registro del pago de la cuota correspondiente a ${mesTexto}. Si ya lo realizaste, quizás se nos pasó registrarlo. Nos podrías confirmar? Gracias! y disculpas por la molestia...`
                );
                const url = `https://wa.me/${tel}?text=${msg}`;
              
                const contenedor = document.createElement("span");
                contenedor.style.display = "inline-flex";
                contenedor.style.alignItems = "center";
                contenedor.style.gap = "6px";
              
                const texto = document.createElement("span");
                texto.textContent = "No";
                texto.style.color = "red";
                texto.style.fontWeight = "bold";
              
                const btn = document.createElement("a");
                btn.href = url;
                btn.target = "_blank";
                //btn.textContent = "💬";
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                viewBox="0 0 16 16">
                <path d="M13.601 2.326A7.955 7.955 0 0 0 8 0C3.582 0 0 3.582 0 8c0 1.425.375 2.748 1.03 3.914L0 16l4.188-1.03A7.963 7.963 0 0 0 8 16c4.418 0 8-3.582 8-8 0-2.137-.832-4.089-2.399-5.674zM8 14.5a6.5 6.5 0 1 1 4.401-11.074l.19.185A6.495 6.495 0 0 1 8 14.5z"/>
                <path d="M11.168 9.29c-.228-.114-1.348-.667-1.556-.743-.207-.077-.358-.114-.51.114-.152.228-.586.743-.72.895-.133.152-.266.171-.494.057-.228-.114-.962-.354-1.83-1.13-.676-.602-1.133-1.347-1.267-1.575-.133-.228-.014-.352.1-.466.103-.102.228-.266.342-.399.115-.133.152-.228.229-.38.076-.152.038-.285-.019-.399-.058-.114-.51-1.23-.699-1.681-.184-.445-.372-.384-.51-.392-.133-.008-.285-.01-.437-.01-.152 0-.4.057-.61.285-.21.228-.81.792-.81 1.931 0 1.14.83 2.243.945 2.399.114.152 1.63 2.5 3.96 3.494.554.24.984.384 1.32.49.554.176 1.057.152 1.455.092.444-.066 1.348-.551 1.538-1.083.19-.532.19-.99.133-1.083-.057-.095-.209-.152-.437-.266z"/>
                </svg>`;
                btn.className = "boton-icono";
                btn.title = "Recordar por WhatsApp";
              
                contenedor.appendChild(texto);
                contenedor.appendChild(btn);
                pagoTd.appendChild(contenedor);
              } else {
                pagoTd.textContent = "No";
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

document.getElementById("medioPago").addEventListener("change", actualizarTabla);

/*
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
*/

async function generarComprobanteDesdeEstadisticas(alumnoId, mes) {
    // Cargar datos completos del alumno
    const resAlumno = await fetch(`${supabaseUrl}/rest/v1/inscripciones?id=eq.${alumnoId}&select=*`, {
      headers: headers()
    });
    const [alumno] = await resAlumno.json();
    if (!alumno) {
      alert("Alumno no encontrado.");
      return;
    }
  
    // Cargar datos del pago
    const resPago = await fetch(`${supabaseUrl}/rest/v1/pagos?alumno_id=eq.${alumnoId}&mes=eq.${mes}&pago_mes=eq.true&select=medio_pago,pago_inscripcion,monto_total`, {
      headers: headers()
    });
    const [pago] = await resPago.json();
    if (!pago) {
      alert("No se encontró información de pago.");
      return;
    }
  
    let montoTotal = pago.monto_total;
    let nombreCompleto = `${alumno.nombre} ${alumno.apellido}`;
  
    // Buscar hermano si hay promoción y teléfono en común
    if (alumno.tiene_promo) {
      const hermanos = todosLosAlumnos.filter(a =>
        a.id !== alumnoId &&
        a.telefono === alumno.telefono &&
        a.tiene_promo
      );
  
      if (hermanos.length > 0) {
        const hermano = hermanos[0];
        // Mostrar: Juan y Pedro Pérez
        nombreCompleto = `${alumno.nombre} y ${hermano.nombre} ${alumno.apellido}`;
        montoTotal *= 2;
      }
    }
  
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
    const nombreArchivo = `Comprobante_${formData.alumno.replace(/ /g, "_")}_${formData.mes}.pdf`;

    if (navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], nombreArchivo, { type: "application/pdf" })] })) {
        const file = new File([pdfBlob], nombreArchivo, { type: "application/pdf" });
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
        doc.save(nombreArchivo);
    }

}