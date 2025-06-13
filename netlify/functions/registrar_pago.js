export async function handler(event) {
  try {
    const { mensaje } = JSON.parse(event.body || '{}');

    const match = mensaje.match(/(.+?) te envió[:\s]*\$?([\d.,]+)/i);
    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'No se pudo extraer nombre o monto',
          mensaje_recibido: mensaje
        })
      };
    }

    const nombre = match[1].trim();
    const monto = parseFloat(match[2].replace('.', '').replace(',', '.'));

    return {
      statusCode: 200,
      body: JSON.stringify({
        nombre,
        monto,
        estado: 'Extraído correctamente'
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error inesperado',
        detalle: e.message
      })
    };
  }
}
