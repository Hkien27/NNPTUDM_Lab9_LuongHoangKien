const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true, trim: true },
  to: { type: String, required: true, trim: true },
  messageContent: {
    type: {
      type: String,
      enum: ['file', 'text'],
      required: true
    },
    text: { type: String, required: true, trim: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
