# Steps: features/step_definitions/login.steps.js
Feature: Inicio de sesión en la app Alo Credit
  Como cliente de Alo Credit
  Quiero iniciar sesión con mi documento y contraseña
  Para acceder a las opciones de mi crédito

  @login @smoke
  Scenario: Inicio de sesión exitoso
    Given el cliente inició sesión en la app con su documento y contraseña
    Then ve la pantalla principal con la opción Pagar
