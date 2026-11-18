class PagoPage {


    // Imprime los textos visibles de la pantalla (útil cuando un elemento no aparece).
    async imprimirTextosPantalla(driver, titulo = 'ELEMENTOS DE LA PANTALLA') {
        const xml = await driver.getPageSource();

        const textos = [...xml.matchAll(/\b(?:text|content-desc)="([^"]*)"/g)]
            .map(([, texto]) => texto.trim())
            .filter(Boolean);

        console.log(`========== ${titulo} ==========`);
        console.log([...new Set(textos)].join('\n'));
        console.log('='.repeat(titulo.length + 22));
    }


    // Devuelve la primera coincidencia visible del selector (o null si no hay).
    // Revisa TODAS las coincidencias: puede haber copias ocultas del mismo texto.
    async buscarVisible(driver, selector) {
        const candidatos = await driver.$$(`android=${selector}`);

        for (const candidato of candidatos) {
            try {
                if (await candidato.isDisplayed()) {
                    return candidato;
                }
            } catch (error) {
                // El elemento pudo desaparecer mientras la pantalla se redibujaba.
            }
        }

        return null;
    }


    // Imprime el estado de cada coincidencia del selector (diagnóstico).
    async imprimirCandidatos(driver, selector, nombre) {
        const candidatos = await driver.$$(`android=${selector}`);
        console.log(`Coincidencias para "${nombre}": ${candidatos.length}`);

        for (const [indice, candidato] of candidatos.entries()) {
            try {
                console.log(
                    `  [${indice}] displayed=${await candidato.getAttribute('displayed')}`,
                    `enabled=${await candidato.getAttribute('enabled')}`,
                    `clickable=${await candidato.getAttribute('clickable')}`,
                    `bounds=${await candidato.getAttribute('bounds')}`
                );
            } catch (error) {
                console.log(`  [${indice}] no se pudo leer: ${error.message}`);
            }
        }
    }


    // Espera a que alguna coincidencia del selector sea visible; si no, intenta
    // desplazarse hasta ella. Si falla, imprime la pantalla y las coincidencias.
    async esperarElemento(driver, selector, nombre, timeout = 15000) {
        let elemento = null;

        try {
            await driver.waitUntil(
                async () => {
                    elemento = await this.buscarVisible(driver, selector);
                    return elemento !== null;
                },
                { timeout, interval: 1000 }
            );
            return elemento;
        } catch (error) {
            // Puede estar debajo del borde de la pantalla: intentamos hacer scroll.
            try {
                await driver.$(
                    `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(${selector})`
                );
                elemento = await this.buscarVisible(driver, selector);
                if (elemento) {
                    return elemento;
                }
            } catch (errorScroll) {
                // No hay contenedor desplazable o no se encontró; seguimos al diagnóstico.
            }

            await this.imprimirTextosPantalla(driver, `NO SE ENCONTRÓ: ${nombre}`);
            await this.imprimirCandidatos(driver, selector, nombre);
            throw new Error(`No apareció el elemento "${nombre}"`);
        }
    }


    // Hace clic en el botón Pagar de la pantalla principal.
    async clickBotonPagar(driver) {
        const botonPagar = await this.esperarElemento(
            driver,
            'new UiSelector().text("Pagar")',
            'Pagar',
            60000 // Después del login el inicio puede tardar en cargar.
        );

        await botonPagar.click();
        console.log('Se hizo clic en el botón Pagar.');
    }


    // Selecciona PSE entre los métodos de pago; esto despliega sus opciones.
    async seleccionarPSE(driver) {
        // PSE puede mostrarse con texto adicional ("Pago PSE", "PSE - Débito")
        // o solo como logo con content-desc; probamos primero por texto.
        let opcionPSE;
        const porDescripcion = await driver.$(
            'android=new UiSelector().descriptionMatches("(?i)(.*[^a-z])?pse([^a-z].*)?")'
        );

        try {
            opcionPSE = await this.esperarElemento(
                driver,
                'new UiSelector().textMatches("(?i)(.*[^a-z])?pse([^a-z].*)?")',
                'PSE'
            );
        } catch (error) {
            if (!(await porDescripcion.isDisplayed())) {
                throw error;
            }
            opcionPSE = porDescripcion;
        }

        await opcionPSE.click();
        console.log('Se seleccionó el método de pago PSE.');
    }


    // Dentro de PSE, entra a "Más opciones" (en lugar de "Pago mínimo").
    async clickMasOpciones(driver) {
        const botonMasOpciones = await this.esperarElemento(
            driver,
            'new UiSelector().textMatches("(?i)^ *m[aá]s opciones *$")',
            'Más opciones'
        );

        await botonMasOpciones.click();
        console.log('Se hizo clic en Más opciones.');
    }

    // Dentro de mas opciones, marcar a "Otro Valor" y registrar el valor de pago.

    async clickOtroValor(driver) {
        // Más permisivo: el texto puede venir como "Otro valor:", "Pagar otro valor", etc.
        const botonOtroValor = await this.esperarElemento(
            driver,
            'new UiSelector().textMatches("(?i).*otro +valor.*")',
            'Otro valor'
        );

        await botonOtroValor.click();
        console.log('Se hizo clic en Otro valor.');
    }


    // Escribe el valor a pagar en el campo que aparece tras marcar "Otro valor".
    async ingresarValorPago(driver, valor) {
        const campoValor = await this.esperarElemento(
            driver,
            'new UiSelector().className("android.widget.EditText")',
            'Campo de valor a pagar'
        );

        await campoValor.click();
        await campoValor.clearValue();
        await campoValor.setValue(String(valor));
        console.log(`Se ingresó el valor de pago: ${valor}`);

        // Cerramos el teclado para que no tape el siguiente botón.
        try {
            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
        } catch (error) {
            // Algunos teclados no permiten ocultarse; no es crítico.
        }
    }


}

module.exports = new PagoPage();
