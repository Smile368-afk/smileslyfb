require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Multer storage for payment screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ✅ MongoDB Schemas
const OrderSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: String,
  paymentMethod: String,
  products: Array,
  paymentScreenshot: String,
  date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

const ContactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  message: String,
  date: { type: Date, default: Date.now }
});
const ContactMessage = mongoose.model('ContactMessage', ContactSchema);

// ✅ Nodemailer Transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS
  }
});

// ✅ Checkout Route
app.post('/checkout', upload.single('paymentScreenshot'), async (req, res) => {
  try {
    console.log("📦 Checkout Data Received:", req.body);
    const { name, phone, address, paymentMethod, products } = req.body;

    const newOrder = new Order({
      name,
      phone,
      address,
      paymentMethod,
      products: JSON.parse(products),
      paymentScreenshot: req.file ? `/uploads/${req.file.filename}` : null
    });

    await newOrder.save();

    // Send email to admin
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: "🛒 New Order Received",
      html: `
        <h3>New Order Details</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p><strong>Products:</strong> ${products}</p>
        ${req.file ? `<p><strong>Screenshot:</strong> <a href="${process.env.BACKEND_URL}/uploads/${req.file.filename}">View</a></p>` : ""}
      `
    };
    await transporter.sendMail(mailOptions);

    res.send("✅ Order placed successfully!");
  } catch (err) {
    console.error("❌ Error saving order:", err);
    res.status(500).send("❌ Failed to place order.");
  }
});

// ✅ Contact Form Route (Updated with Email Sending)
app.post('/contact', async (req, res) => {
  try {
    console.log("📩 Contact message received:", req.body);
    const { name, phone, message } = req.body;

    // Save to DB
    const contactMessage = new ContactMessage({ name, phone, message });
    await contactMessage.save();

    // Send Email Notification to Admin
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: "📩 New Contact Form Submission",
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log('📧 Contact form email sent to admin');

    res.send("✅ Message received! Our team will contact you soon.");
  } catch (err) {
    console.error("❌ Error processing contact message:", err);
    res.status(500).send("❌ Failed to send message.");
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
