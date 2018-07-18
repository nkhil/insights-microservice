const express = require('express');
const { logger } = require('@spokedev/fab_utils');
const faqController = require('../controllers/faqs');

const router = express.Router();

router.get('/',
  async (req, res, next) => {
    try {
      const faqs = await faqController.get();
      res.status(200).json(JSON.parse(faqs.body));
      return next();
    } catch (err) {
      logger.debug('Error getting FAQs', err);
      res.status(500).json({ msg: 'Internal Server Error' });
      return next();
    }
  });

module.exports = router;
