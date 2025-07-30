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

// ✅ CORS setup
app.use(cors({
  origin: "https://smilefe.onrender.com",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static File Serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend')));

// ✅ Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ✅ Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Mongoose Schemas
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

const contactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});
const ContactMessage = mongoose.model('ContactMessage', contactSchema);

// ✅ Routes

// Test route
app.get('/', (req, res) => {
  res.send('✅ Server is running!');
});

// 📦 Checkout - Submit Order
app.post('/checkout', upload.single('screenshot'), async (req, res) => {
  try {
    const { name, contact, address, paymentMethod, cart } = req.body;
    const screenshot = req.file ? req.file.filename : null;

    if (!cart) return res.status(400).send('Cart is missing');

    let parsedCart;
    try {
      parsedCart = JSON.parse(cart);
    } catch (err) {
      console.error('❌ Failed to parse cart JSON:', err);
      return res.status(400).send('Invalid cart format');
    }

    if (!Array.isArray(parsedCart) || parsedCart.length === 0) {
      return res.status(400).send('Cart is empty');
    }

    const ordersToSave = parsedCart.map(item => ({
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

    await Order.insertMany(ordersToSave);
    res.status(200).send('✅ Order saved successfully');
  } catch (err) {
    console.error('❌ Error saving order:', err);
    res.status(500).send('❌ Failed to save order');
  }
});

// 📋 Get all orders
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).send('❌ Failed to fetch orders');
  }
});

// ❌ Delete specific order
app.delete('/orders/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.send('✅ Order deleted');
  } catch (err) {
    res.status(500).send('❌ Failed to delete order');
  }
});

// 📩 Contact form
app.post('/contact', async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    const newMessage = new ContactMessage({ name, phone, message });
    await newMessage.save();
    res.send('✅ Message received');
  } catch (err) {
    console.error('❌ Contact error:', err);
    res.status(500).send('❌ Failed to send message');
  }
});

// 🔐 Admin HTML
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin.html'));
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
