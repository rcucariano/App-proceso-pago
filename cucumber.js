// Configuración de Cucumber.
module.exports = {
    default: {
        // Sin "paths": por defecto corre features/**/*.feature, y si se indica un
        // archivo en la terminal (npm run test:login) corre SOLO ese archivo.
        require: [
            'features/support/**/*.js',
            'features/step_definitions/**/*.js'
        ],
        format: [
            'progress',
            'html:reports/cucumber-report.html',
            'json:reports/cucumber-report.json'
        ],
        formatOptions: { snippetInterface: 'async-await' }
    }
};
