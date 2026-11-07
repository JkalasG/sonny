// Vercel: sirve las páginas y la ruta /api/analyze de Expo Router (salida "server" de `expo export -p web`).
// Los archivos estáticos (dist/client) los entrega Vercel directamente; todo lo demás pasa por aquí.
const path = require("path");
const { createRequestHandler } = require("expo-server/adapter/vercel");

module.exports = createRequestHandler({
  build: path.join(__dirname, "../dist/server"),
});
