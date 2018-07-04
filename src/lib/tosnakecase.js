const toSnakeCase = string => string.replace(/([A-Z])/g, ' $1').trim().replace(/ /g, '_').toLowerCase();

module.exports = toSnakeCase;
