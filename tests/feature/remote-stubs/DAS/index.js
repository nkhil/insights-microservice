const { heads: { RoboHydraHeadStatic } } = require('robohydra');
const faqsList = require('../../../responses/faqs');

exports.getBodyParts = function faqs() {
  return {
    heads: [
      new RoboHydraHeadStatic({
        path: '/FAQs',
        content: faqsList
      })
    ]
  };
};
