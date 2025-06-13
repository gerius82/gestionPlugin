export async function handler(event) {
    try {
      const { mensaje } = JSON.parse(event.body || '{}');
  
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          recibido: mensaje || '[mensaje vacío]',
          estado: 'OK',
          timestamp: new Date().toISOString()
        })
      };
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Error al procesar la solicitud',
          detalle: e.message
        })
      };
    }
  }
  