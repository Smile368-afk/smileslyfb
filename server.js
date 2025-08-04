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

// ✅ CORS setup (allow frontend domain only)
app.use(cors({
  origin: "https://smilefe.onrender.com",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend')));

// ✅ Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ✅ Multer setup for image uploads
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

// ✅ Contact Message Schema
const contactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});
const ContactMessage = mongoose.model('ContactMessage', contactSchema);

// ✅ Root Route
app.get('/', (req, res) => {
  res.send('✅ Backend is running!');
});

// ✅ Checkout Route (Order Submission)
app.post('/checkout', upload.single('screenshot'), async (req, res) => {
  try {
    const { name, contact, address, paymentMethod } = req.body;
    const screenshot = req.file ? req.file.filename : null;

    console.log("🛒 Received order form data:", req.body);

    let cart = [];
    try {
      cart = JSON.parse(req.body.cart);
      if (!Array.isArray(cart) || cart.length === 0) {
        return res.status(400).send('Cart is empty or invalid');
      }
    } catch (err) {
      console.error('❌ Failed to parse cart:', err);
      return res.status(400).send('Invalid cart format');
    }

    const ordersToSave = cart.map(item => ({
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
    console.log("✅ Order saved:", ordersToSave.length, "items");
    res.status(200).send('✅ Order saved successfully');
  } catch (err) {
    console.error('❌ Error saving order:', err);
    res.status(500).send('❌ Failed to save order');
  }
});

// ✅ Get All Orders (Admin Panel)
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    res.status(500).send('❌ Failed to fetch orders');
  }
});

// ✅ Delete Order by ID
app.delete('/orders/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.status(200).send('✅ Order deleted');
  } catch (err) {
    console.error('❌ Error deleting order:', err);
    res.status(500).send('❌ Failed to delete order');
  }
});

// ✅ Contact Form Route
app.post('/contact', async (req, res) => {
  try {
    console.log("📩 Contact message received:", req.body);
    const { name, phone, message } = req.body;

    const contactMessage = new ContactMessage({ name, phone, message });
    await contactMessage.save();

    res.send("✅ Message received! Our team will contact you soon.");
  } catch (err) {
    console.error("❌ Error saving contact message:", err);
    res.status(500).send("❌ Failed to send message.");
  }
});

// ✅ Admin Page Serve (optional)
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin.html'));
});

// ✅ Start Server
app.listen(PORT, () => {
 console.log(`✅ Server running at http://localhost:${PORT}`);

});

