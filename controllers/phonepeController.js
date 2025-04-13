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

    const xVerify =
      require("crypto")
        .createHash("sha256")
        .update(
          `/pg/v1/status/${process.env.PHONEPE_MERCHANT_ID}/${transactionId}${process.env.PHONEPE_SALT_KEY}`
        )
        .digest("hex") + `###${process.env.PHONEPE_SALT_INDEX}`;

    const response = await fetch(
      `${process.env.PHONEPE_API_URL}/pg/v1/status/${process.env.PHONEPE_MERCHANT_ID}/${transactionId}`,
      {
        method: "GET",
        headers: {
          "X-VERIFY": xVerify,
          accept: "application/json",
        },
      }
    );

    const result = await response.json();
    console.log("Order finaling result", result);
    const status = result?.data?.state;

    if (status === "COMPLETED") {
      finalOrder.status = "payment confirmed";
      const finalResult = await createFinalOrderFromTransaction(
        finalOrder,
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
    } else {
      finalOrder.status = "cancelled";
      await finalOrder.save();
      return res.status(400).json({
        success: false,
        status: "failed",
        message: "Payment failed",
      });
    }
  } catch (err) {
    console.error("PhonePe verification error on controller:", err);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: err.message,
    });
  }
};
