import mysql from "mysql2/promise";

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

export const fetchOrderMetaForCancel = async (orderId, cancellationInput = {}, context = {}) => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // order and status
    const [[order]] = await connection.execute(
      `SELECT o.*, os.name AS status_name FROM oc_order o
       JOIN oc_order_status os ON o.order_status_id = os.order_status_id
       WHERE o.order_id = ?`,
      [orderId]
    );

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // order-related data
    const [products] = await connection.execute(
      `SELECT op.*, p.sku, p.image, p.model AS product_model FROM oc_order_product op
       LEFT JOIN oc_product p ON op.product_id = p.product_id
       WHERE op.order_id = ?`,
      [orderId]
    );

    const [options] = await connection.execute(
      `SELECT * FROM oc_order_option WHERE order_id = ?`,
      [orderId]
    );

    const [totals] = await connection.execute(
      `SELECT * FROM oc_order_total WHERE order_id = ? ORDER BY sort_order ASC`,
      [orderId]
    );

    const [[shippingZone = {}]] = await connection.execute(
      `SELECT name FROM oc_zone WHERE zone_id = ?`,
      [order.shipping_zone_id]
    );
    const [[paymentZone = {}]] = await connection.execute(
      `SELECT name FROM oc_zone WHERE zone_id = ?`,
      [order.payment_zone_id]
    );
    const [[shippingCountry = {}]] = await connection.execute(
      `SELECT name FROM oc_country WHERE country_id = ?`,
      [order.shipping_country_id]
    );
    const [[paymentCountry = {}]] = await connection.execute(
      `SELECT name FROM oc_country WHERE country_id = ?`,
      [order.payment_country_id]
    );

    const optionsByProduct = options.reduce((acc, opt) => {
      if (!acc[opt.order_product_id]) acc[opt.order_product_id] = [];
      acc[opt.order_product_id].push({ name: opt.name, value: opt.value });
      return acc;
    }, {});

    // item list
    const items = products.map(p => ({
      id: `I${p.product_id}`,
      fulfillment_id: `F${p.order_product_id}`,
      quantity: { count: p.quantity },
      descriptor: {
        name: p.name,
        code: p.sku || p.product_model,
        images: p.image ? [`https://yourdomain.com/image/${p.image}`] : [],
        additional_desc: (optionsByProduct[p.order_product_id] || [])
          .map(o => `${o.name}: ${o.value}`).join(", ")
      },
      price: {
        value: parseFloat(p.total).toFixed(2),
        currency: order.currency_code
      }
    }));

    const fulfillments = products.map(p => ({
      id: `F${p.order_product_id}`,
      "@ondc/org/provider_name": order.store_name,
      type: "Delivery",
      state: {
        descriptor: { code: "Cancelled" }
      }
    }));

    const breakup = totals.map(t => ({
      title: t.title,
      price: {
        value: parseFloat(t.value).toFixed(2),
        currency: order.currency_code
      },
      "@ondc/org/item_id": t.code
    }));

    const quote = {
      price: {
        value: parseFloat(order.total).toFixed(2),
        currency: order.currency_code
      },
      breakup
    };

    const billing = {
      name: `${order.payment_firstname} ${order.payment_lastname}`,
      phone: order.telephone,
      email: order.email,
      address: {
        name: `${order.payment_firstname} ${order.payment_lastname}`,
        building: order.payment_address_1,
        locality: order.payment_address_2,
        city: order.payment_city,
        state: paymentZone?.name ?? order.payment_zone,
        country: paymentCountry?.name ?? order.payment_country,
        area_code: order.payment_postcode
      },
      created_at: order.date_added,
      updated_at: new Date(order.date_modified).toISOString()
    };

    return {
      id: order.order_id.toString(),
      state: order.status_name,
      provider: {
        id: order.store_id.toString(),
        locations: [{ id: "L1" }]
      },
      billing,
      items,
      fulfillments,
      quote,
      cancellation: {
        cancelled_by: cancellationInput.cancelled_by ?? context.bap_id ?? "seller",
        reason: {
          id: cancellationInput.reason?.id ?? "006"
        }
      },
      payment: {
        uri: "https://yourdomain.com/payment",
        tl_method: "http/get",
        type: "ON-ORDER",
        status: "PAID"
      },
      created_at: order.date_added,
      updated_at: new Date(order.date_modified).toISOString()
    };
  } catch (err) {
    console.error("Error fetching order metadata:", err.message);
    throw err;
  } finally {
    await connection.end();
  }
};



const mapOrderStatusToONDCCode = (status) => {
  switch (status.toLowerCase()) {
    case "pending": return "Pending";
    case "processing": return "Order-confirmed";
    case "shipped": return "Order-picked-up";
    case "out for delivery": return "Out-for-delivery";
    case "delivered": return "Delivered";
    default: return "Order-confirmed";
  }
};

export const fetchOrderMetaForStatus = async (orderId) => {
  const connection = await mysql.createConnection(dbConfig);

  // order + status
  const [[order]] = await connection.execute(
    `SELECT o.*, os.name AS status_name FROM oc_order o
     JOIN oc_order_status os ON o.order_status_id = os.order_status_id
     WHERE o.order_id = ?`,
    [orderId]
  );

  // products with product details 
  const [products] = await connection.execute(
    `SELECT op.*, p.sku, p.image, p.model AS product_model FROM oc_order_product op
     LEFT JOIN oc_product p ON op.product_id = p.product_id
     WHERE op.order_id = ?`,
    [orderId]
  );

  // order options
  const [options] = await connection.execute(
    `SELECT * FROM oc_order_option WHERE order_id = ?`,
    [orderId]
  );

  // Fetch order totals
  const [totals] = await connection.execute(
    `SELECT * FROM oc_order_total WHERE order_id = ? ORDER BY sort_order ASC`,
    [orderId]
  );

  // zones
  const [[shippingZone]] = await connection.execute(
    `SELECT name, code FROM oc_zone WHERE zone_id = ?`,
    [order.shipping_zone_id]
  );
  const [[paymentZone]] = await connection.execute(
    `SELECT name, code FROM oc_zone WHERE zone_id = ?`,
    [order.payment_zone_id]
  );

  // countries
  const [[shippingCountry]] = await connection.execute(
    `SELECT name, iso_code_2 FROM oc_country WHERE country_id = ?`,
    [order.shipping_country_id]
  );
  const [[paymentCountry]] = await connection.execute(
    `SELECT name, iso_code_2 FROM oc_country WHERE country_id = ?`,
    [order.payment_country_id]
  );

  await connection.end();

  const optionsByProduct = options.reduce((acc, opt) => {
    if (!acc[opt.order_product_id]) acc[opt.order_product_id] = [];
    acc[opt.order_product_id].push({ name: opt.name, value: opt.value });
    return acc;
  }, {});

  const items = products.map(p => ({
    id: `I${p.product_id}`,
    quantity: { count: p.quantity },
    descriptor: {
      name: p.name,
      code: p.sku || p.product_model,
      images: p.image ? [`https://yourdomain.com/image/${p.image}`] : [],
      additional_desc: optionsByProduct[p.order_product_id]?.map(o => `${o.name}: ${o.value}`).join(", ") || ""
    },
    price: {
      value: parseFloat(p.total).toFixed(2),
      currency: order.currency_code
    }
  }));

  // Breakup array from totals
  const breakup = totals.map(t => ({
    title: t.title,
    price: {
      value: parseFloat(t.value).toFixed(2),
      currency: order.currency_code
    },
    "@ondc/org/item_id": t.code
  }));

  // Quote object
  const quote = {
    price: {
      value: parseFloat(order.total).toFixed(2),
      currency: order.currency_code
    },
    breakup
  };

  // Fulfillments with country and zone names
  const fulfillments = products.map(p => ({
    id: `F${p.order_product_id}`,
    "@ondc/org/provider_name": order.store_name,
    state: {
      descriptor: {
        code: mapOrderStatusToONDCCode(order.status_name)
      }
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
          locality: order.shipping_city,
          city: order.shipping_city,
          area_code: order.shipping_postcode,
          state: shippingZone?.name || order.shipping_zone,
          country: shippingCountry?.name || order.shipping_country
        }
      },
      time: {
        range: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 1800000).toISOString()
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
          state: shippingZone?.name || order.shipping_zone,
          country: shippingCountry?.name || order.shipping_country,
          area_code: order.shipping_postcode
        }
      },
      time: {
        range: {
          start: new Date(Date.now() + 3600000).toISOString(),
          end: new Date(Date.now() + 5400000).toISOString()
        }
      },
      person: { name: `${order.shipping_firstname} ${order.shipping_lastname}` },
      contact: {
        phone: order.telephone,
        email: order.email
      }
    }
  }));

  // Billing info with country and zone
  const billing = {
    name: `${order.payment_firstname} ${order.payment_lastname}`,
    email: order.email,
    phone: order.telephone,
    address: {
      name: `${order.payment_firstname} ${order.payment_lastname}`,
      building: order.payment_address_1,
      locality: order.payment_address_2,
      city: order.payment_city,
      state: paymentZone?.name || order.payment_zone,
      country: paymentCountry?.name || order.payment_country,
      area_code: order.payment_postcode
    },
    created_at: order.date_added,
    updated_at: order.date_modified
  };

  return {
    id: order.order_id,
    state: order.status_name,
    provider: {
      id: `${order.store_id}`,
      locations: [{ id: "L1" }]
    },
    billing,
    items,
    fulfillments,
    quote
  };
};
