const sendEmail = require("../utils/sendEmail");
const path = require("path");
const fs = require("fs");

exports.sendJobApplicationMail = async (req, res) => {
  try {
    const { name, email, phone, address, position, pitch } = req.body;
    const resumeFile = req.file;

    if (!name || !email || !phone || !address || !position || !resumeFile) {
      return res.status(400).json({
        success: false,
        message: "All fields and resume are required.",
      });
    }

    const subject = `New Job Application - ${position}`;
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px;">
        <h2>New Job Application Received</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Position Applied For:</strong> ${position}</p>
        <p><strong>Why should we hire you?</strong></p>
        <p>${pitch}</p>
      </div>
    `;

    await sendEmail({
      email: process.env.CONTACT_RECEIVER_EMAIL,
      subject,
      message: htmlMessage,
      attachments: [
        {
          filename: resumeFile.originalname,
          content: fs.readFileSync(resumeFile.path),
        },
      ],
    });

    fs.unlinkSync(resumeFile.path);

    return res.status(200).json({
      success: true,
      message: "Application sent successfully.",
    });
  } catch (error) {
    console.error("Job application mail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send application.",
    });
  }
};
