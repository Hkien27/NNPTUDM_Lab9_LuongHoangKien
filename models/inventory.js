const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  stock: { type: Number, min: 0, default: 0 },
  reserved: { type: Number, min: 0, default: 0 },
  soldCount: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
