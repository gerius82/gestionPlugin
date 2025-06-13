export async function handler(event) {
  try {
    const { mensaje } = JSON.parse(event.body);

    return {
      statusCode: 200,
      body: JSON.stringify({
        mensaje_recibido: mensaje,
        timestamp: new Date().toISOString()
      })
    };
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No se pudo interpretar el mensaje." })
    };
  }
}
