import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function extraerNombreYMonto(texto) {
  const match = texto.match(/(.+?) te envió[:\s]*\$?([\d.,]+)/i);
  if (!match) return null;
  const nombre = match[1].trim();
  const monto = parseFloat(match[2].replace('.', '').replace(',', '.'));
  return { nombre, monto };
}

function esInscripcion(monto) {
  return monto === 18000 || monto === 9000;
}

function mesActual() {
  const now = new Date();
  return now.toLocaleDateString("es-AR", { month: 'long' }).toLowerCase();
}

export async function handler(event) {
  try {
    const { mensaje } = JSON.parse(event.body || '{}');
    const datos = extraerNombreYMonto(mensaje);
    if (!datos) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No se pudo extraer nombre o monto', mensaje })
      };
    }

    const { nombre, monto } = datos;
    const nombreBuscado = nombre.toUpperCase();

    const { data: alumnos, error } = await supabase
      .from('inscripciones')
      .select('id, nombre, apellido, responsable')
      .eq('activo', true);

    if (error || !alumnos) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Error al consultar alumnos' }) };
    }

    const alumno = alumnos.find(a => 
      a.responsable?.toUpperCase().includes(nombreBuscado)
    );

    if (!alumno) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Responsable no encontrado', nombre })
      };
    }

    const tipo = esInscripcion(monto) ? 'inscripcion' : 'cuota';
    const pago_inscripcion = tipo === 'inscripcion';
    const pago_mes = tipo === 'cuota';
    const mes = pago_mes ? mesActual() : "N/A";

    // Verificar si ya existe un pago de inscripción o del mes
    if (pago_inscripcion) {
      const { data: pagosExistentes } = await supabase
        .from('pagos')
        .select('id')
        .eq('alumno_id', alumno.id)
        .eq('pago_inscripcion', true);

      if (pagosExistentes && pagosExistentes.length > 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ mensaje: 'La inscripción ya fue registrada previamente.' })
        };
      }
    }

    if (pago_mes) {
      const { data: pagosExistentes } = await supabase
        .from('pagos')
        .select('id')
        .eq('alumno_id', alumno.id)
        .eq('pago_mes', true)
        .eq('mes', mes);

      if (pagosExistentes && pagosExistentes.length > 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ mensaje: `El mes de ${mes} ya fue registrado previamente.` })
        };
      }
    }

    // Insertar el nuevo pago
    const { error: insertError } = await supabase
      .from('pagos')
      .insert([{
        alumno_id: alumno.id,
        pago_mes,
        pago_inscripcion,
        mes,
        medio_pago: "transferencia",
        monto_total: monto,
        fecha: new Date().toISOString()
      }]);

    if (insertError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error al registrar el pago.', detalle: insertError.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        mensaje: '✅ Pago registrado',
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
      body: JSON.stringify({ error: 'Error interno', detalle: e.message })
    };
  }
}
