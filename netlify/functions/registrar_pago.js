const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export async function handler(event) {
  try {
    // 🛡 Parsear el JSON de forma segura
    let mensaje = '';
    const raw = event.body;

    try {
      mensaje = JSON.parse(raw).mensaje;
    } catch (err) {
      const m = raw.match(/"mensaje"\s*:\s*"([\s\S]*?)"/);
      mensaje = m ? m[1].replace(/\n/g, ' ').trim() : '';
    }

    if (!mensaje) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Mensaje vacío o inválido', recibido: raw })
      };
    }

    // 🧠 Extraer nombre y monto con expresión flexible
    const match = mensaje.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?) te env[ií]o[:\s]*\$?([\d.,]+)/i);
    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No se pudo extraer nombre o monto', mensaje })
      };
    }

    const nombreDetectado = match[1].trim().toUpperCase();
    const monto = parseFloat(match[2].replace('.', '').replace(',', '.'));
    const tipo = (monto === 18000 || monto === 9000) ? 'inscripcion' : 'cuota';
    const pago_inscripcion = tipo === 'inscripcion';
    const pago_mes = tipo === 'cuota';
    const mes = pago_mes ? new Date().toLocaleDateString("es-AR", { month: 'long' }).toLowerCase() : "N/A";

    // 🔑 Obtener config desde tu sitio
    const configRes = await fetch('https://gestionplugin.netlify.app/config.json');
    const config = await configRes.json();
    const supabaseUrl = config.supabaseUrl;
    const supabaseKey = config.supabaseKey;

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    // 🎓 Buscar alumno por responsable
    const alumnosRes = await fetch(`${supabaseUrl}/rest/v1/inscripciones?activo=eq.true&select=id,nombre,apellido,responsable`, { headers });
    const alumnos = await alumnosRes.json();

    const alumno = alumnos.find(a =>
      (a.responsable || '').toUpperCase().includes(nombreDetectado)
    );

    if (!alumno) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No se encontró responsable que coincida', nombreDetectado })
      };
    }

    // 🧾 Verificar si ya existe ese pago
    const chequeoUrl = pago_inscripcion
      ? `${supabaseUrl}/rest/v1/pagos?alumno_id=eq.${alumno.id}&pago_inscripcion=is.true`
      : `${supabaseUrl}/rest/v1/pagos?alumno_id=eq.${alumno.id}&pago_mes=is.true&mes=eq.${mes}`;

    const chequeoRes = await fetch(chequeoUrl, { headers });
    const pagosPrevios = await chequeoRes.json();

    if (pagosPrevios.length > 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          mensaje: `Ya existe un pago registrado para este alumno (${tipo === 'inscripcion' ? 'inscripción' : mes}).`
        })
      };
    }

    // 💾 Insertar el nuevo pago
    const payload = {
      alumno_id: alumno.id,
      pago_mes,
      pago_inscripcion,
      mes,
      medio_pago: "transferencia",
      monto_total: monto,
      fecha: new Date().toISOString()
    };

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/pagos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!insertRes.ok) {
      const errorText = await insertRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error al guardar el pago', detalle: errorText })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        estado: '✅ Pago registrado',
        alumno: `${alumno.nombre} ${alumno.apellido}`,
        responsable: alumno.responsable,
        tipo,
        monto,
        mes
      })
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error inesperado', detalle: e.message })
    };
  }
}
