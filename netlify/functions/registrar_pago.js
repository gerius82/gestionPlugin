export async function handler(event) {
  const log = {
    raw: event.body,
    parsed: null
  };

  try {
    const body = JSON.parse(event.body);
    log.parsed = body;

    return {
      statusCode: 200,
      body: JSON.stringify({
        recibido: body.mensaje || '[sin mensaje]',
        raw: event.body,
        timestamp: new Date().toISOString()
      })
    };
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Error al procesar JSON',
        detalle: e.message,
        log
      })
    };
  }
}
