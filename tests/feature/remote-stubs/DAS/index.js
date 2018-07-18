const RoboHydraHeadStatic = require('robohydra').heads.RoboHydraHeadStatic;
const faqsList = require('../../../responses/faqs');

exports.getBodyParts = function (conf) {
  return {
    heads: [
      new RoboHydraHeadStatic({
        path: '/FAQs',
        content: faqsList
      })
    ]
  };
};
