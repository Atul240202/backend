const express = require("express");
const router = express.Router();
const { verifyPhonePePayment } = require("../controllers/phonepeController");

router.get("/status/:transactionId", verifyPhonePePayment);

module.exports = router;
