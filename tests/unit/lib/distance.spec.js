const { distance } = require('../../../src/lib');

describe('#distance', () => {
  context('success', () => {
    it('should return the correct distance in km', () => {
      const jigsaw = { lat: 51.523955, long: -0.097816 };
      const jam = { lat: 53.348351, long: -6.277355 };
      const station = { long: -0.097388, lat: 51.520153 };
      distance(jigsaw, station).should.equal(0.4237989216995147);
      distance(station, jigsaw).should.equal(0.4237989216995147);
      distance(jigsaw, jam).should.equal(465.2313703621986);
      distance(jam, jigsaw).should.equal(465.2313703621986);
      distance(station, jam).should.equal(465.4578028430579);
      distance(jam, station).should.equal(465.4578028430579);
    });
    it('should still work when passing the locations in valid numbers as strings', () => {
      const jigsaw = { lat: '51.523955', long: '-0.097816' };
      const station = { long: '-0.097388', lat: '51.520153' };
      distance(jigsaw, station).should.equal(0.4237989216995147);
      distance(station, jigsaw).should.equal(0.4237989216995147);
    });
  });

  context('error', () => {
    it('should throw an error when any value is an invalid string', () => {
      const jigsaw = { lat: 'hello', long: -0.097816 };
      const station = { long: -0.097388, lat: 'world' };
      (() => distance(jigsaw, station)).should.throw();
    });
    it('should throw an error when any value is null', () => {
      const jigsaw = { lat: null, long: -0.097816 };
      const station = { long: -0.097388, lat: null };
      (() => distance(jigsaw, station)).should.throw();
    });
    it('should throw an error when any value is undefined', () => {
      const jigsaw = { lat: undefined, long: -0.097816 };
      const station = { long: -0.097388, lat: undefined };
      (() => distance(jigsaw, station)).should.throw();
    });
    it('should throw an error when the locations are not objects', () => {
      const jigsaw = [undefined, -0.097816];
      const station = [-0.097388, undefined];
      (() => distance(jigsaw, station)).should.throw();
    });
    it("should throw an error when the locations don't include lat and/or long keys", () => {
      const jigsaw = { latitude: 51.523955, long: -0.097816 };
      const station = { lat: 53.348351, longitude: -6.277355 };
      (() => distance(jigsaw, station)).should.throw();
    });
  });
});
