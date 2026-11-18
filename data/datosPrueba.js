// Datos de prueba centralizados.
//
// - Los datos NO sensibles tienen un valor por defecto aquí (tipo de documento, monto).
// - Los datos sensibles (documento y contraseña) vienen SOLO de variables de entorno,
//   para no subirlos al repositorio.
// - Cualquier valor se puede sobrescribir desde la terminal, por ejemplo (PowerShell):
//     $env:TIPO_DOCUMENTO = "CE"; $env:VALOR_PAGO = "5000"; node tests/conexion.js

const datosPrueba = {
    // Credenciales del usuario (obligatorias, desde la terminal).
    documento: process.env.DOCUMENTO_PRUEBA,
    contrasena: process.env.CONTRASENA_PRUEBA,

    // Tipo de documento en el portal de pagos: código ("CC", "CE", "PA"...) o nombre visible.
    tipoDocumento: process.env.TIPO_DOCUMENTO || 'CC',

    // Valor a pagar en "Otro valor".
    valorPago: Number(process.env.VALOR_PAGO || 1000),

    // Método de pago en el modal Confirmar Pago ("PSE" o "NEQUI").
    metodoPago: process.env.METODO_PAGO || 'PSE',

    // Banco de la lista de PSE, con el texto exacto que muestra el portal.
    bancoPSE: process.env.BANCO_PSE || 'BANCOLOMBIA QA'
};


function validarDatosPrueba() {
    const faltantes = [];
    if (!datosPrueba.documento) faltantes.push('DOCUMENTO_PRUEBA');
    if (!datosPrueba.contrasena) faltantes.push('CONTRASENA_PRUEBA');

    if (faltantes.length > 0) {
        throw new Error(
            `Configura estas variables de entorno antes de ejecutar la prueba: ${faltantes.join(', ')}`
        );
    }

    if (!Number.isFinite(datosPrueba.valorPago) || datosPrueba.valorPago <= 0) {
        throw new Error(`VALOR_PAGO no es válido: "${process.env.VALOR_PAGO}"`);
    }
}


module.exports = { datosPrueba, validarDatosPrueba };
