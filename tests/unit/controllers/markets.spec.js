const chai = require('chai');
const uuid = require('uuid/v4');
const { MarketsController } = require('../../../src/controllers/markets');
const { Market } = require('../../../src/models');
const { InMemoryMarketDB } = require('../../assets');
const {
  InvalidParametersError,
  MissingParametersError
} = require('../../../src/errors');

const should = chai.should();

describe('market controller', () => {
  beforeEach(() => {
    this.database = new InMemoryMarketDB();
    this.controller = new MarketsController(this.database);
  });

  describe('#create', () => {
    context('success', () => {
      it('should create a market', async () => {
        const { err, data } = await this.controller.create({ name: 'testMarket' });
        should.not.exist(err);
        data.should.be.instanceOf(Market);
        data.name.should.be.equal('testMarket');
      });
    });

    context('failure', () => {
      it('should error if missing mandatory name field', async () => {
        const { err, data } = await this.controller.create({});
        should.not.exist(data);
        err.should.be.instanceOf(MissingParametersError);
      });
    });
  });

  describe('#list', () => {
    context('success', () => {
      beforeEach(async () => {
        await Promise.all([
          this.controller.create({ name: 'market1' }),
          this.controller.create({ name: 'market2' }),
          this.controller.create({ name: 'market3' }),
          this.controller.create({ name: 'market4' }),
          this.controller.create({ name: 'market5' })
        ]);
      });

      it('should list array of markets', async () => {
        const { err, data } = await this.controller.list({});
        should.not.exist(err);
        data.should.be.instanceOf(Array);
        data.length.should.equal(5);
        data[0].should.be.instanceOf(Market);
      });

      it('should list markets with user defined offset and limit', async () => {
        const { err, data } = await this.controller.list({ offset: 1, limit: 3 });
        should.not.exist(err);
        data.length.should.equal(3);
        data[0].should.be.instanceOf(Market);
        data[0].name.should.equal('market2');
      });
    });
  });

  describe('#get', () => {
    context('success', () => {
      beforeEach(async () => {
        ({ data: this.market } = await this.controller.create({ name: 'market1' }));
      });

      it('should get a market', async () => {
        const { err, data } = await this.controller.get({ id: this.market.id });
        should.not.exist(err);
        data.name.should.equal('market1');
      });
    });

    context('failure', () => {
      it('should error if missing mandatory id field', async () => {
        const { err, data } = await this.controller.get({});
        should.not.exist(data);
        err.should.be.instanceOf(MissingParametersError);
      });

      it('should error if invalid mandatory id field', async () => {
        const { err, data } = await this.controller.get({ id: 'invalid' });
        should.not.exist(data);
        err.should.be.instanceOf(InvalidParametersError);
      });
    });
  });

  describe('#update', () => {
    context('success', () => {
      beforeEach(async () => {
        ({ data: this.market } = await this.controller.create({ name: 'market1' }));
      });

      it('should update a market', async () => {
        const { err, data } = await this.controller.update({
          id: this.market.id,
          updates: {
            name: 'newName',
            description: 'new description'
          }
        });
        should.not.exist(err);
        data.should.be.instanceOf(Market);
      });
    });

    context('failure', () => {
      it('should error if missing mandatory id field', async () => {
        const { err, data } = await this.controller.update({});
        should.not.exist(data);
        err.should.be.instanceOf(MissingParametersError);
      });
    });
  });

  describe('#delete', () => {
    context('success', () => {
      beforeEach(async () => {
        ({ data: this.market } = await this.controller.create({ name: 'market1' }));
      });

      it('should delete (make inactive) a market', async () => {
        const { err, data } = await this.controller.delete({ id: this.market.id });
        should.not.exist(err);
        data.should.equal(true);
      });
    });

    context('failure', () => {
      it('should error if missing mandatory id field', async () => {
        const { err } = await this.controller.delete({});
        err.should.be.instanceOf(MissingParametersError);
      });

      it('should error if field not valid id', async () => {
        const { err } = await this.controller.delete({ id: 'invalid' });
        err.should.be.instanceOf(InvalidParametersError);
      });
    });
  });

  describe('#listRevisions', () => {
    context('success', () => {
      beforeEach(async () => {
        ({ data: this.market } = await this.controller.create({ name: 'market1' }));
        await this.controller.update({
          id: this.market.id,
          updates: { name: 'newName' }
        });
        await this.controller.update({
          id: this.market.id,
          updates: { description: 'new description' }
        });
      });

      it('should list market revisions', async () => {
        const { err, data } = await this.controller.listRevisions({ id: this.market.id });
        should.not.exist(err);
        data.should.be.instanceOf(Array);
        data.length.should.equal(3);
        data[1].should.be.instanceOf(Market);
      });

      it('should list revisions for one maket', async () => {
        const { data } = await this.controller.listRevisions({ id: this.market.id });
        data.forEach(d => d.id.should.equal(this.market.id));
      });
    });

    context('failure', () => {
      it('should error if missing mandatory id field', async () => {
        const { err, data } = await this.controller.listRevisions({});
        should.not.exist(data);
        err.should.be.instanceOf(MissingParametersError);
      });

      it('should error if invalid mandatory id field', async () => {
        const { err, data } = await this.controller.listRevisions({ id: 'invalid' });
        should.not.exist(data);
        err.should.be.instanceOf(InvalidParametersError);
      });
    });
  });

  describe('#getRevision', () => {
    context('success', () => {
      beforeEach(async () => {
        const { data: one } = await this.controller.create({ name: 'market1' });
        const { data: two } = await this.controller.update({
          id: one.id,
          updates: { name: 'newName' }
        });
        const { data: three } = await this.controller.update({
          id: one.id,
          updates: { description: 'new description' }
        });
        this.revisions = [one, two, three];
      });

      it('should get a market revision', async () => {
        const { err, data } = await this.controller.getRevision({
          id: this.revisions[0].id,
          revisionId: uuid()
        });
        should.not.exist(err);
        data.should.be.instanceOf(Market);
      });
    });

    context('failure', () => {
      it('should error if missing mandatory id field', async () => {
        const { err, data } = await this.controller.getRevision({ rId: uuid() });
        should.not.exist(data);
        err.should.be.instanceOf(MissingParametersError);
      });

      it('should error if invalid mandatory id field', async () => {
        const { err, data } = await this.controller.getRevision({
          id: 'invalid',
          revisionId: 2
        });
        should.not.exist(data);
        err.should.be.instanceOf(InvalidParametersError);
      });

      it('should error if missing mandatory rId field', async () => {
        const { err, data } = await this.controller.getRevision({ id: uuid() });
        should.not.exist(data);
        err.should.be.instanceOf(MissingParametersError);
      });

      it('should error if invalid mandatory rId field', async () => {
        const { err, data } = await this.controller.getRevision({
          id: 2,
          revisionId: 'invalid'
        });
        should.not.exist(data);
        err.should.be.instanceOf(InvalidParametersError);
      });
    });
  });
});
