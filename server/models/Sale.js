import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  items: [{
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  date: { type: String, required: true },
  cashier: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  paymentMode: { type: String, enum: ['Cash', 'eSewa', 'Bank'], default: 'Cash' },
  customerName: { type: String },
  customerAddress: { type: String },
  customerPan: { type: String },
  customerAlternativeAddress: { type: String },
  customerAlternativePhone: { type: String }
}, { timestamps: true });

export default mongoose.model('Sale', saleSchema);
