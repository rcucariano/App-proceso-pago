// Page Object del portal web de pagos (pagos-pre.alocredit.co).
// La app abre el portal en el navegador; lo manejamos con UiAutomator2 (contexto
// NATIVE_APP), que lee el árbol de accesibilidad de Chrome. Así no necesitamos
// chromedriver ni cambiar de contexto.
//
// Estructura del formulario (HTML del portal):
//   <select id="login-doc-type">  -> Tipo de Documento (por defecto "Cédula de Ciudadanía")
//   <input  id="login-dni">       -> Número de Documento (solo números, máx. 10)
//   <button>Consultar Deuda</button>

// Reutilizamos las esperas y el diagnóstico ya definidos en PagoPage.
const PagoPage = require('./PagoPage');

class AloPayPage {

    imprimirTextosPantalla(driver, titulo) {
        return PagoPage.imprimirTextosPantalla(driver, titulo);
    }


    // Espera a que el portal termine de cargar (el botón Consultar Deuda es visible).
    async esperarCargaPortal(driver) {
        console.log('Paquete actual:', await driver.getCurrentPackage());

        await PagoPage.esperarElemento(
            driver,
            'new UiSelector().textMatches("(?i) *consultar deuda *")',
            'Portal de pagos (Consultar Deuda)',
            60000 // El navegador puede tardar en abrir y cargar la página.
        );

        console.log('El portal de pagos cargó.');
    }


    // Construye el selector de la opción de la lista.
    // Las opciones del portal se ven como "Cédula de Ciudadanía (CC)", así que:
    //   - Si recibimos un código ("CC", "CE", "PA"...), buscamos la opción que contiene "(CC)".
    //   - Si recibimos el nombre ("Cédula de Ciudadanía"), buscamos la que empieza con ese texto.
    selectorOpcionTipoDocumento(tipoDocumento) {
        const valor = String(tipoDocumento).trim();

        if (/^[A-Z]{2,4}$/.test(valor)) {
            return `new UiSelector().textContains("(${valor})")`;
        }

        return `new UiSelector().textStartsWith("${valor}")`;
    }


    // Abre el desplegable "Tipo de Documento" y elige la opción indicada.
    // Acepta el código ("CC") o el nombre ("Cédula de Ciudadanía").
    async seleccionarTipoDocumento(driver, tipoDocumento) {
        // Chrome expone el <select> como Spinner; si no, lo buscamos por la opción
        // que tiene seleccionada por defecto.
        let desplegable = await PagoPage.buscarVisible(
            driver,
            'new UiSelector().className("android.widget.Spinner")'
        );

        if (!desplegable) {
            desplegable = await PagoPage.esperarElemento(
                driver,
                'new UiSelector().textMatches("(?i).*c[eé]dula de ciudadan[ií]a.*")',
                'Tipo de Documento'
            );
        }

        await desplegable.click();

        // Al abrirlo, Chrome muestra la lista de opciones como diálogo nativo.
        const opcion = await PagoPage.esperarElemento(
            driver,
            this.selectorOpcionTipoDocumento(tipoDocumento),
            `Opción "${tipoDocumento}"`
        );

        await opcion.click();
        console.log(`Se seleccionó el tipo de documento: ${tipoDocumento}`);
    }


    // Convierte "[x1,y1][x2,y2]" en { x1, y1, x2, y2 }.
    leerBounds(bounds) {
        const n = (bounds || '').match(/-?\d+/g);
        if (!n || n.length < 4) return null;
        const [x1, y1, x2, y2] = n.map(Number);
        return { x1, y1, x2, y2 };
    }


    // Diagnóstico detallado: clase, id, texto y posición de cada nodo relevante.
    async imprimirNodos(driver, titulo) {
        const xml = await driver.getPageSource();
        const nodos = xml.match(/<[\w.]+ [^>]*>/g) || [];

        console.log(`========== ${titulo} ==========`);
        for (const nodo of nodos) {
            const attr = (nombre) => (nodo.match(new RegExp(`\\b${nombre}="([^"]*)"`)) || [])[1] || '';
            const clase = attr('class');
            const texto = attr('text');
            const id = attr('resource-id');
            const desc = attr('content-desc');
            const hint = attr('hint');
            const relevante = texto || id || desc || hint
                || clase.includes('EditText') || attr('focusable') === 'true';

            if (relevante) {
                console.log(
                    `${clase} | id="${id}" | text="${texto}" | hint="${hint}" | desc="${desc}"`,
                    `| focusable=${attr('focusable')} | bounds=${attr('bounds')}`
                );
            }
        }
        console.log('='.repeat(titulo.length + 22));
    }


    // Estrategia 1 y 2: el campo expuesto como id HTML o como EditText.
    async buscarCampoEditable(driver) {
        const porId = await PagoPage.buscarVisible(
            driver,
            'new UiSelector().resourceIdMatches(".*login-dni.*")'
        );
        if (porId) return porId;

        const campos = await driver.$$(
            'android=new UiSelector().className("android.widget.EditText")'
        );
        for (const candidato of campos) {
            try {
                const id = (await candidato.getAttribute('resource-id')) || '';
                if (!id.includes('url_bar') && await candidato.isDisplayed()) {
                    return candidato;
                }
            } catch (error) {
                // La página se está redibujando; reintentamos.
            }
        }
        return null;
    }


    // Estrategia 3: si la vista web no expone el input como EditText, buscamos la
    // etiqueta (por ejemplo "Número de Documento") y tomamos el elemento enfocable
    // justo debajo de ella.
    async buscarCampoDebajoDeEtiqueta(
        driver,
        regexEtiqueta = '(?i).*n[uú]mero de documento.*',
        nombre = 'Número de Documento'
    ) {
        const etiqueta = await PagoPage.buscarVisible(
            driver,
            `new UiSelector().textMatches("${regexEtiqueta}")`
        );
        if (!etiqueta) return null;

        const caja = this.leerBounds(await etiqueta.getAttribute('bounds'));
        if (!caja) return null;

        const candidatos = await driver.$$('android=new UiSelector().focusable(true)');
        let mejor = null;
        let mejorDistancia = Infinity;

        for (const candidato of candidatos) {
            try {
                const clase = (await candidato.getAttribute('class')) || '';
                const texto = (await candidato.getAttribute('text')) || '';
                if (clase.includes('Spinner') || clase.includes('Button')
                    || clase.includes('CheckBox')
                    || /consultar deuda|pagar/i.test(texto)) {
                    continue;
                }

                const b = this.leerBounds(await candidato.getAttribute('bounds'));
                if (!b || b.y1 < caja.y1 + 1) continue; // Solo lo que está debajo.

                const distancia = b.y1 - caja.y2;
                if (distancia < mejorDistancia) {
                    mejorDistancia = distancia;
                    mejor = candidato;
                }
            } catch (error) {
                // Ignoramos nodos que desaparecen al redibujar.
            }
        }

        if (mejor) {
            console.log(`Campo ubicado debajo de la etiqueta "${nombre}".`);
        }
        return mejor;
    }


    // Busca el campo "Número de Documento" sin confundirlo con la barra de
    // direcciones de Chrome (que también es un EditText).
    async obtenerCampoDocumento(driver) {
        let campo = null;

        await driver.waitUntil(
            async () => {
                campo = await this.buscarCampoEditable(driver)
                    || await this.buscarCampoDebajoDeEtiqueta(driver);
                return campo !== null;
            },
            { timeout: 15000, interval: 1000 }
        ).catch(async () => {
            await this.imprimirNodos(driver, 'NO SE ENCONTRÓ: Número de Documento');
            throw new Error('No apareció el campo "Número de Documento"');
        });

        return campo;
    }


    async ingresarDocumento(driver, documento) {
        // Damos tiempo a que se cierre la lista de tipos de documento.
        await driver.pause(1000);

        const campo = await this.obtenerCampoDocumento(driver);
        await this.escribirEnCampo(driver, campo, documento);
        console.log('Se ingresó el número de documento en el portal.');
    }


    // Toca el campo y escribe el valor. Al tocarlo, el input enfocado suele aparecer
    // como EditText; si no, escribimos con el teclado directamente.
    async escribirEnCampo(driver, campo, valor) {
        await campo.click();

        const enfocado = await PagoPage.buscarVisible(
            driver,
            'new UiSelector().className("android.widget.EditText").focused(true)'
        );

        if (enfocado) {
            await enfocado.clearValue();
            await enfocado.setValue(String(valor));
        } else {
            await driver.keys(String(valor).split(''));
        }

        try {
            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
        } catch (error) {
            // No es crítico si el teclado no se puede ocultar.
        }
    }


    async clickConsultarDeuda(driver) {
        const boton = await PagoPage.esperarElemento(
            driver,
            'new UiSelector().textMatches("(?i) *consultar deuda *")',
            'Consultar Deuda'
        );

        await boton.click();
        console.log('Se hizo clic en Consultar Deuda.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PANTALLA DE PAGO (/payments) — CONTEXTO WEB
    //
    // Después de Consultar Deuda, Chrome deja de exponer el contenido de la
    // página a UiAutomator2: solo se ve el contenedor vacío "Vista web". Por eso
    // desde aquí trabajamos en el contexto WEBVIEW_chrome (chromedriver), donde
    // vemos el HTML real y usamos selectores web (XPath/CSS).
    // Requiere iniciar Appium con:
    //   appium --allow-insecure uiautomator2:chromedriver_autodownload
    // ─────────────────────────────────────────────────────────────────────────

    // El portal dibuja DOS versiones de cada control: "-desktop" (oculta en el
    // celular) y "-mobile" (la visible). Por eso buscamos por el inicio del
    // data-testid y nos quedamos con la copia visible.
    selectorTestId(prefijo) {
        return `[data-testid^="${prefijo}"]`;
    }


    // Cambia al contexto web de Chrome y a la pestaña del portal de pagos.
    async cambiarAContextoWeb(driver) {
        let contextoWeb = null;

        await driver.waitUntil(
            async () => {
                const contextos = await driver.getContexts();
                contextoWeb = contextos
                    .map((c) => (typeof c === 'string' ? c : c.id))
                    .find((c) => c.includes('WEBVIEW_chrome') || c.includes('CHROMIUM'));
                return Boolean(contextoWeb);
            },
            { timeout: 30000, interval: 1000, timeoutMsg: 'No apareció el contexto web de Chrome' }
        );

        await driver.switchContext(contextoWeb);

        // Chrome puede tener varias pestañas abiertas: nos quedamos con la del portal.
        for (const ventana of await driver.getWindowHandles()) {
            await driver.switchToWindow(ventana);
            if ((await driver.getUrl()).includes('pagos-pre.alocredit.co')) {
                break;
            }
        }

        console.log(`Contexto web activo (${contextoWeb}). URL: ${await driver.getUrl()}`);
    }


    async volverAContextoNativo(driver) {
        try {
            await driver.switchContext('NATIVE_APP');
        } catch (error) {
            // Si la sesión ya se cerró no hay nada que hacer.
        }
    }


    // Diagnóstico en contexto web: texto visible y controles del formulario.
    async imprimirPaginaWeb(driver, titulo) {
        const info = await driver.execute(() => ({
            texto: document.body.innerText,
            controles: [...document.querySelectorAll('input, select, button, label')].map((e) =>
                `${e.tagName} id="${e.id}" name="${e.name || ''}" type="${e.type || ''}" `
                + `texto="${(e.innerText || e.value || e.placeholder || '').trim().slice(0, 50)}"`)
        }));

        console.log(`========== ${titulo} ==========`);
        console.log(info.texto);
        console.log('--- Controles ---');
        console.log(info.controles.join('\n'));
        console.log('='.repeat(titulo.length + 22));
    }


    // Espera a que alguna coincidencia del selector esté visible (y habilitada si
    // se pide); si no aparece, imprime la página para diagnosticar.
    async esperarElementoWeb(driver, selector, nombre, { timeout = 15000, habilitado = false } = {}) {
        let elemento = null;

        try {
            await driver.waitUntil(
                async () => {
                    for (const candidato of await driver.$$(selector)) {
                        if (await candidato.isDisplayed()
                            && (!habilitado || await candidato.isEnabled())) {
                            elemento = candidato;
                            return true;
                        }
                    }
                    return false;
                },
                { timeout, interval: 500 }
            );
        } catch (error) {
            await this.imprimirPaginaWeb(driver, `NO SE ENCONTRÓ: ${nombre}`);
            throw new Error(`No apareció el elemento "${nombre}" en el portal`);
        }

        await elemento.scrollIntoView({ block: 'center' });
        return elemento;
    }


    // Dentro de ¿Cómo deseas pagar?, marcar "Otro valor".
    async clickOtroValor(driver) {
        const opcion = await this.esperarElementoWeb(
            driver,
            this.selectorTestId('payments-custom-payment-card'),
            'Otro valor (portal)',
            { timeout: 30000 } // La consulta de la deuda puede tardar en responder.
        );

        await opcion.click();
        console.log('Se hizo clic en Otro valor (portal).');
    }


    // Escribe el valor a pagar en el input que aparece tras marcar "Otro valor".
    async ingresarValorPago(driver, valor) {
        const campo = await this.esperarElementoWeb(
            driver,
            this.selectorTestId('payments-custom-amount-input'),
            'Campo de valor a pagar'
        );

        await campo.click();
        await campo.clearValue();
        await campo.setValue(String(valor));
        console.log(`Se ingresó el valor de pago en el portal: ${valor}`);
    }


    // Botón "Pagar" del portal (puede habilitarse solo después de escribir el valor).
    async clickBotonPagar(driver) {
        const boton = await this.esperarElementoWeb(
            driver,
            this.selectorTestId('payments-continue-button'),
            'Pagar (portal)',
            { habilitado: true }
        );

        await boton.click();
        console.log('Se hizo clic en Pagar (portal).');
    }


    // ─── Modal "Confirmar Pago" ───────────────────────────────────────────────

    async esperarModalConfirmarPago(driver) {
        await this.esperarElementoWeb(
            driver,
            '[data-testid="payments-checkout-modal"]',
            'Modal Confirmar Pago'
        );
        console.log('Se abrió el modal Confirmar Pago.');
    }


    // Elige el método de pago dentro del modal: "PSE" o "NEQUI".
    async seleccionarMetodoPago(driver, metodo = 'PSE') {
        const boton = await this.esperarElementoWeb(
            driver,
            `[data-testid="payments-method-option-button-${metodo.toUpperCase()}"]`,
            `Método de pago ${metodo}`
        );

        await boton.click();
        console.log(`Se seleccionó el método de pago: ${metodo}`);
    }


    // Selecciona el banco en la lista de PSE por su texto visible exacto
    // (por ejemplo "BANCO UNION COLOMBIANO").
    async seleccionarBancoPSE(driver, banco) {
        const lista = await this.esperarElementoWeb(
            driver,
            '[data-testid="payments-pse-bank-select"]',
            'Lista de bancos PSE'
        );

        // La lista se llena desde el servidor: esperamos a que tenga opciones.
        await driver.waitUntil(
            async () => (await lista.$$('option')).length > 1,
            { timeout: 15000, interval: 500, timeoutMsg: 'La lista de bancos PSE no cargó opciones' }
        );

        const opciones = await driver.execute(
            (select) => [...select.options].map((o) => o.text.trim()),
            lista
        );

        if (!opciones.includes(banco)) {
            console.log('Bancos disponibles:\n' + opciones.slice(1).join('\n'));
            throw new Error(`El banco "${banco}" no está en la lista de PSE`);
        }

        await lista.selectByVisibleText(banco);
        console.log(`Se seleccionó el banco: ${banco}`);
    }


    // Clic en "Ir a PSE". El botón está deshabilitado hasta que el formulario
    // (banco y correo precargado) es válido, por eso esperamos a que se habilite.
    async clickIrAPSE(driver) {
        const boton = await this.esperarElementoWeb(
            driver,
            '[data-testid="payments-checkout-submit-button"]',
            'Ir a PSE',
            { habilitado: true }
        );

        const urlAntes = await driver.getUrl();
        await boton.click();
        console.log('Se hizo clic en Ir a PSE.');

        // Esperamos a que el portal redirija a PSE (no falla si no cambia la URL).
        await driver.waitUntil(
            async () => (await driver.getUrl()) !== urlAntes,
            { timeout: 30000, interval: 1000 }
        ).catch(() => console.log('La URL no cambió después de Ir a PSE.'));

        console.log('URL después de Ir a PSE:', await driver.getUrl());
    }
}

module.exports = new AloPayPage();
