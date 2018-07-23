Feature: Healthchecks

  Scenario Outline: I can ping the service
    When I call GET /ping
    Then GET /ping should return the status code, <status>

    Examples:
    | status |
    | 200    |

  Scenario Outline: I can understand the readiness of the service
    When I call GET /ready
    Then GET /ready should return the status code, <status>

    Examples:
    | status |
    | 200    |
