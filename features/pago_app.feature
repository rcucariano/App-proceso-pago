# Steps: features/step_definitions/pago.steps.js
Feature: Iniciar un pago con PSE desde la app
  Como cliente de Alo Credit
  Quiero elegir PSE y escribir otro valor en la app
  Para continuar el pago en el portal de pagos

  Background:
    Given el cliente inició sesión en la app con su documento y contraseña

  @pago @smoke
  Scenario: La app abre el portal de pagos al pagar otro valor con PSE
    When selecciona en la app pagar con PSE un valor de 1000
    Then se abre el portal de pagos para consultar la deuda
