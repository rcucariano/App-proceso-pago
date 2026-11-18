// Hooks: lo que pasa antes y después de cada escenario.
const { BeforeAll, Before, After, Status } = require('@cucumber/cucumber');
const { validarDatosPrueba } = require('../../data/datosPrueba');
const { crearDriver } = require('./driver');
const AloPayPage = require('../../pages/AloPayPage');

// Antes de todo: si faltan la cédula o la contraseña, no tiene sentido arrancar.
BeforeAll(function () {
    validarDatosPrueba();
});


// Antes de cada escenario: abrimos la app con una sesión nueva de Appium.
Before(async function () {
    this.driver = await crearDriver();
});


// Después de cada escenario: si falló, adjuntamos evidencia al reporte;
// luego cerramos la sesión.
After(async function ({ result }) {
    if (!this.driver) return;

    if (result && result.status === Status.FAILED) {
        try {
            const captura = await this.driver.takeScreenshot();
            this.attach(Buffer.from(captura, 'base64'), 'image/png');
        } catch (error) {
            this.attach(`No se pudo tomar la captura: ${error.message}`, 'text/plain');
        }

        try {
            if (this.enContextoWeb) {
                const texto = await this.driver.execute(() => document.body.innerText);
                this.attach(`URL: ${await this.driver.getUrl()}\n\n${texto}`, 'text/plain');
            } else {
                this.attach(await this.driver.getPageSource(), 'text/plain');
            }
        } catch (error) {
            // La evidencia es opcional; no tapamos el error original.
        }
    }

    if (this.enContextoWeb) {
        await AloPayPage.volverAContextoNativo(this.driver);
    }

    // MANTENER_SESION=1 deja la app abierta para revisar la pantalla a mano.
    if (process.env.MANTENER_SESION !== '1') {
        await this.driver.deleteSession();
    }
});
