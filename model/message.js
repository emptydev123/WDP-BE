const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, required: true }, // mime type
  name: { type: String },
  size: { type: Number },
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  attachments: { type: [AttachmentSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

module.exports = mongoose.model('message', MessageSchema);