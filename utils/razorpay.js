const Razorpay = require("razorpay");

// This razorpayInstance will be used to
// access any resource from razorpay
const razorpayInstance = new Razorpay({
  // Replace with your key_id
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
module.exports = razorpayInstance;
