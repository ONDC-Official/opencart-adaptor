import mysql from "mysql2/promise";

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

export const fetchOrderMetaForConfirm = async (orderId) => {
  const connection = await mysql.createConnection(dbConfig);

  const [[order]] = await connection.execute(
    `SELECT * FROM oc_order WHERE order_id = ?`,
    [orderId]
  );

  const [products] = await connection.execute(
    `SELECT * FROM oc_order_product WHERE order_id = ?`,
    [orderId]
  );

  await connection.end();

  const items = products.map(p => ({
    id: `I${p.product_id}`,
    fulfillment_id: `F${p.order_product_id}`,
    quantity: { count: p.quantity },
    tags: [
      {
        code: "type",
        list: [
          { code: "type", value: "item" }
        ]
      }
    ]
  }));

  const fulfillments = [{
    id: "F1",
    state: {
      descriptor: { code: "Accepted" }
    },
    type: "Delivery",
    tracking: true,
    "@ondc/org/TAT": "PT60M",
    start: {
      location: {
        id: "L1",
        descriptor: { name: order.store_name },
        gps: "12.956399,77.636803",
        address: {
          locality: order.shipping_address_1,
          city: order.shipping_city,
          area_code: order.shipping_postcode,
          state: order.shipping_zone
        }
      },
      contact: {
        phone: order.telephone,
        email: order.email
      }
    },
    end: {
      location: {
        gps: "12.453544,77.928379",
        address: {
          name: `${order.shipping_firstname} ${order.shipping_lastname}`,
          building: order.shipping_address_1,
          locality: order.shipping_address_2,
          city: order.shipping_city,
          state: order.shipping_zone,
          country: order.shipping_country,
          area_code: order.shipping_postcode
        }
      },
      contact: {
        phone: order.telephone,
        email: order.email
      }
    }
  }];

  return {
    id: order.order_id,
    state: "Accepted",
    provider: {
      id: `${order.store_id}`,
      locations: [{ id: "L1" }]
    },
    items,
    billing: {
      name: `${order.payment_firstname} ${order.payment_lastname}`,
      phone: order.telephone,
      email: order.email,
      address: {
        name: `${order.payment_firstname} ${order.payment_lastname}`,
        building: order.payment_address_1,
        locality: order.payment_address_2,
        city: order.payment_city,
        state: order.payment_zone,
        country: order.payment_country,
        area_code: order.payment_postcode
      },
      created_at: order.date_added,
      updated_at: order.date_modified
    },
    fulfillments
  };
};
