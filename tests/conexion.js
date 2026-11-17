const { remote } = require('webdriverio');
// Importamos nuestro Page Object de la pantalla inicial.
const InicioPage = require('../pages/InicioPage');


async function main() {


    const variablesRequeridas = [
        'DOCUMENTO_PRUEBA',
        'CONTRASENA_PRUEBA'
    ];
    const variablesFaltantes = variablesRequeridas.filter(
        (nombre) => !process.env[nombre]
    );


    if (variablesFaltantes.length > 0) {
        throw new Error(
            `Configura estas variables de entorno antes de ejecutar la prueba: ${variablesFaltantes.join(', ')}`
        );
    }


    // 1. Conectarnos al dispositivo Android
    const driver = await remote({
        hostname: '127.0.0.1',
        port: 4723,
        path: '/',
        capabilities: {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            'appium:deviceName': 'Android',


            'appium:appPackage': 'com.alocredit.pre',
            'appium:appActivity': 'com.alo.credit.presentation.ui.MainActivity',


            'appium:noReset': false,
            'appium:forceAppLaunch': true
        }
    });


    try {


        console.log('¡Conexión exitosa con el dispositivo Android!');




        // Esperamos hasta que aparezca el campo de documento.
        const campoDocumentoInicial = await driver.$(
            'android=new UiSelector().className("android.widget.EditText")'
        );


        await campoDocumentoInicial.waitForDisplayed({
            timeout: 30000
        });




        const pantalla = await driver.getPageSource();


        console.log('========== INICIO XML ==========');
        console.log(pantalla);
        console.log('========== FIN XML ==========');


        // 2. Buscar el texto de bienvenida
        const bienvenida = await driver.$(
            'android=new UiSelector().text("¡Bienvenido!")'
        );


        // 3. Buscar el campo de documento
        const campoDocumento = await driver.$(
            'android=new UiSelector().className("android.widget.EditText")'
        );


        // Buscamos todos los campos de entrada de la pantalla.
        const camposTexto = await driver.$$(
            'android=new UiSelector().className("android.widget.EditText")'
        );


        // Mostramos cuántos campos encontró Appium.
        console.log(
            'CANTIDAD DE CAMPOS DE TEXTO:',
            camposTexto.length
        );

        console.log('DATOS DEL CAMPO DOCUMENTO:');


        console.log(
            'Clase:',
            await campoDocumento.getAttribute('class')
        );


        console.log(
            'Texto:',
            await campoDocumento.getAttribute('text')
        );


        console.log(
            'Resource ID:',
            await campoDocumento.getAttribute('resource-id')
        );


        console.log(
            'Content Description:',
            await campoDocumento.getAttribute('content-desc')
        );


        // Ingresamos un documento de prueba utilizando nuestro Page Object.
        await InicioPage.ingresarDocumento(driver, process.env.DOCUMENTO_PRUEBA);




        // Esperamos a que aparezca un segundo campo de entrada.
        await driver.waitUntil(
            async () => {
                const campos = await driver.$$(
                    'android=new UiSelector().className("android.widget.EditText")'
                );


                return campos.length >= 2;
            },
            {
                timeout: 30000,
                interval: 1000,
                timeoutMsg: 'No apareció el segundo campo de entrada'
            }
        );


        console.log('Se encontraron dos campos de entrada.');

        // Ingresamos la contraseña mediante nuestro Page Object.
        await InicioPage.ingresarContrasena(
            driver,
            process.env.CONTRASENA_PRUEBA
        );


        console.log('Ingreso de contraseña ejecutado.');


        // Esperamos a que el botón Entrar esté habilitado y visible.
        await InicioPage.clickBotonEntrar(driver);

        console.log('Se hizo clic en el botón Entrar.');

        // Obtenemos todos los campos de entrada.
        const camposLogin = await driver.$$(
            'android=new UiSelector().className("android.widget.EditText")'
        );


        // Consultamos los atributos del segundo campo.
        const campoContrasena = camposLogin[1];


        console.log(
            'Clase del segundo campo:',
            await campoContrasena.getAttribute('class')
        );


        console.log(
            'Es un campo de contraseña:',
            await campoContrasena.getAttribute('password')
        );


        console.log(
            'Resource ID:',
            await campoContrasena.getAttribute('resource-id')
        );


        console.log(
            'Content Description:',
            await campoContrasena.getAttribute('content-desc')
        );

        // 4. Obtener el botón Entrar.
        const botonEntrar = await InicioPage.obtenerBotonEntrar(driver);


        // 5. Validar visibilidad de los elementos
        console.log(
            'Bienvenida visible:',
            await bienvenida.isDisplayed()
        );


        console.log(
            'Campo documento visible:',
            await campoDocumento.isDisplayed()
        );


        console.log(
            'Botón Entrar visible:',
            await botonEntrar.isDisplayed()
        );


        // 6. Consultar estado del botón
        console.log(
            'Botón Entrar habilitado:',
            await botonEntrar.isEnabled()
        );


        // 7. Consultar propiedades del elemento
        console.log(
            'Texto del elemento:',
            await botonEntrar.getText()
        );


        console.log(
            'Atributo clickable:',
            await botonEntrar.getAttribute('clickable')
        );


    } finally {


        // 8. Cerrar la sesión de Appium
        await driver.deleteSession();
        console.log('Sesión de Appium finalizada.');


    }
}


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});


