const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Data routes
router.get('/data', dataController.getAllData);
router.get('/data/:id', dataController.getDataById);
router.post('/data', dataController.createData);

// Prediction route (calls AI model)
router.post('/predict', dataController.getPrediction);

module.exports = router;
