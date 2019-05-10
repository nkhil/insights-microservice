Feature: Get Transactions

  Scenario Outline: I can obtain a list of Transactions
    When I call the GET transactions route
    Then The the GET transactions route should return a status code of <status>
    And The response body should be an Array
    And The response body should have <length> transactions
    And The response body should be a list of transactions

    Examples:
    | status | length |
    | 200    | 10     |
