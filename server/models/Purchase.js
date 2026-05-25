import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  farmerName: { type: String, required: true },
  productName: { type: String, required: true },
  qtyKg: { type: Number, required: true },
  rate: { type: Number, required: true },
  total: { type: Number, required: true },
  date: { type: String, required: true },
  paymentMode: { type: String, enum: ['Cash', 'Bank', 'Card', 'Credit'], default: 'Cash' },
}, { timestamps: true });

export default mongoose.model('Purchase', purchaseSchema);
