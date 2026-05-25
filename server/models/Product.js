import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nameEn: { type: String, required: true },
  nameNe: { type: String, required: true },
  category: { type: String, required: true },
  stock: { type: Number, required: true },
  unit: { type: String, required: true },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  emoji: { type: String, default: '📦' },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
