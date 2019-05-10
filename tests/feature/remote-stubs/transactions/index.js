const { heads: { RoboHydraHead } } = require('robohydra');
const transactions = require('../../../responses/transactions');

exports.getBodyParts = () => ({
  heads: [
    new RoboHydraHead({
      path: '/transactions',
      method: 'GET',
      handler(req, res) {
        const response = JSON.stringify(transactions);
        res.send(response);
      }
    })
  ]
});
