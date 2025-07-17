const axios = require("axios").default;
const msg91Config = require("../config/mgs91Config");

/**
 *
 * @param {Number} mobile
 * @returns
 */
exports.sendOTP = async (mobile, countryCode) => {
  const url = `${msg91Config.baseURL}/otp`;
  const requestBody = {
    template_id: msg91Config.otpTemplateId,
    mobile: `${countryCode}${mobile}`,
    authkey: msg91Config.authKey,
    otp_expiry: 1,
    otp_length: 4,
  };

  let otpResponse = await axios.post(url, requestBody);

  return otpResponse.data;
};

/**
 *
 * @param {Number} otp
 * @param {Number} mobile
 * @returns
 */
exports.verifyOTP = async (otp, mobile, countryCode) => {
  const url = `${msg91Config.baseURL}/otp/verify`;
  const requestBody = {
    otp: otp,
    authkey: msg91Config.authKey,
    mobile: `${countryCode}${mobile}`,
  };

  let otpResponse = await axios.post(url, requestBody);

  return otpResponse.data;
};

/**
 *
 * @param {Number} mobile
 * @returns
 */
exports.resendOTP = async (mobile, countryCode) => {
  const url = `${msg91Config.baseURL}/otp/retry?&mobile=${countryCode}${mobile}&authkey=${msg91Config.authKey}&retrytype=text`;
  let resendOTPResponse = await axios.get(url);
  console.log(resendOTPResponse.data);

  return resendOTPResponse.data;
};

/**
 *
 * @param {Object} data
 * @returns This function return proper message for OTP related errors
 */
exports.getMessage = (data) => {
  switch (data.message) {
    case "Mobile no. not found":
      return "Please enter a phone number that is based in India.";
    case "OTP expired":
      return "Your OTP is expired. Please resend OTP and verify again.";
    case "Mobile no. already verified":
      return "Your mobile number already verified.";
    default:
      return "Your OTP is invalid. Please enter the correct OTP.";
  }
};
