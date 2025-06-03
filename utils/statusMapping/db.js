import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
});

export async function getOrderStatusFromDB(orderId) {
  const [rows] = await pool.execute(
    'SELECT o.order_id, o.order_status_id, s.name AS status_name, o.date_modified FROM oc_order o JOIN oc_order_status s ON o.order_status_id = s.order_status_id WHERE o.order_id = ?',
    [orderId]
  );

  return rows[0]; // Return first (and only) row
}

async function saveOnStatusLog(payload) {
  const log = JSON.stringify(payload);
  const [res] = await pool.execute(
    'INSERT INTO ondc_status_logs (payload, created_at) VALUES (?, NOW())',
    [log]
  );
  return res.insertId;
}

export default  {
  getOrderStatusFromDB,
  saveOnStatusLog,
};
