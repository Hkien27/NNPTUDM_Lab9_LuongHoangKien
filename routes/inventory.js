const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Inventory = require('../models/inventory');
const Product = require('../models/product');

function createHttpError(status, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.extra = extra;
  return error;
}

async function resolveProductId(productInput) {
  if (productInput == null) return null;

  if (typeof productInput === 'object' && productInput._id) {
    return resolveProductId(productInput._id);
  }

  const value = String(productInput).trim();
  if (!value) return null;

  if (mongoose.Types.ObjectId.isValid(value)) {
    return value;
  }

  const product = await Product.findOne({ name: value }).select('_id').lean();
  return product ? String(product._id) : null;
}

function parsePositiveQuantity(quantity) {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

async function updateInventoryByProduct(productInput, fn, res) {
  const productId = await resolveProductId(productInput);
  if (!productId) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const inv = await Inventory.findOne({ product: productId });
  if (!inv) return res.status(404).json({ message: 'Inventory not found for product' });

  await fn(inv);
  await inv.save();
  return res.json(inv);
}

router.get('/', async (req, res) => {
  try {
    const list = await Inventory.find().populate('product').lean();
    return res.json(list);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Get inventories failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid inventory id' });
    }

    const inv = await Inventory.findById(req.params.id).populate('product');
    if (!inv) return res.status(404).json({ message: 'Inventory not found' });
    return res.json(inv);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Get inventory by ID failed' });
  }
});

router.post('/add_stock', async (req, res) => {
  try {
    const { product, quantity } = req.body;
    const parsedQuantity = parsePositiveQuantity(quantity);

    if (!product || parsedQuantity == null) {
      return res.status(400).json({ message: 'product and quantity>0 required' });
    }

    return updateInventoryByProduct(product, async (inv) => {
      inv.stock += parsedQuantity;
    }, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Add stock failed' });
  }
});

router.post('/remove_stock', async (req, res) => {
  try {
    const { product, quantity } = req.body;
    const parsedQuantity = parsePositiveQuantity(quantity);

    if (!product || parsedQuantity == null) {
      return res.status(400).json({ message: 'product and quantity>0 required' });
    }

    return updateInventoryByProduct(product, async (inv) => {
      if (inv.stock < parsedQuantity) {
        throw createHttpError(400, 'Not enough stock', {
          currentStock: inv.stock,
          requestedQuantity: parsedQuantity
        });
      }

      inv.stock -= parsedQuantity;
    }, res);
  } catch (error) {
    console.error(error);
    if (error.status) return res.status(error.status).json({ message: error.message, ...error.extra });
    return res.status(500).json({ message: 'Remove stock failed' });
  }
});

router.post('/reservation', async (req, res) => {
  try {
    const { product, quantity } = req.body;
    const parsedQuantity = parsePositiveQuantity(quantity);

    if (!product || parsedQuantity == null) {
      return res.status(400).json({ message: 'product and quantity>0 required' });
    }

    return updateInventoryByProduct(product, async (inv) => {
      if (inv.stock < parsedQuantity) {
        throw createHttpError(400, 'Not enough stock for reservation', {
          currentStock: inv.stock,
          requestedQuantity: parsedQuantity
        });
      }

      inv.stock -= parsedQuantity;
      inv.reserved += parsedQuantity;
    }, res);
  } catch (error) {
    console.error(error);
    if (error.status) return res.status(error.status).json({ message: error.message, ...error.extra });
    return res.status(500).json({ message: 'Reservation failed' });
  }
});

router.post('/sold', async (req, res) => {
  try {
    const { product, quantity } = req.body;
    const parsedQuantity = parsePositiveQuantity(quantity);

    if (!product || parsedQuantity == null) {
      return res.status(400).json({ message: 'product and quantity>0 required' });
    }

    return updateInventoryByProduct(product, async (inv) => {
      if (inv.reserved < parsedQuantity) {
        throw createHttpError(400, 'Not enough reserved quantity to sell', {
          currentReserved: inv.reserved,
          requestedQuantity: parsedQuantity
        });
      }

      inv.reserved -= parsedQuantity;
      inv.soldCount += parsedQuantity;
    }, res);
  } catch (error) {
    console.error(error);
    if (error.status) return res.status(error.status).json({ message: error.message, ...error.extra });
    return res.status(500).json({ message: 'Sold operation failed' });
  }
});

module.exports = router;
