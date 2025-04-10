const PDFDocument = require("pdfkit");
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const generateInvoiceAndUpload = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);
      const fileName = `invoices/invoice-${order.order_id}.pdf`;

      try {
        await s3
          .putObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: pdfBuffer,
            ContentType: "application/pdf",
            ACL: "public-read",
          })
          .promise();

        const invoiceUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        resolve(invoiceUrl);
      } catch (err) {
        reject(err);
      }
    });

    // PDF content
    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown().fontSize(12).text(`Order ID: ${order.order_id}`);
    doc.text(`Date: ${order.order_date}`);
    doc.text(`Customer: ${order.billing_customer_name}`);
    doc.text(`Address: ${order.shipping_address}`);
    doc.moveDown();

    order.order_items.forEach((item, i) => {
      doc.text(
        `${i + 1}. ${item.name} | Qty: ${item.units} | Price: ₹${
          item.selling_price
        }`
      );
    });

    doc.moveDown().text(`Shipping Charges: ₹${order.shipping_charges}`);
    doc.text(`Total: ₹${order.sub_total}`);
    doc.end();
  });
};

module.exports = generateInvoiceAndUpload;
