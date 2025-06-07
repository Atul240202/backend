const crypto = require("crypto");
const FinalOrder = require("../models/FinalOrder");
const {
  createFinalOrderFromTransaction,
} = require("../controllers/finalOrderController");

exports.verifyPhonePePayment = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const finalOrder = await FinalOrder.findOne({
      phonepeTransactionId: transactionId,
    });

    if (!finalOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;

    // ✅ Generate X-VERIFY Header
    const statusPath = `/pg/v1/status/${merchantId}/${transactionId}`;
    const xVerify =
      crypto
        .createHash("sha256")
        .update(statusPath + saltKey)
        .digest("hex") + `###${saltIndex}`;

    const phonePeStatusUrl = `${process.env.PHONEPE_API_URL}${statusPath}`;

    const response = await fetch(phonePeStatusUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": merchantId,
        accept: "application/json",
      },
    });

    const result = await response.json();

    const status = result?.data?.state;
    const code = result?.code;

    if (status === "COMPLETED" && code === "PAYMENT_SUCCESS") {
      const orderData = {
        ...finalOrder.toObject(),
        user: finalOrder.user,
        order_items: finalOrder.order_items,
      };

      const finalResult = await createFinalOrderFromTransaction(
        orderData,
        finalOrder.phonepeTransactionId,
        result
      );

      if (finalResult.success) {
        return res.status(200).json({
          success: true,
          status: "success",
          transactionId: result.data.merchantTransactionId,
        });
      }
    } else if (status === "FAILED" || code === "PAYMENT_ERROR") {
      console.warn("❌ Payment failed. Updating order status...");
      finalOrder.status = "cancelled";
      await finalOrder.save();
      return res.status(400).json({
        success: false,
        status: "failed",
        message: "Payment failed",
      });
    } else {
      return res.status(202).json({
        success: false,
        status: "pending",
        message: "Payment is still pending. Please try again later.",
      });
    }
  } catch (err) {
    console.error("❌ Error in verifyPhonePePayment:", err);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: err.message,
    });
  }
};
