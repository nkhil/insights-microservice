const { toSnakeCase } = require('../../../src/lib');

describe('#toSnakeCase', () => {
  context('success', () => {
    it('converts a string from camel case to snake case', () => {
      toSnakeCase('already_snake_case').should.equal('already_snake_case');
      toSnakeCase('helloWorld').should.equal('hello_world');
      toSnakeCase('HelloWorld').should.equal('hello_world');
      toSnakeCase('convertThisString').should.equal('convert_this_string');
      toSnakeCase('revisionId').should.equal('revision_id');
      toSnakeCase('RfqController').should.equal('rfq_controller');
      toSnakeCase('listAProvider').should.equal('list_a_provider');
      toSnakeCase('capsInAWord').should.equal('caps_in_a_word');
    });
  });
});
