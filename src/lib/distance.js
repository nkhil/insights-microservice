const distance = (location1, location2) => {
  switch (true) {
    case (!(Object.keys(location1).includes('lat'))):
    case (!(Object.keys(location1).includes('long'))):
    case (!(Object.keys(location2).includes('lat'))):
    case (!(Object.keys(location2).includes('long'))):
    case (location1.lat === null):
    case (location1.long === null):
    case (location2.lat === null):
    case (location2.long === null):
    case (location1.lat === undefined):
    case (location1.long === undefined):
    case (location2.lat === undefined):
    case (location2.long === undefined):
    case (isNaN(location1.lat)):
    case (isNaN(location1.long)):
    case (isNaN(location2.lat)):
    case (isNaN(location2.long)):
      throw Error();
    default:
  }

  const p = 0.017453292519943295;
  const c = Math.cos;
  /* eslint-disable */
  const a = 0.5 - c((location2.lat - location1.lat) * p) / 2
    + c(location1.lat * p) * c(location2.lat * p) * (1 - c((location2.long - location1.long) * p)) / 2;
  /* eslint-enable */
  return Math.abs(12742 * Math.asin(Math.sqrt(a)));
};

module.exports = distance;
