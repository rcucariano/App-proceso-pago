// Creación de la sesión de Appium para la app Alo Credit (ambiente PRE).
const { remote } = require('webdriverio');

const capacidades = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'Android',

    'appium:appPackage': 'com.alocredit.pre',
    'appium:appActivity': 'com.alo.credit.presentation.ui.MainActivity',

    // Cada escenario arranca la app desde cero.
    'appium:noReset': false,
    'appium:forceAppLaunch': true
};

async function crearDriver() {
    return remote({
        hostname: process.env.APPIUM_HOST || '127.0.0.1',
        port: Number(process.env.APPIUM_PORT || 4723),
        path: '/',
        logLevel: process.env.WDIO_LOG_LEVEL || 'warn',
        capabilities: capacidades
    });
}

module.exports = { crearDriver };
