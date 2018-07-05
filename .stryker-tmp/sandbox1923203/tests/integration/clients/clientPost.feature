Feature: Create a client

  Scenario Outline: I can create a client via post client
    When I create a client
    Then I should get the expected status code, <status>

    Examples:
    | status |
    | 201    |