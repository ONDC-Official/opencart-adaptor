import axios from 'axios';
import FormData from 'form-data';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

class  createOrder {
  constructor() {
    this.baseUrl = process.env.OPENCART_SITE || 'http://localhost/opencart';
    this.username = process.env.OPENCART_USERNAME || 'demo';
    this.key = process.env.OPENCART_KEY || 'demo';
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseUrl,
      jar: this.cookieJar,
      withCredentials: true,
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }));
    this.apiToken = null;
  }

  async login() {
    const loginData = new FormData();
    loginData.append('username', this.username);
    loginData.append('key', this.key);
    const response = await this.client.post(
      '/index.php?route=api/login',
      loginData,
      { headers: loginData.getHeaders() }
    );
    if (!response.data.api_token) throw new Error('OpenCart API login failed');
    this.apiToken = response.data.api_token;
    console.log('Logged in successfully');
  }

  transformToOpenCartOrder(order) {
    const [fName, ...lNames] = order.billing.name.split(' ');
    const address = order.fulfillments[0].end.location.address;
    return {
      firstname: fName,
      lastname: lNames.join(' '),
      email: order.billing.email,
      telephone: order.billing.phone,
      address_1: order.billing.address,
      address_2: '',
      city: address.city,
      postcode: address.area_code,
      country_id: '99',
      zone_id: '3613',
      shipping_method: 'flat.flat',
      payment_method: 'cod',
      products: order.items.map(i => ({
        product_id: i.id,
        quantity: i.quantity.count,
        options: i.options || {}
      })),
      customer_id: order.customer_id,
    };
  }

  async createOrder(order) {
    try {
      await this.login();
      const client = this.client;
      const oc = this.transformToOpenCartOrder(order);

      console.log('🛒 Adding products to cart...');
      for (const p of oc.products) {
        const cartFd = new FormData();
        cartFd.append('product_id', p.product_id);
        cartFd.append('quantity', p.quantity);

        if (Object.keys(p.options).length > 0) {
          for (const optionId in p.options) {
            const optionValue = p.options[optionId];
            if (Array.isArray(optionValue)) {
              optionValue.forEach(val => cartFd.append(`option[${optionId}][]`, val));
            } else {
              cartFd.append(`option[${optionId}]`, optionValue);
            }
          }
        }

        const cartRes = await client.post(
          `/index.php?route=api/cart/add&api_token=${this.apiToken}`,
          cartFd,
          { headers: cartFd.getHeaders() }
        );
        console.log(`Add to cart response for product ${p.product_id}:`, cartRes.data);


        if (cartRes.data.error) {
          throw new Error(`Failed to add product ${p.product_id} to cart: ${JSON.stringify(cartRes.data.error)}`);
        }
      }

      const setAddress = async (route, oc) => {
        const fd = new FormData();
        fd.append('firstname', oc.firstname);
        fd.append('lastname', oc.lastname);
        fd.append('address_1', oc.address_1);
        fd.append('address_2', oc.address_2);
        fd.append('city', oc.city);
        fd.append('postcode', oc.postcode);
        fd.append('country_id', oc.country_id);
        fd.append('zone_id', oc.zone_id);

        await client.post(
          `/index.php?route=api/${route}/address&api_token=${this.apiToken}`,
          fd,
          { headers: fd.getHeaders() }
        );
      };

      await setAddress('payment', oc);
      await setAddress('shipping', oc);

      const shippingMethodsRes = await client.get(`/index.php?route=api/shipping/methods&api_token=${this.apiToken}`);
      const shippingMethods = shippingMethodsRes.data.shipping_methods;
      const firstMethodGroup = Object.values(shippingMethods)[0];
      const firstMethod = firstMethodGroup.quote[Object.keys(firstMethodGroup.quote)[0]];
      const shipMethFd = new FormData();
      shipMethFd.append('shipping_method', firstMethod.code);

      await client.post(`/index.php?route=api/shipping/method&api_token=${this.apiToken}`, shipMethFd, {
        headers: shipMethFd.getHeaders()
      });

      const paymentMethodsRes = await client.get(`/index.php?route=api/payment/methods&api_token=${this.apiToken}`);
      const paymentMethods = paymentMethodsRes.data.payment_methods;
      const firstPaymentMethod = paymentMethods[Object.keys(paymentMethods)[0]];
      const payMethFd = new FormData();
      payMethFd.append('payment_method', firstPaymentMethod.code);

      await client.post(`/index.php?route=api/payment/method&api_token=${this.apiToken}`, payMethFd, {
        headers: payMethFd.getHeaders()
      });

      const customerFd = new FormData();
      customerFd.append('firstname', oc.firstname);
      customerFd.append('lastname', oc.lastname);
      customerFd.append('email', oc.email || 'guest@example.com');
      customerFd.append('telephone', oc.telephone || '9999999999');

      await client.post(
        `/index.php?route=api/customer&api_token=${this.apiToken}`,
        customerFd,
        { headers: customerFd.getHeaders() }
      );

      const confirmRes = await client.get(`/index.php?route=api/order/add&api_token=${this.apiToken}`);
      if (confirmRes.data && confirmRes.data.order_id) {
        return { success: true, orderId: confirmRes.data.order_id };
      } else if (typeof confirmRes.data === 'string' && confirmRes.data.includes('order_id')) {
        const match = confirmRes.data.match(/"order_id":\s*(\d+)/);
        if (match) {
          return { success: true, orderId: parseInt(match[1]) };
        }
      }
      
      throw new Error(`Order confirmation failed: ${JSON.stringify(confirmRes.data.error || confirmRes.data)}`);
      
      
    } catch (err) {
      console.error('Full error:', err);
      return { success: false, error: err.message };
    }
  }
}

export default  createOrder;
