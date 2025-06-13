export async function handler(event) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      recibido_crudo: event.body
    })
  };
}
