/*
  Script base para ARENAS MOTOCICLETAS
  Controla la inicialización y mensajes de contacto.
*/

const WHATSAPP_OFICIAL = "+51987654321";

function crearMensajeWhatsApp(modelo = "mi próxima moto") {
  return `Hola, estoy interesado en ${modelo}. Quisiera recibir una cotización y más detalles, por favor.`;
}

function cargarCatalogo() {
  // Placeholder para la carga dinámica de catálogo desde data/catalogo.json
  return fetch("data/catalogo.json")
    .then((response) => response.json())
    .catch(() => []);
}

function inicializarBuscador() {
  // Placeholder para el buscador de modelo ideal.
  console.info("Inicializando buscador de motos...");
}

function inicializarApp() {
  inicializarBuscador();
  cargarCatalogo().then((catalogo) => {
    console.info("Catálogo cargado:", catalogo);
  });
}

window.addEventListener("DOMContentLoaded", inicializarApp);
