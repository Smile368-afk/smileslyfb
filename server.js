require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// ✅ Middleware
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// ✅ Multer setup
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

// ✅ Test route
app.get('/', (req, res) => {
  res.send('Server is working!');
});

// ✅ Checkout route
app.post('/checkout', upload.single('screenshot'), async (req, res) => {
  try {
    const { name, contact, address, paymentMethod } = req.body;
    const screenshot = req.file ? req.file.filename : null;
    const cart = JSON.parse(req.body.cart);

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
    res.status(200).send('Order saved successfully');
  } catch (err) {
    console.error('❌ Error saving order:', err);
    res.status(500).send('Failed to save order');
  }
});

// ✅ Get all orders
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).send('Failed to fetch orders');
  }
});

// ✅ Delete an order
app.delete('/orders/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.status(200).send('Order deleted');
  } catch (err) {
    console.error('❌ Error deleting order:', err);
    res.status(500).send('Failed to delete order');
  }
});

// 📩 Contact Form Route
app.post('/contact', async (req, res) => {
  const { name, phone, message } = req.body;
  try {
    const contactMessage = new ContactMessage({ name, phone, message });
    await contactMessage.save();
    res.send("Message received! Our team will contact you soon.");
  } catch (err) {
    console.error("Error saving contact message:", err);
    res.status(500).send("Failed to send message.");
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
