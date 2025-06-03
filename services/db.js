// services/db.js
import mysql from 'mysql2/promise';

export const getOpenCartOrderIdFromDB = async (ondcOrderId) => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    const [rows] = await connection.execute(
        'SELECT order_id FROM oc_order WHERE order_id = ?',
        [ondcOrderId]
    );

    await connection.end();
    return rows.length ? rows[0].order_id : null;
};

export const getOrderDetailsFromDB = async (ondcOrderId) => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    const [rows] = await connection.execute(
        'SELECT order_id, order_status_id FROM oc_order WHERE order_id = ?',
        [ondcOrderId]
    );
    await connection.end();
    return rows.length ? rows[0] : null;
};
export const getProductDescriptionFromDB = async (productId) => {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
  
    const [rows] = await connection.execute(
      'SELECT description FROM oc_product_description WHERE product_id = ? AND language_id = 1',
      [productId]
    );
    await connection.end();
    return rows.length ? rows[0].description : null;
  };
  


  export const getProductMetadataFromDB = async (productId) => {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
  
    const [rows] = await connection.execute(
      `SELECT p.weight, m.name AS manufacturer 
       FROM oc_product p
       LEFT JOIN oc_manufacturer m ON p.manufacturer_id = m.manufacturer_id
       WHERE p.product_id = ?`,
      [productId]
    );
  
    await connection.end();
    return rows.length ? rows[0] : { weight: null, manufacturer: null };
  };
  