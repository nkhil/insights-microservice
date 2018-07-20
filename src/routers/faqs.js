const express = require('express');
const faqController = require('../controllers/faqs');

const router = express.Router();

router.get('/',
  async (req, res, next) => {
    try {
      const faqs = await faqController.get();
      res.status(200).json(JSON.parse(faqs.body));
      return next();
    } catch (err) {
      res.status(500).json({ msg: 'Internal Server Error' });
      return next();
    }
  });

module.exports = router;
