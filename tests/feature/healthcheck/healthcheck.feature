Feature: Healthchecks

  Scenario Outline: I can ping the service
    When I call GET /ping
    Then GET /ping should return the status code, <status>

    Examples:
    | status |
    | 200    |
