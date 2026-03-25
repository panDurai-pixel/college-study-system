const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['file', 'folder'], required: true },
  parentId: { type: mongoose.Schema.Types.Mixed, default: null }, // Mixed supports both null and ObjectIds safely
  fileUrl: { type: String },
  mimeType: { type: String },
  createdBy: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('Material', MaterialSchema);
