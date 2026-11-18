// Pasos del flujo de pago dentro de la app  →  features/pago_app.feature
const { When, Then } = require('@cucumber/cucumber');
const PagoPage = require('../../pages/PagoPage');
const AloPayPage = require('../../pages/AloPayPage');

When('selecciona/seleccionó en la app pagar con PSE un valor de {int}', async function (valor) {
    await PagoPage.clickBotonPagar(this.driver);

    // Al tocar PSE se despliegan "Pago mínimo" y "Más opciones".
    await PagoPage.seleccionarPSE(this.driver);
    await PagoPage.clickMasOpciones(this.driver);

    await PagoPage.clickOtroValor(this.driver);
    await PagoPage.ingresarValorPago(this.driver, valor);

    // Confirmar: la app abre el portal pagos-pre.alocredit.co en Chrome.
    await PagoPage.clickBotonPagar(this.driver);
});


Then('se abre el portal de pagos para consultar la deuda', async function () {
    await AloPayPage.esperarCargaPortal(this.driver);
});
