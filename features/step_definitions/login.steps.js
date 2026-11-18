// Pasos del inicio de sesión en la app  →  features/login.feature
// usa la definición (Given/When/Then) cuyo texto coincide.
const { Given, Then } = require('@cucumber/cucumber');
const InicioPage = require('../../pages/InicioPage');
const PagoPage = require('../../pages/PagoPage');

Given('el cliente inició sesión en la app con su documento y contraseña', async function () {
    // La app puede tardar en abrir: esperamos el campo de documento.
    const campoDocumento = await this.driver.$(
        'android=new UiSelector().className("android.widget.EditText")'
    );
    await campoDocumento.waitForDisplayed({
        timeout: 30000,
        timeoutMsg: 'La app no mostró la pantalla de inicio de sesión'
    });

    await InicioPage.ingresarDocumento(this.driver, this.datos.documento);
    await InicioPage.ingresarContrasena(this.driver, this.datos.contrasena);
    await InicioPage.clickBotonEntrar(this.driver);
});


Then('ve la pantalla principal con la opción Pagar', async function () {
    // Si el login falló, el botón Pagar nunca aparece y el paso falla.
    await PagoPage.esperarElemento(
        this.driver,
        'new UiSelector().text("Pagar")',
        'Pagar (pantalla principal)',
        60000
    );
});
