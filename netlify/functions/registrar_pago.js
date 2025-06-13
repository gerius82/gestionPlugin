export async function handler(event) {
  try {
    const { mensaje } = JSON.parse(event.body || '{}');

    return {
      statusCode: 200,
      body: JSON.stringify({
        mensaje_recibido: mensaje || '[mensaje vacío]',
        nota: '✅ El mensaje llegó correctamente desde MacroDroid'
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error al procesar el mensaje',
        detalle: e.message
      })
    };
  }
}
