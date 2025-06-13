export async function handler(event) {
  try {
    const { mensaje } = JSON.parse(event.body || '{}');
    const match = mensaje.match(/(.+?) te envió[:\s]*\$?([\d.,]+)/i);
    if (!match) {
      return {
        statusCode: 200,
        body: JSON.stringify({ respuesta: 'No se pudo interpretar el mensaje.' })
      };
    }

    const nombre = match[1].trim();
    const monto = parseFloat(match[2].replace('.', '').replace(',', '.'));

    return {
      statusCode: 200,
      body: JSON.stringify({
        respuesta: `${nombre} pagó $${monto}`
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ respuesta: 'Error interno' })
    };
  }
}
