const crypto = require("crypto");

const generateXVerify = (base64Payload, saltKey) => {
  const string = base64Payload + "/pg/v1/pay" + saltKey;
  const sha256 = crypto.createHash("sha256").update(string).digest("hex");
  const xVerify = sha256 + "###" + process.env.PHONEPE_SALT_INDEX;
  console.log("🔐 Generated X-VERIFY:", xVerify);
  return xVerify;
};

const processPhonePePayment = async (orderData, transactionId) => {
  console.log("🔁 processPhonePePayment called");

  const payload = {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    merchantTransactionId: transactionId,
    merchantUserId: sanitize(orderData.user.toString()),
    amount: Math.round(
      (parseFloat(orderData.sub_total) +
        (parseFloat(orderData.shipping_charges) || 0) +
        (parseFloat(orderData.transaction_charges) || 0) -
        (parseFloat(orderData.total_discount) || 0)) *
        100
    ),
    redirectUrl: `${process.env.FRONTEND_URL}/payment/callback?transactionId=${transactionId}`,
    redirectMode: "REDIRECT",
    callbackUrl: `${process.env.API_URL}/api/payment/phonepe/webhook`,
    mobileNumber: orderData.billing_phone?.replace(/\D/g, "").slice(-10),
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  console.log("🧾 Final payload:", JSON.stringify(payload, null, 2));

  // Validations
  if (!payload.merchantId || payload.merchantId.length > 38)
    throw new Error("❌ Invalid merchantId");
  if (
    !payload.merchantTransactionId ||
    payload.merchantTransactionId.length > 35
  )
    throw new Error("❌ Invalid merchantTransactionId");
  if (!/^[a-zA-Z0-9_-]+$/.test(payload.merchantTransactionId))
    throw new Error(
      "❌ merchantTransactionId must not contain special characters"
    );
  if (!/^[a-zA-Z0-9_-]+$/.test(payload.merchantUserId))
    throw new Error("❌ merchantUserId must not contain special characters");
  if (payload.amount < 100)
    throw new Error("❌ Amount must be greater than 100 paise (₹1)");

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  console.log("📤 base64Payload:", base64Payload);

  const xVerify = generateXVerify(base64Payload, process.env.PHONEPE_SALT_KEY);

  console.log(
    "🌐 Sending payment request to:",
    process.env.PHONEPE_PAYMENT_URL
  );

  const response = await fetch(process.env.PHONEPE_PAYMENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": xVerify,
    },
    body: JSON.stringify({ request: base64Payload }),
  });

  const text = await response.text();
  console.log("📨 Raw response from PhonePe:", text);

  try {
    const data = JSON.parse(text);

    if (!data.success || !data.data || !data.data.instrumentResponse) {
      console.error("❌ PhonePe returned error:", data);
      throw new Error(data.message || "PhonePe request failed");
    }

    console.log("✅ Payment initiated successfully");
    return {
      redirectUrl: data.data.instrumentResponse.redirectInfo.url,
      transactionId,
    };
  } catch (err) {
    console.error("❌ Failed to parse PhonePe response:", text);
    throw new Error("Invalid response from PhonePe");
  }
};

function sanitize(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

module.exports = { processPhonePePayment };
