class InicioPage {


    // Localiza el botón Siguiente en la pantalla.
    async obtenerBotonSiguiente(driver) {
        const botonSiguiente = await driver.$(
            'android=new UiSelector().text("Siguiente").enabled(true)'
        );

        await botonSiguiente.waitForDisplayed({
            timeout: 20000,
            timeoutMsg: 'No apareció el botón Siguiente'
        });

        await driver.waitUntil(
            async () => await botonSiguiente.isEnabled(),
            {
                timeout: 15000,
                interval: 500,
                timeoutMsg: 'El botón Siguiente no quedó habilitado'
            }
        );

        return botonSiguiente;
    }

    // Haz clic de forma segura con espera de UI.
    async clickBotonSiguiente(driver) {
        const botonSiguiente = await this.obtenerBotonSiguiente(driver);
        await botonSiguiente.click();
        await driver.pause(1500);
        return botonSiguiente;
    }


    // Ingresa el documento del usuario.
    async ingresarDocumento(driver, documento) {


        // Localizamos el campo de documento.
        const campoDocumento = await driver.$(
            'android=new UiSelector().className("android.widget.EditText")'
        );


        // Esperamos hasta que el campo esté visible.
        await campoDocumento.waitForDisplayed({
            timeout: 10000
        });


        // Escribimos el documento recibido.
        await campoDocumento.setValue(documento);
    }


    // Ingresa la contraseña del usuario.
    async ingresarContrasena(driver, contrasena) {


        if (typeof contrasena !== 'string' || contrasena.length === 0) {
            throw new Error('La variable CONTRASENA_PRUEBA no está definida o está vacía');
        }


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
                timeoutMsg: 'No apareció el campo de contraseña'
            }
        );


        const campos = await driver.$$(
            'android=new UiSelector().className("android.widget.EditText")'
        );
        const campoContrasena = campos[1];


        await campoContrasena.waitForDisplayed({
            timeout: 10000
        });


        // Escribimos la contraseña recibida.
        await campoContrasena.setValue(contrasena);

    }


}


module.exports = new InicioPage();


