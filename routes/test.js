import express from 'express';
import opencartService from '../services/opencart.js';

const router = express.Router();

router.post('/test-opencart-order', async (req, res) => {
    try {
        // Log environment variables (without sensitive data)
        console.log('Environment check:');
        console.log('OPENCART_SITE url configured:', !!process.env.OPENCART_SITE);
        console.log('OPENCART_USERNAME configured:', !!process.env.OPENCART_USERNAME);
        console.log('OPENCART_KEY configured:', !!process.env.OPENCART_KEY);

        // Log the incoming request
        console.log('Received request body:', req.body);

        // Default test order data
        const defaultOrder = {
            id: `test-order-${Date.now()}`,
            items: [
                {
                    id: "1", // Default product ID
                    quantity: { count: 1 }
                }
            ],
            billing: {
                name: "Test Customer",
                email: "test@example.com",
                phone: "1234567890",
                address: "123 Test Street"
            },
            fulfillments: [{
                type: "Delivery",
                end: {
                    location: {
                        address: {
                            area_code: "123456",
                            city: "Test City",
                            state: "Test State",
                            full: "123 Test Street, Test City"
                        }
                    },
                    contact: {
                        name: "Test Customer",
                        phone: "1234567890"
                    }
                }
            }]
        };

        // Use request body if provided, otherwise use default values
        const testOrder = {
            ...defaultOrder,
            items: [{
                id: req.body?.productId || defaultOrder.items[0].id,
                quantity: { count: req.body?.quantity || defaultOrder.items[0].quantity.count }
            }],
            billing: {
                name: req.body?.customerName || defaultOrder.billing.name,
                email: req.body?.email || defaultOrder.billing.email,
                phone: req.body?.phone || defaultOrder.billing.phone,
                address: req.body?.address || defaultOrder.billing.address
            },
            fulfillments: [{
                ...defaultOrder.fulfillments[0],
                end: {
                    ...defaultOrder.fulfillments[0].end,
                    location: {
                        ...defaultOrder.fulfillments[0].end.location,
                        address: {
                            area_code: req.body?.pincode || defaultOrder.fulfillments[0].end.location.address.area_code,
                            city: req.body?.city || defaultOrder.fulfillments[0].end.location.address.city,
                            state: req.body?.state || defaultOrder.fulfillments[0].end.location.address.state,
                            full: req.body?.fullAddress || defaultOrder.fulfillments[0].end.location.address.full
                        }
                    },
                    contact: {
                        name: req.body?.customerName || defaultOrder.fulfillments[0].end.contact.name,
                        phone: req.body?.phone || defaultOrder.fulfillments[0].end.contact.phone
                    }
                }
            }]
        };

        console.log('Testing OpenCart order creation with data:', JSON.stringify(testOrder, null, 2));
        const result = await opencartService.createOrder(testOrder);
        
        if (result.success) {
            console.log('Order created successfully:', result);
            res.json({
                success: true,
                message: 'Test order created successfully',
                orderId: result.orderId,
                data: result.data
            });
        } else {
            console.error('Failed to create order:', result.error);
            res.status(500).json({
                success: false,
                message: 'Failed to create test order',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in test endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Error testing OpenCart order creation',
            error: error.message
        });
    }
});

// Add a GET endpoint to check OpenCart connection
router.get('/test-opencart-connection', async (req, res) => {
    try {
        const result = await opencartService.login();
        res.json({
            success: result,
            message: result ? 'Successfully connected to OpenCart' : 'Failed to connect to OpenCart',
            config: {
                apiUrl: process.env.OPENCART_SITE,
                usernameConfigured: !!process.env.OPENCART_USERNAME,
                apiKeyConfigured: !!process.env.OPENCART_KEY
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error testing OpenCart connection',
            error: error.message
        });
    }
});

export default router; 