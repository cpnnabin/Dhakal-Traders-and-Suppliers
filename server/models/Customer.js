import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  alternativeAddress: { type: String },
  alternativePhone: { type: String },
  panNo: { type: String },
  type: { type: String, enum: ['retail', 'wholesale', 'farmer'], default: 'retail' },
  password: { type: String }
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
