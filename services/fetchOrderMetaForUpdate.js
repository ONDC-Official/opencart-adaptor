import mysql from "mysql2/promise";

const dbConfig = {
host: process.env.DB_HOST,
user: process.env.DB_USER,
password: process.env.DB_PASS,
database: process.env.DB_NAME,
};

export const fetchOrderMetaForUpdate = async (orderId) => {
const connection = await mysql.createConnection(dbConfig);

// Fetch order and status
const [[order]] = await connection.execute(
`SELECT o.*, os.name AS status_name FROM oc_order o JOIN oc_order_status os ON o.order_status_id = os.order_status_id WHERE o.order_id = ?`,
[orderId]
);

// Get products
const [products] = await connection.execute(
`SELECT * FROM oc_order_product WHERE order_id = ?`,
[orderId]
);

await connection.end();

// Prepare items
const items = products.map(p => ({
    id: `${p.product_id}`,
    fulfillment_id: `F${p.order_product_id}`,
    quantity: { count: p.quantity },
    descriptor: {
    name: p.name,
    code: p.model
    },
    // tags: [{
    //     code: "type",
    //     list: [{ code: "type", value: "item" }]
    // }]
}));

// Fulfillments
const fulfillments = products.map(p => ({
        id: `F${p.order_product_id}`,
        "@ondc/org/provider_name": order.store_name,
        state: {
        descriptor: { code: "Order-delivered" }
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
            state: order.shipping_zone
        }
        },
        time: {
            timestamp: new Date().toISOString()
        },
        instructions: {
            code: "1",
            name: "Proof of pickup",
            short_desc: "pickup confirmation code",
            long_desc: "detailed instructions such as register or counter no for pickup",
            images: [
                "https://lsp.com/pickup_image.png",
                "https://lsp.com/rider_location.png"
            ]
        },
        authorization: {
            type: "OTP",
            token: "OTP code",
            valid_from: new Date().toISOString(),
            valid_to: new Date(Date.now() + 3600000).toISOString()
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
        time: {
            timestamp: new Date(Date.now() + 5400000).toISOString()
        },
        instructions: {
            code: "3",
            name: "Proof of delivery",
            short_desc: "value of delivery code",
            images: [
                "https://lsp.com/delivery_image.png",
                "https://lsp.com/rider_location.png"
            ]
        },
        person: {
            name: `${order.shipping_firstname} ${order.shipping_lastname}`,
        },
        contact: {
            phone: order.telephone,
            email: order.email
        }
        },
        agent: {
            name: "agent_name",
            phone: order.telephone
        }
}));

// Billing
const billing = {
    name: `${order.payment_firstname} ${order.payment_lastname}`,
    address: {
        name: `${order.payment_firstname} ${order.payment_lastname}`,
        building: order.payment_address_1,
        locality: order.payment_address_2,
        city: order.payment_city,
        state: order.payment_zone,
        country: order.payment_country,
        area_code: order.payment_postcode
        },
    email: order.email,
    phone: order.telephone,
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
        items,
        billing,
        fulfillments
    };
};