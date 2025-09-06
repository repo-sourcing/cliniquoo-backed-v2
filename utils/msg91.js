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

// -------------------- WhatsApp Template Messaging (MSG91) --------------------

// Default WhatsApp bulk endpoint (can be overridden by env var if added later)
const MSG91_WHATSAPP_BULK_ENDPOINT =
  process.env.MSG91_WHATSAPP_BULK_ENDPOINT ||
  "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

// Static WhatsApp template config (can be overridden by env vars)
const MSG91_WA_INTEGRATED_NUMBER = process.env.MSG91_WA_INTEGRATED_NUMBER;
const MSG91_WA_NAMESPACE = process.env.MSG91_WA_NAMESPACE;

/**
 * Internal helper to build components object like { body_1: {type:'text', value:''}, ... }
 * @param {Array<string|number>} values - Ordered values for body_1..body_10 (supports up to 10 body components)
 */
function buildBodyComponents(values = []) {
  const components = {};
  values.forEach((val, idx) => {
    if (val !== undefined && val !== null && val !== "") {
      components[`body_${idx + 1}`] = { type: "text", value: String(val) };
    }
  });
  return components;
}

/**
 * Internal generic sender for WhatsApp template messages
 * @param {Object} params
 * @param {string} params.templateName - MSG91 template name
 * @param {string[]} params.to - Array of destination numbers as strings with country code (no +)
 * @param {Array<string|number>} params.bodyValues - Ordered values for placeholders (maps to body_1..body_10)
 * @param {string} [params.languageCode="en"] - Language code
 * @param {string} [params.policy="deterministic"] - Language policy
 * @param {string} [params.authKey] - Optional override for auth key; defaults to msg91Config.authKey
 * @param {string} [params.integratedNumber] - Optional override (defaults to MSG91_WA_INTEGRATED_NUMBER)
 * @param {string} [params.namespace] - Optional override (defaults to MSG91_WA_NAMESPACE)
 */
async function sendWhatsAppTemplate({
  templateName,
  integratedNumber,
  namespace,
  to,
  header,
  bodyValues = [],
  languageCode = "en",
  policy = "deterministic",
  authKey,
}) {
  const headers = {
    "Content-Type": "application/json",
    authkey: authKey || msg91Config.authKey,
  };

  const integrated_number_final =
    integratedNumber || MSG91_WA_INTEGRATED_NUMBER;
  const namespace_final = namespace || MSG91_WA_NAMESPACE;

  const components = buildBodyComponents(bodyValues);
  if (header) {
    components.header_1 = header;
  }

  const payload = {
    integrated_number: integrated_number_final,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode, policy },
        namespace: namespace_final,
        to_and_components: [
          {
            to,
            components,
          },
        ],
      },
    },
  };

  const resp = await axios.post(MSG91_WHATSAPP_BULK_ENDPOINT, payload, {
    headers,
  });
  return resp.data;
}

/**
 * Send WhatsApp appointment confirmation template via MSG91
 * Uses static integrated number and namespace (overridable via env or params).
 * @param {Object} params - Variables for the template
 * @param {string[]} params.to - List of phone numbers as strings with country code (no +)
 * @param {Array<string|number>} params.bodyValues - Values for body_1..body_5 in order
 * @param {string} [params.languageCode="en"]
 * @param {string} [params.policy="deterministic"]
 * @param {string} [params.authKey]
 * @param {string} [params.integratedNumber] - Optional override
 * @param {string} [params.namespace] - Optional override
 * @returns {Promise<any>} MSG91 API response data
 */
exports.sendWhatsAppAppointmentConfirmation = async (params) => {
  return sendWhatsAppTemplate({
    ...params,
    templateName: "appointment_confirmation_new",
  });
};

/**
 * Send WhatsApp appointment reminder template via MSG91
 * Uses static integrated number and namespace (overridable via env or params).
 * @param {Object} params - Variables for the template
 * @param {string[]} params.to - List of phone numbers as strings with country code (no +)
 * @param {Array<string|number>} params.bodyValues - Values for body_1..body_5 in order
 * @param {string} [params.languageCode="en"]
 * @param {string} [params.policy="deterministic"]
 * @param {string} [params.authKey]
 * @param {string} [params.integratedNumber] - Optional override
 * @param {string} [params.namespace] - Optional override
 * @returns {Promise<any>} MSG91 API response data
 */
exports.sendWhatsAppAppointmentReminder = async (params) => {
  return sendWhatsAppTemplate({
    ...params,
    templateName: "appointment_reminder_new",
  });
};

/**
 * Send WhatsApp appointment reschedule confirmation template via MSG91
 * Uses static integrated number and namespace (overridable via env or params).
 * @param {Object} params - Variables for the template
 * @param {string[]} params.to - List of phone numbers as strings with country code (no +)
 * @param {Array<string|number>} params.bodyValues - Values for body_1..body_5 in order
 * @param {string} [params.languageCode="en_US"]
 * @param {string} [params.policy="deterministic"]
 * @param {string} [params.authKey]
 * @param {string} [params.integratedNumber] - Optional override
 * @param {string} [params.namespace] - Optional override
 * @returns {Promise<any>} MSG91 API response data
 */
exports.sendWhatsAppAppointmentRescheduleConfirmation = async (params) => {
  return sendWhatsAppTemplate({
    ...params,
    templateName: "appoitment_reschedual_confirmation_new_2",
    languageCode: "en_US",
  });
};

/**
 * Send WhatsApp payment confirmation template via MSG91
 * Uses static integrated number and namespace (overridable via env or params).
 * @param {Object} params - Variables for the template
 * @param {string[]} params.to - List of phone numbers as strings with country code (no +)
 * @param {Array<string|number>} params.bodyValues - Values for body_1..body_4 in order
 * @param {string} [params.languageCode="en"]
 * @param {string} [params.policy="deterministic"]
 * @param {string} [params.authKey]
 * @param {string} [params.integratedNumber] - Optional override
 * @param {string} [params.namespace] - Optional override
 * @returns {Promise<any>} MSG91 API response data
 */
exports.sendWhatsAppPaymentConfirmation = async (params) => {
  return sendWhatsAppTemplate({
    ...params,
    templateName: "payment_confirmation_final",
  });
};

/**
 * Send WhatsApp prescription template via MSG91
 * Uses static integrated number and namespace (overridable via env or params).
 * @param {Object} params - Variables for the template
 * @param {string[]} params.to - List of phone numbers as strings with country code (no +)
 * @param {Object} params.header - Header component for the document
 * @param {string} params.header.filename - The name of the file
 * @param {string} params.header.value - The url of the media
 * @param {Array<string|number>} params.bodyValues - Values for body_1..body_5 in order
 * @param {string} [params.languageCode="en"]
 * @param {string} [params.policy="deterministic"]
 * @param {string} [params.authKey]
 * @param {string} [params.integratedNumber] - Optional override
 * @param {string} [params.namespace] - Optional override
 * @returns {Promise<any>} MSG91 API response data
 */
exports.sendWhatsAppPrescription = async (params) => {
  return sendWhatsAppTemplate({
    ...params,
    templateName: "prescription_new",
    header: { ...params.header, type: "document" },
  });
};

/**
 * Send WhatsApp bill template via MSG91
 * Uses static integrated number and namespace (overridable via env or params).
 * @param {Object} params - Variables for the template
 * @param {string[]} params.to - List of phone numbers as strings with country code (no +)
 * @param {Object} params.header - Header component for the document
 * @param {string} params.header.filename - The name of the file
 * @param {string} params.header.value - The url of the media
 * @param {Array<string|number>} params.bodyValues - Values for body_1..body_5 in order
 * @param {string} [params.languageCode="en"]
 * @param {string} [params.policy="deterministic"]
 * @param {string} [params.authKey]
 * @param {string} [params.integratedNumber] - Optional override
 * @param {string} [params.namespace] - Optional override
 * @returns {Promise<any>} MSG91 API response data
 */
exports.sendWhatsAppBill = async (params) => {
  return sendWhatsAppTemplate({
    ...params,
    templateName: "bill",
    header: { ...params.header, type: "document" },
  });
};
