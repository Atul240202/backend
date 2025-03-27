// Generate a unique order ID in the format ORD-YYYYMMDD-XXXX
exports.generateOrderId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // Generate a random 4-digit number
  const random = Math.floor(1000 + Math.random() * 9000);

  return `ORD-${year}${month}${day}-${random}`;
};
