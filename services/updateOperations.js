import mysql from "mysql2/promise";

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

export const handleItemUpdate = async (orderId, fulfillments, transactionId) => {
  const connection = await mysql.createConnection(dbConfig);

  for (const fulfillment of fulfillments) {
    const returnTags = fulfillment.tags?.find(t => t.code === "return_request")?.list || [];
    const itemIdTag = returnTags.find(t => t.code === "item_id");
    const returnReasonTag = returnTags.find(t => t.code === "RETURN_REASON");
    const returnCommentTag = returnTags.find(t => t.code === "RETURN_COMMENT");

    const itemId = fulfillment.items?.[0]?.id || itemIdTag?.value;

    const cancelReason = returnReasonTag?.value || "Not provided";
    const comment = returnCommentTag?.value || "";

    const [[reasonRow]] = await connection.execute(
      `SELECT return_reason_id FROM oc_return_reason WHERE name = ? LIMIT 1`,
      [cancelReason]
    );

    const [[productDetails]] = await connection.execute(
      `SELECT name, model FROM oc_order_product WHERE order_id = ? AND product_id = ? LIMIT 1`,
      [orderId, itemId]
    );

    const [[customerDetails]] = await connection.execute(
      `SELECT customer_id, firstname, lastname, email, telephone, date_added FROM oc_order WHERE order_id = ? LIMIT 1`,
      [orderId]
    );

    const returnReasonId = reasonRow?.return_reason_id || 1;

    await connection.execute(
      `INSERT INTO oc_return (
        order_id, product_id, customer_id, firstname, lastname, email, telephone,
        product, model, quantity, opened, return_reason_id, return_action_id,
        return_status_id, comment, date_ordered, date_added, date_modified
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        orderId,
        itemId,
        customerDetails?.customer_id || 0,
        customerDetails?.firstname || '',
        customerDetails?.lastname || '',
        customerDetails?.email || '',
        customerDetails?.telephone || '',
        productDetails?.name || '',
        productDetails?.model || '',
        1,
        0,
        returnReasonId,
        0,
        3,
        comment,
        customerDetails?.date_added?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
      ]
    );
  }

  const [rows] = await connection.execute(`SELECT COUNT(*) AS total FROM oc_return WHERE order_id = ?`, [orderId]);
  const [cancelledRows] = await connection.execute(`SELECT COUNT(*) AS cancelled FROM oc_return WHERE order_id = ? AND return_status_id = 1`, [orderId]);

  if (rows[0].total > 0 && cancelledRows[0].cancelled === rows[0].total) {
    await connection.execute(`UPDATE oc_order SET order_status_id = ? WHERE order_id = ?`, [8, orderId]);
  }

  await connection.end();
  return orderId;
};

export const handleFulfillmentUpdate = async (orderId, fulfillments, transactionId) => {
  const connection = await mysql.createConnection(dbConfig);

  for (const fulfillment of fulfillments) {
    const status = fulfillment.state || "updated";
    const comment = fulfillment.comment || "updated by API";

    await connection.execute(
      `INSERT INTO oc_order_history (order_id, order_status_id, notify, comment, date_added) VALUES (?, ?, 0, ?, NOW())`,
      [orderId, status, comment]
    );
  }

  await connection.end();
  return orderId;
};

export const handlePaymentUpdate = async (orderId, payments, transactionId) => {
  const connection = await mysql.createConnection(dbConfig);

  for (const payment of payments) {
    const type = payment.type || "unknown";
    const amount = payment.params?.amount || 0;
    const status = payment.status || "initiated";

    const comment = `Refund ₹${amount} via ${type} - status: ${status}`;

    await connection.execute(
      `INSERT INTO oc_order_history (order_id, order_status_id, notify, comment, date_added) VALUES (?, ?, 0, ?, NOW())`,
      [orderId, 8, comment]
    );
  }

  await connection.end();
  return orderId;
};
