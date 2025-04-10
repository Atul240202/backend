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
          })
          .promise();

        const invoiceUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        resolve(invoiceUrl);
      } catch (err) {
        reject(err);
      }
    });

    // Header with Logos
    doc.image("image/logo.png", 50, 30, { width: 100 });
    doc.fontSize(10).text("Your company details", 200, 30, { align: "right" });
    doc.text("B-80, B Block, Sector 5, Noida, Uttar Pradesh 201301", {
      align: "right",
    });
    doc.text("PH.No. 7377 01 7377", { align: "right" });
    doc.text("GSTIN : 09ACUPT6154G1ZV", { align: "right" });
    doc.moveDown(2);

    // Invoice Title
    doc.fontSize(18).text("INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Order Number: ${order.order_id}`, 50, doc.y);
    doc.text(`Order Date: ${order.order_date}`);
    doc.text(`Payment Method: ${order.payment_method}`);
    doc.moveDown();

    // Table Headers
    doc.font("Helvetica-Bold");
    doc.text("Product", 50, doc.y, { width: 250, continued: true });
    doc.text("Qty", 310, doc.y, {
      width: 50,
      continued: true,
      align: "center",
    });
    doc.text("Unit Price", 370, doc.y, {
      width: 80,
      continued: true,
      align: "right",
    });
    doc.text("Total", 460, doc.y, { width: 80, align: "right" });
    doc.moveDown();

    doc.font("Helvetica");

    // Order Items in Table Format
    order.order_items.forEach((item) => {
      doc.text(item.name, 50, doc.y, {
        width: 250,
        ellipsis: true,
        continued: true,
      });
      doc.text(`${item.units}`, 310, doc.y, {
        width: 50,
        continued: true,
        align: "center",
      });
      doc.text(`Rs. ${item.selling_price}`, 370, doc.y, {
        width: 80,
        continued: true,
        align: "right",
      });
      doc.text(
        `Rs. ${(item.selling_price * item.units).toFixed(2)}`,
        460,
        doc.y,
        { width: 80, align: "right" }
      );
      doc.moveDown();
    });
    doc.moveDown();

    // Summary Section
    doc.font("Helvetica-Bold");
    doc.text(`Subtotal: Rs. ${order.sub_total}`, 400, doc.y, {
      align: "right",
    });
    doc.text(`Shipping: Rs. ${order.shipping_charges}`, 400, doc.y, {
      align: "right",
    });
    doc.text(
      `Total: Rs. ${Number(order.sub_total) + Number(order.shipping_charges)}`,
      400,
      doc.y,
      { align: "right" }
    );
    doc.moveDown(2);

    // Billing Details
    doc.fontSize(12).font("Helvetica");
    doc.text("Billing To:", 50, doc.y, { bold: true });
    doc.text(`${order.billing_customer_name} ${order.billing_last_name}`);
    doc.text(order.billing_address);
    if (order.billing_address_2) doc.text(order.billing_address_2);
    doc.text(
      `${order.billing_city}, ${order.billing_state}, ${order.billing_country}`
    );
    doc.text(`Email: ${order.billing_email} | Phone: ${order.billing_phone}`);
    doc.moveDown();
    doc.end();
  });
};

module.exports = generateInvoiceAndUpload;
