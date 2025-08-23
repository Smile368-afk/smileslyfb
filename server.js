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
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ✅ Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Multer Setup (for EasyPaisa screenshots)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// ✅ Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS
  }
});

// ✅ MongoDB Schemas
const orderSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
  city: String,
  paymentMethod: String,
  easypaisaNumber: String,
  paymentScreenshot: String,
  cart: Array,
  createdAt: { type: Date, default: Date.now }
});

const contactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  name: String,
  rating: Number, // 1-5 stars
  comment: String,
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);
const ContactMessage = mongoose.model('ContactMessage', contactSchema);
const Review = mongoose.model('Review', reviewSchema);

// ✅ Checkout Route
app.post('/checkout', upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const { name, email, phone, address, city, paymentMethod, easypaisaNumber, cart } = req.body;
    const paymentScreenshot = req.file ? req.file.path : null;

    const newOrder = new Order({
      name,
      email,
      phone,
      address,
      city,
      paymentMethod,
      easypaisaNumber,
      paymentScreenshot,
      cart: JSON.parse(cart)
    });

    await newOrder.save();

    // Send Email to Admin
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: "smileslyf29@gmail.com",
      subject: '🛒 New Order Received',
      html: `
        <h3>Order Details</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Address:</strong> ${address}, ${city}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p><strong>EasyPaisa Number:</strong> ${easypaisaNumber || 'N/A'}</p>
        <p><strong>Cart:</strong> ${cart}</p>
        ${paymentScreenshot ? `<p><a href="${req.protocol}://${req.get('host')}/${paymentScreenshot}" target="_blank">View Screenshot</a></p>` : ''}
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 Order email sent to admin');

    res.status(200).send({ success: true, message: '✅ Order placed successfully!' });
  } catch (err) {
    console.error('❌ Error placing order:', err);
    res.status(500).send({ success: false, message: '❌ Failed to place order.' });
  }
});

// ✅ Contact Form Route
app.post('/contact', async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    const contactMessage = new ContactMessage({ name, phone, message });
    await contactMessage.save();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: "smileslyf29@gmail.com",
      subject: "📩 New Contact Form Submission",
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 Contact form email sent');

    res.send("✅ Message received! Our team will contact you soon.");
  } catch (err) {
    console.error("❌ Error processing contact message:", err);
    res.status(500).send("❌ Failed to send message.");
  }
});

// ✅ Add Review Route (Saves + Sends Email)
app.post('/reviews', async (req, res) => {
  try {
    const { name, rating, comment } = req.body;
    if (!name || !rating || !comment) {
      return res.status(400).send("❌ All fields are required.");
    }

    const newReview = new Review({ name, rating, comment });
    await newReview.save();

    // Send Email Notification for Review
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: "smileslyf29@gmail.com",
      subject: "⭐ New Customer Review Submitted",
      html: `
        <h3>New Review Received</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Rating:</strong> ${rating} / 5</p>
        <p><strong>Comment:</strong><br>${comment}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 Review email sent to admin');

    res.send("✅ Review submitted successfully!");
  } catch (err) {
    console.error("❌ Error saving review:", err);
    res.status(500).send("❌ Failed to submit review.");
  }
});

// ✅ Get Reviews Route
app.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error("❌ Error fetching reviews:", err);
    res.status(500).send("❌ Failed to load reviews.");
  }
});

// ✅ Terms & Services Page (static HTML)
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

