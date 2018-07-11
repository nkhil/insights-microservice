# Context
In an effort to make it is as easy as possible to track progress but also to structure build tasks, this issue has been created to help define an easy to use outline of how we should structure our build tickets.

The aim is to make the tasks needed to complete a given build item visible so that progress can be measured and communicated. 

# Issue structure:

## Requirements

Please outline the requirements for the build ticket, this should be a simple copy and paste from the UseCase model for and I would expect something similar to the below example that I've created by looking at the Identity MicroService UseCase model:

- [ ] ID-01 Identity Creation POST route
    - [ ] Create /identity POST route and validation logic
    - [ ] Create DAS POST request and error handling logic
- [ ] ID-02 Update user identity UUID
    - [ ] Create /identity/{id} PUT route
- [ ] ID-03 Update user identity CRM Id
    - [ ] Create /identity/crm/{id} PUT route
    - [ ] Create reconcile logic
- [ ] Unit tests and coverage complete
- [ ] SIT tests complete
