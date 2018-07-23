Feature: Get FAQs

  Scenario Outline: I can obtain a list of FAQs
    When I call the Getting Started microservice GET /faqs route
    Then The Getting Started GET /faqs route should return the status code, <status>
    And The Getting Started GET /faqs route should return a list of faqs or No Entries Found

    Examples:
    | status |
    | 200    |
    