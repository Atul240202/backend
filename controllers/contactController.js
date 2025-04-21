const sendEmail = require("../utils/sendEmail");

exports.sendContactMail = async (req, res) => {
  const { firstName, lastName, email, phone, message } = req.body;

  if (!firstName || !lastName || !email || !phone || !message) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const subject = "New Contact Inquiry - Industrywaala";
  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px;">
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    </div>
  `;

  try {
    await sendEmail({
      email: process.env.CONTACT_RECEIVER_EMAIL,
      subject,
      message: htmlMessage,
    });

    return res
      .status(200)
      .json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("Email send error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send message" });
  }
};
