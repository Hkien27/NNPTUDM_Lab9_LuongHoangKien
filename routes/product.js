const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Inventory = require('../models/inventory');

// Create product + inventory
router.post('/', async (req, res) => {
  try {
    const { name, description, price } = req.body;
    if (!name || price == null) {
      return res.status(400).json({ message: 'name and price are required' });
    }

    const product = await Product.create({ name, description, price });

    const inventory = await Inventory.create({ product: product._id, stock: 0, reserved: 0, soldCount: 0 });

    return res.status(201).json({ product, inventory });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || 'Create product failed' });
  }
});

router.get('/', async (req, res) => {
  try {
    const products = await Product.find().lean();
    return res.json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || 'Get products failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.json(product);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || 'Get product failed' });
  }
});

module.exports = router;
