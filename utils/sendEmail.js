const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  console.log("Send email triggered");
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  console.log("Transporter", transporter);

  // Define email options
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };
  console.log("mailOptions", mailOptions);
  // Send email
  const response = await transporter.sendMail(mailOptions);
  console.log("log from transporter", response);
};

module.exports = sendEmail;
