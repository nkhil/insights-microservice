const uuid = require('uuid');

class Market {
  constructor() {
    this.id = uuid();
    this.revisionId = uuid();
    this.name = undefined;
    this.description = undefined;
    this.imageUrl = undefined;
    this.isActive = false;
    this.lit = false;
    this.rfqDefaultLifespan = 86400000; // 24 hours
    this.rfqCloseOnAccept = false;
    this.rfqSchema = {};
    this.quoteSchema = {};
    this.acceptanceSchema = {};
    this.completionSchema = {};
    this.createdOn = undefined;
    this.updatedOn = undefined;
  }

  setId(id) {
    this.id = id;
    return this;
  }

  setRevisionId(revisionId) {
    this.revisionId = revisionId;
    return this;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  setDescription(description) {
    this.description = description;
    return this;
  }

  setImageUrl(imageUrl) {
    this.imageUrl = imageUrl;
    return this;
  }

  setIsActive(isActive) {
    this.isActive = isActive;
    return this;
  }

  setLit(lit) {
    this.lit = lit;
    return this;
  }

  setRfqCloseOnAccept(rfqCloseOnAccept) {
    this.rfqCloseOnAccept = rfqCloseOnAccept;
    return this;
  }

  setRfqDefaultLifespan(rfqDefaultLifespan) {
    this.rfqDefaultLifespan = rfqDefaultLifespan;
    return this;
  }

  setRfqSchema(rfqSchema) {
    this.rfqSchema = rfqSchema;
    return this;
  }

  setQuoteSchema(quoteSchema) {
    this.quoteSchema = quoteSchema;
    return this;
  }

  setAcceptanceSchema(acceptanceSchema) {
    this.acceptanceSchema = acceptanceSchema;
    return this;
  }

  setCompletionSchema(completionSchema) {
    this.completionSchema = completionSchema;
    return this;
  }

  setCreatedOn(createdOn) {
    this.createdOn = new Date(createdOn);
    return this;
  }

  setUpdatedOn(updatedOn) {
    this.updatedOn = new Date(updatedOn);
    return this;
  }

  newRevision() {
    this.revisionId = uuid();
    return this;
  }
}

module.exports = {
  Market
};
