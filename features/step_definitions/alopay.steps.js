// Pasos del portal de pagos y la redirección a PSE  →  features/portal_pse.feature
const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');
const AloPayPage = require('../../pages/AloPayPage');

When('consulta la deuda en el portal con tipo de documento {string}', async function (tipoDocumento) {
    // Pantalla de consulta: se maneja en contexto nativo (ya funciona así).
    await AloPayPage.esperarCargaPortal(this.driver);
    await AloPayPage.seleccionarTipoDocumento(this.driver, tipoDocumento);

    // Se usa el mismo documento con el que se inició sesión en la app.
    await AloPayPage.ingresarDocumento(this.driver, this.datos.documento);
    await AloPayPage.clickConsultarDeuda(this.driver);

    // Desde aquí Chrome no expone el contenido a UiAutomator2: pasamos al HTML real.
    await AloPayPage.cambiarAContextoWeb(this.driver);
    this.enContextoWeb = true;
});


When('en el portal elige otro valor por {int} y presiona Pagar', async function (valor) {
    await AloPayPage.clickOtroValor(this.driver);
    await AloPayPage.ingresarValorPago(this.driver, valor);
    await AloPayPage.clickBotonPagar(this.driver);
});


Then('el modal Confirmar Pago muestra el valor {int}', async function (valor) {
    await AloPayPage.esperarModalConfirmarPago(this.driver);

    const monto = await AloPayPage.esperarElementoWeb(
        this.driver,
        '[data-testid="payments-checkout-amount"]',
        'Monto del modal Confirmar Pago'
    );

    // "$ 1.000" -> 1000
    const textoMonto = await monto.getText();
    assert.equal(
        Number(textoMonto.replace(/\D/g, '')),
        valor,
        `El modal muestra "${textoMonto}" y se esperaba ${valor}`
    );
});


When('selecciona el método de pago {string} y el banco {string}', async function (metodo, banco) {
    await AloPayPage.seleccionarMetodoPago(this.driver, metodo);

    if (metodo.toUpperCase() === 'PSE') {
        await AloPayPage.seleccionarBancoPSE(this.driver, banco);
    }
});


When('presiona Ir a PSE', async function () {
    // El correo viene precargado y no se modifica.
    this.urlDespuesDePSE = await AloPayPage.clickIrAPSE(this.driver);
});


Then('es redirigido a la pasarela de PSE', async function () {
    assert.ok(this.urlDespuesDePSE, 'No se obtuvo la URL después de Ir a PSE');
    assert.ok(
        !this.urlDespuesDePSE.includes('pagos-pre.alocredit.co/payments'),
        `Se esperaba salir del portal hacia PSE, pero la URL sigue siendo: ${this.urlDespuesDePSE}`
    );
});
