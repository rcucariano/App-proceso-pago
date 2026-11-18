// "World" de Cucumber: un objeto nuevo por cada escenario.
// Guarda el driver de Appium y la información compartida entre los pasos.
const { setWorldConstructor, World, setDefaultTimeout } = require('@cucumber/cucumber');
const { datosPrueba } = require('../../data/datosPrueba');

// Los pasos en dispositivo tardan bastante (carga de la app, portal, PSE).
// El límite por defecto de Cucumber es 5 segundos; lo subimos a 5 minutos.
setDefaultTimeout(5 * 60 * 1000);

class MundoAlo extends World {
    constructor(opciones) {
        super(opciones);

        this.driver = null;         // Sesión de Appium (se crea en hooks.js).
        this.datos = datosPrueba;   // Credenciales y valores por defecto.
        this.enContextoWeb = false; // true cuando estamos en WEBVIEW_chrome.
        this.urlDespuesDePSE = null;
    }
}

setWorldConstructor(MundoAlo);
