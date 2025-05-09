const PDFDocument = require("pdfkit");
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const generateInvoiceAndUpload = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
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

    // ---- Header Section ----
    doc.image("image/industrywaala.png", 50, 30, { width: 120 });
    doc.image("image/saratech.png", 420, 30, { width: 100 });

    doc
      .fontSize(9)
      .font("Helvetica")
      .text("B-80, B Block, Sector 5,", 400, 70, { align: "right" })
      .text("Noida,", { align: "right" })
      .text("Uttar Pradesh 201301", { align: "right" })
      .text("PH.No. 7377 01 7377", { align: "right" })
      .text("GSTIN : 09ACUPT6154G1ZV", { align: "right" });

    // ---- Title ----
    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(20).text("INVOICE", 50);

    // ---- Left Column (Customer Info) ----
    doc
      .moveDown(0.5)
      .font("Helvetica")
      .fontSize(11)
      .text(order.billing_customer_name, 50)
      .text(order.billing_address)
      .text(`${order.billing_city} ${order.billing_pincode}`)
      .text(order.billing_state)
      .text(order.billing_country)
      .text(order.billing_email)
      .text(order.billing_phone);

    // ---- Right Column (Order Info) ----
    const orderInfoTop = 185;
    doc
      .fontSize(11)
      .text(`Order Number: ${order.order_id}`, 370, orderInfoTop, {
        align: "right",
      })
      .text(`Order Date: ${order.order_date}`, { align: "right" });

    if (order.customer_gstin) {
      doc.text(`GST: ${order.customer_gstin}`, { align: "right" });
    }

    doc.text(`Payment Method: ${order.payment_method}`, { align: "right" });

    // ---- Table Header ----
    doc.moveDown(2);
    const tableTopY = doc.y + 30;
    const tableX = 50;
    const tableWidth = 520;

    doc.fillColor("black").rect(tableX, tableTopY, tableWidth, 22).fill();

    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Product", tableX + 5, tableTopY + 5)
      .text("Quantity", tableX + 330, tableTopY + 5)
      .text("Price", tableX + 430, tableTopY + 5);

    // ---- Table Rows ----
    let y = tableTopY + 50;
    doc.font("Helvetica").fillColor("black");

    order.order_items.forEach((item) => {
      doc.text(item.name, tableX + 5, y);
      doc.text(item.units.toString(), tableX + 330, y);
      doc.text(`Rs. ${item.selling_price}`, tableX + 430, y);
      y += 20;
    });

    // Horizontal line below table
    doc
      .moveTo(tableX, y)
      .lineTo(tableX + tableWidth, y)
      .stroke();
    y += 10;

    // ---- Totals ----
    doc
      .font("Helvetica-Bold")
      .text("Subtotal", 400, y)
      .text(`${order.sub_total}`, 480, y, { align: "right" });

    y += 15;
    doc
      .font("Helvetica")
      .text("Shipping", 400, y)
      .text(`${order.shipping_charges} (Flat rate)`, 480, y, {
        align: "right",
      });

    y += 15;
    doc
      .font("Helvetica-Bold")
      .text("Total", 400, y)
      .text(
        `${(Number(order.sub_total) + Number(order.shipping_charges)).toFixed(
          2
        )}`,
        480,
        y,
        { align: "right" }
      );

    doc.end();
  });
};

module.exports = generateInvoiceAndUpload;
