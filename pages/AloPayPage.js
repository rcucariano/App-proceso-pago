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
    // etiqueta "Número de Documento" y tomamos el elemento enfocable justo debajo.
    async buscarCampoDebajoDeEtiqueta(driver) {
        const etiqueta = await PagoPage.buscarVisible(
            driver,
            'new UiSelector().textMatches("(?i).*n[uú]mero de documento.*")'
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
                    || /consultar deuda/i.test(texto)) {
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
            console.log('Campo de documento ubicado debajo de la etiqueta "Número de Documento".');
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
        await campo.click();

        // Al tocarlo, el input enfocado suele aparecer como EditText; si no,
        // escribimos con el teclado directamente.
        const enfocado = await PagoPage.buscarVisible(
            driver,
            'new UiSelector().className("android.widget.EditText").focused(true)'
        );

        if (enfocado) {
            await enfocado.clearValue();
            await enfocado.setValue(String(documento));
        } else {
            await driver.keys(String(documento).split(''));
        }

        console.log('Se ingresó el número de documento en el portal.');

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
}

module.exports = new AloPayPage();
