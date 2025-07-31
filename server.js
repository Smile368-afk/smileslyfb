require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ CORS for frontend
app.use(cors({
  origin: "https://smilefe.onrender.com",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static Folders
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'frontend')));

// ✅ Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Order Schema
const orderSchema = new mongoose.Schema({
  name: String,
  contact: String,
  address: String,
  product: String,
  size: String,
  quantity: Number,
  price: Number,
  paymentMethod: String,
  screenshot: String,
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// ✅ Checkout Route
app.post('/checkout', upload.single('screenshot'), async (req, res) => {
  try {
    const { name, contact, address, paymentMethod, cart } = req.body;
    const screenshot = req.file ? req.file.filename : null;

    if (!cart) return res.status(400).send('Cart data missing');

    let parsedCart;
    try {
      parsedCart = JSON.parse(cart);
    } catch (e) {
      return res.status(400).send('Invalid cart format');
    }

    const orders = parsedCart.map(item => ({
      name,
      contact,
      address,
      product: item.product,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      paymentMethod,
      screenshot
    }));

    await Order.insertMany(orders);
    res.status(200).send('✅ Order saved');
  } catch (err) {
    console.error('❌ Order error:', err);
    res.status(500).send('❌ Server error');
  }
});

// ✅ Root Route
app.get('/', (req, res) => res.send('✅ API is running'));

// ✅ Start Server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
