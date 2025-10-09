const Razorpay = require("razorpay");

// This razorpayInstance will be used to
// access any resource from razorpay
const razorpayInstance = new Razorpay({
  // Replace with your key_id
  // key_id: "rzp_test_9pIec7jC0Q90zJ",
  // // Replace with your key_secret
  // key_secret: "Uf27oEY0qO1NSYdwe6To7wNl",
  key_id: "rzp_test_RQ9O90aKqNA4az",
  key_secret: "Dc9z0FtBpsZD3515eSoDxEOJ",
});
module.exports = razorpayInstance;
