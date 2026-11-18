# Steps: features/step_definitions/portal.steps.js
Feature: Pago en el portal Alo Pay con PSE
  Como cliente de Alo Credit
  Quiero confirmar mi pago en el portal y elegir mi banco en PSE
  Para completar el abono a mi deuda

  Background:
    Given el cliente inició sesión en la app con su documento y contraseña
    And seleccionó en la app pagar con PSE un valor de 1000

  @portal @pse @smoke
  Scenario: Pagar otro valor con PSE usando Bancolombia QA
    When consulta la deuda en el portal con tipo de documento "CC"
    And en el portal elige otro valor por 1000 y presiona Pagar
    Then el modal Confirmar Pago muestra el valor 1000
    When selecciona el método de pago "PSE" y el banco "BANCOLOMBIA QA"
    And presiona Ir a PSE
    Then es redirigido a la pasarela de PSE

  @portal @pse @regresion
  Scenario Outline: Pagar distintos valores en el portal con PSE
    When consulta la deuda en el portal con tipo de documento "<tipoDocumento>"
    And en el portal elige otro valor por <valor> y presiona Pagar
    Then el modal Confirmar Pago muestra el valor <valor>
    When selecciona el método de pago "PSE" y el banco "<banco>"
    And presiona Ir a PSE
    Then es redirigido a la pasarela de PSE

    Examples:
      | valor | tipoDocumento | banco          |
      | 5000  | CC            | BANCOLOMBIA QA |
