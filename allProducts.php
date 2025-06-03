<?php
class ControllerApiAllproducts extends Controller {
    
    public function getReturnStatus() {
        $this->load->language('sale/return');
        $this->load->model('sale/return');
    
        $json = array();
    
        if ($this->request->server['REQUEST_METHOD'] == 'POST') {
            if (!empty($this->request->post['return_id'])) {
                $return_id = (int)$this->request->post['return_id'];
    
                $return_info = $this->model_sale_return->getReturn($return_id);
    
                if ($return_info) {
                    // Load Return Status Name
                    $this->load->model('localisation/return_status');
                    $status_info = $this->model_localisation_return_status->getReturnStatus($return_info['return_status_id']);
                    
                    // Load Return Action Name
                    $this->load->model('localisation/return_action');
                    $action_info = $this->model_localisation_return_action->getReturnAction($return_info['return_action_id']);
    
                    $json['success'] = 'Return found';
                    $json['return_id'] = $return_id;
                    $json['return_status'] = $status_info ? $status_info['name'] : null;
                    $json['return_action'] = $action_info ? $action_info['name'] : null;
                } else {
                    $json['error'] = 'Return not found!';
                }
            } else {
                $json['error'] = 'Return ID is required!';
            }
        } else {
            $json['error'] = 'Invalid request method!';
        }
    
        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }

    public function checkIssueId() {
        $this->load->language('sale/return');
        $this->load->model('sale/return');
    
        $json = array();
    
        if ($this->request->server['REQUEST_METHOD'] == 'POST') {
            if (!empty($this->request->post['return_id'])) {
                $return_id = (int)$this->request->post['return_id'];
    
                $return_info = $this->model_sale_return->getReturn($return_id);
    
                if ($return_info) {
                    $json['success'] = 'Return found';
                    $json['return_id'] = $return_id;
                } else {
                    $json['error'] = 'Return not found!';
                }
            } else {
                $json['error'] = 'Return ID is required!';
            }
        } else {
            $json['error'] = 'Invalid request method!';
        }
    
        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }
    
    
    
//CHECK IF ORDER ID EXISTS
    public function checkOrderId() {
        $this->load->language('sale/order'); // Load the language file for error messages
        $this->load->model('sale/order');    // Load the order model to access order data
        $this->load->model('customer/customer_group');
        $this->load->model('tool/upload');
        $this->load->model('customer/customer');
        $this->load->model('localisation/order_status');
        $this->load->model('customer/custom_field');


        
        $json = array();
        
        // Ensure request method is POST
        if ($this->request->server['REQUEST_METHOD'] == 'POST') {
            // Log the raw body content for debugging
            error_log(print_r(file_get_contents('php://input'), true)); 
    
            // Validate that order_id is provided in the POST request
            if (empty($this->request->post['order_id'])) {
                $json['error'] = $this->language->get('error_order_id');
            }
            
            // If order_id is provided, check if the order exists
            if (!$json) {
                $order_id = $this->request->post['order_id'];
                
                // Use the model to check if the order exists
                $order_info = $this->model_sale_order->getOrder($order_id);
                
                if ($order_info) {
                    // Order exists, return success response
                    $json['success'] = $this->language->get('text_order_found');
                    $json['order_id'] = $order_info['order_id'];
                    $json['customer_name'] = $order_info['firstname'] . ' ' . $order_info['lastname'];
                    // Add more order details if needed
                } else {
                    // Order doesn't exist, return error response
                    $json['error'] = $this->language->get('error_order_not_found');
                }
            }
        } else {
            $json['error'] = $this->language->get('error_invalid_request_method');
        }
        
        // Set the response header and output the JSON response
        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }
        
            // 🔥 ADD RETURN ENDPOINT 2
            public function addReturn() {
                $this->load->language('sale/return');
                $this->load->model('sale/return');
        
                $json = array();
                
                // Ensure request method is POST
                if ($this->request->server['REQUEST_METHOD'] == 'POST') {
                    error_log(print_r(file_get_contents('php://input'), true)); // Log the raw body content
                    // Validate required fields
                    if (empty($this->request->post['order_id'])) {
                        $this->error['order_id'] = $this->language->get('error_order_id');
                    }
        
                    if (empty($this->request->post['firstname'])) {
                        $this->error['firstname'] = $this->language->get('error_firstname');
                    }
        
                    if (empty($this->request->post['lastname'])) {
                        $this->error['lastname'] = $this->language->get('error_lastname');
                    }
        
                    if (empty($this->request->post['email'])) {
                        $this->error['email'] = $this->language->get('error_email');
                    }
        
                    if (empty($this->request->post['telephone'])) {
                        $this->error['telephone'] = $this->language->get('error_telephone');
                    }
        
                    // If any errors, send back the error messages
                    if ($this->error) {
                        $json['error'] = $this->error;
                    } else {
                        // Prepare data for adding the return
                        $data = array(
                            'order_id'      => $this->request->post['order_id'],
                            'firstname'     => $this->request->post['firstname'],
                            'lastname'      => $this->request->post['lastname'],
                            'email'         => $this->request->post['email'],
                            'telephone'     => $this->request->post['telephone'],
                            'product' => isset($this->request->post['product']) ? $this->request->post['product'] : '', // Optional field
                            'model' => isset($this->request->post['model']) ? $this->request->post['model'] : '', // Optional field
                            'return_reason' => isset($this->request->post['return_reason']) ? $this->request->post['return_reason'] : '', // Optional field
                            'comment'       => isset($this->request->post['comment']) ? $this->request->post['comment'] : '', // Optional field
                            'status'        => 'pending', // Default status for the return
                        );
        
                        // Call model method to add the return request
                        $return_id = $this->model_sale_return->addReturn($data);
        
                        if ($return_id) {
                            $json['success'] = $this->language->get('text_return_added');
                            $json['return_id'] = $return_id;
                        } else {
                            $json['error'] = $this->language->get('error_return_failed');
                        }
                    }
        
                } else {
                    $json['error'] = $this->language->get('error_invalid_request_method');
                }
        
                // Set the response header and output JSON
                $this->response->addHeader('Content-Type: application/json');
                $this->response->setOutput(json_encode($json));
            }
        

            
    // // All Products
    public function index(){
        $products = array();
        $this->load->language('catalog/product');
        $this->load->model('catalog/product');
        $this->load->model('tool/image');
    
        $error[]['no_json'] = "No JSON";  // It's better to return an empty array or a specific error code instead of just "No JSON" if there are no products.
    
        $product_total = $this->model_catalog_product->getTotalProducts();
    
        $results = $this->model_catalog_product->getProducts(); // This now includes categories
    
        foreach ($results as $result) {
            if (is_file(DIR_IMAGE . $result['image'])) {
                $image = $this->model_tool_image->resize($result['image'], 40, 40);
            } else {
                $image = $this->model_tool_image->resize('no_image.png', 40, 40);
            }
    
            $special = false;
    
            $product_specials = $this->model_catalog_product->getProductSpecials($result['product_id']);
    
            foreach ($product_specials as $product_special) {
                $special = $product_special['price'];
            }
    
            // Access the categories here:
            $categories = $result['categories']; // From the getProducts modification
    
    
            $shop_products['shop_products'][] = array(
                'product_id' => $result['product_id'],
                'image' => $image,
                'name' => $result['name'],
                'model' => $result['model'],
                'price' => $result['price'],
                'meta_description' => $result['meta_description'],
                'description' => $result['description'],
                'special' => $special,
                'quantity' => $result['quantity'],
                'status' => $result['status'],
                'date_added' => $result['date_added'],
                'date_modified' => $result['date_modified'],
                'categories' => $categories,  // Add categories to the JSON
            );
        }
    
        if (isset($this->request->get['json'])) {
            echo json_encode($shop_products);
            die;
        } else {
            // Return an empty array or a specific error code for non-JSON requests.  Don't just echo "No JSON".
            $this->response->setOutput(json_encode(array('error' => 'Invalid Request'))); // Example
        }
    }

    //Products odifies feom start_time to end_time
    public function modified() {
        $this->load->language('catalog/product');
        $this->load->model('catalog/product');
        $this->load->model('tool/image');
    
        $start_time = $this->request->get['start_time'];
        $end_time = $this->request->get['end_time'];
    
        if (!$start_time || !$end_time) {
            $this->response->setOutput(json_encode(array('error' => 'start_time and end_time are required')));
            return; // Important: Stop execution after setting the error
        }
    
        // Validate timestamps (important!)
        $start_time = strtotime($start_time);
        $end_time = strtotime($end_time);
    
        if ($start_time === false || $end_time === false || $start_time >= $end_time) {
            $this->response->setOutput(json_encode(array('error' => 'Invalid time range')));
            return;
        }
    
    
        $products = array();
        $results = $this->model_catalog_product->getModifiedProducts($start_time, $end_time); // New model function
    
        foreach ($results as $result) {
            if (is_file(DIR_IMAGE . $result['image'])) {
                $image = $this->model_tool_image->resize($result['image'], 40, 40);
            } else {
                $image = $this->model_tool_image->resize('no_image.png', 40, 40);
            }
    
            $special = false;
    
            $product_specials = $this->model_catalog_product->getProductSpecials($result['product_id']);
    
            foreach ($product_specials as $product_special) {
                $special = $product_special['price'];
            }
    
            $categories = $result['categories'];
    
            $products['shop_products'][] = array(
                'product_id' => $result['product_id'],
                'image' => $image,
                'name' => $result['name'],
                'model' => $result['model'],
                'price' => $result['price'],
                'special' => $special,
                'quantity' => $result['quantity'],
                'status' => $result['status'],
                'date_added' => $result['date_added'],
                'date_modified' => $result['date_modified'],
                'categories' => $categories,
            );
        }
    
        if (isset($this->request->get['json'])) {
            echo json_encode($products);
            die;
        } else {
            $this->response->setOutput(json_encode(array('error' => 'Invalid Request')));
        }
    }

    // Product info Page
    public function productInfo(){

        $this->load->language('catalog/product');
        $this->load->model('catalog/product');
        $this->load->model('tool/image');

        $product_details = array();
        $error['fail'] = 'Failed';

        if (isset($this->request->get['product_id'])) {
            //$product_details['product_id'] = $this->request->get['product_id'];
            $product_details = $this->model_catalog_product->getProduct($this->request->get['product_id']);
            echo json_encode($product_details);die;
        } else {
            $this->response->setOutput(json_encode($error));
        }
    }

    // Category Listing Page
    public function categories(){ 

        $shop_categories = array();
        $this->load->model('catalog/category');
        $error['fail'] = 'Failed';

        if (isset($this->request->get['json'])) {
            $shop_categories =$this->model_catalog_category->getCategories();
            echo json_encode($shop_categories);die;
        } else {
            $this->response->setOutput(json_encode($error));
        }
    }

    // Product Listing By Category
    public function categoryList(){ 

        $this->load->model('catalog/category');
        $this->load->model('catalog/product');
        $this->load->model('tool/image');
        $error['fail'] = 'Failed';

        if (isset($this->request->get['path'])) {
            $url = '';
            $path = '';
            $parts = explode('_', (string)$this->request->get['path']);

            $category_id = (int)array_pop($parts);

            foreach ($parts as $path_id) {
                if (!$path) {
                    $path = (int)$path_id;
                } else {
                    $path .= '_' . (int)$path_id;
                }

                $category_info = $this->model_catalog_category->getCategory($path_id);
            }
        } else {
            $category_id = 0;
        }

        $category_info = $this->model_catalog_category->getCategory($category_id);

        if ($category_info) {

            $url = '';
            //$data['categories'] = array();
            $results = $this->model_catalog_category->getCategories($category_id);

            foreach ($results as $result) {
                $filter_data = array(
                    'filter_category_id'  => $result['category_id'],
                    'filter_sub_category' => true
                );

            }

            $products = array();

            $filter_data = array(
                'filter_category_id' => $category_id
            );

            $product_total = $this->model_catalog_product->getTotalProducts($filter_data);
            $products = $this->model_catalog_product->getProducts($filter_data);
            echo json_encode($products); die;

        } else {
            $this->response->setOutput(json_encode($error));
        }

    }

    // All Manufacturers Listing
    public function manufactureList() {

        $this->load->model('catalog/manufacturer');
        $this->load->model('tool/image');
        $error['fail'] = 'Failed';

        $manufactureList = array();

        if (isset($this->request->get['json'])) {
            $manufactureList = $this->model_catalog_manufacturer->getManufacturers();
            echo json_encode($manufactureList);die;
        } else {
            $this->response->setOutput(json_encode($error));
        }
    }

    // Manufactur info Page
    public function manufactureInfo() {

        $this->load->model('catalog/manufacturer');
        $this->load->model('catalog/product');
        $this->load->model('tool/image');
        $error['fail'] = 'Failed';

        if (isset($this->request->get['manufacturer_id'])) {
            $manufactureInfo = $this->model_catalog_manufacturer->getManufacturer($manufacturer_id);
            echo json_encode($product_details);die;
        } else {
            $this->response->setOutput(json_encode($error));
        }
    }


    // Category Listing Page
    public function specialProduct(){ 

        $specialProduct = array();
        $this->load->model('catalog/product');
        $this->load->model('tool/image');
        $error['fail'] = 'Failed';

        if (isset($this->request->get['json'])) {
            $specialProduct = $this->model_catalog_product->getProductSpecials();
            echo json_encode($specialProduct);die;
        } else {
            $this->response->setOutput(json_encode($error));
        }
    }

    // Contact Information
    public function contact() {
        $this->load->language('information/contact'); // Load the language file
        $this->load->model('tool/image'); // Load the image model

        $contact_data = array();

        // Store Information (from config)
        $contact_data['store'] = $this->config->get('config_name');
        $contact_data['address'] = nl2br($this->config->get('config_address'));
        $contact_data['geocode'] = $this->config->get('config_geocode');
        $contact_data['geocode_hl'] = $this->config->get('config_language');
        $contact_data['telephone'] = $this->config->get('config_telephone');
        $contact_data['fax'] = $this->config->get('config_fax');
        $contact_data['open'] = nl2br($this->config->get('config_open'));
        $contact_data['comment'] = $this->config->get('config_comment');

        if ($this->config->get('config_image')) {
            $contact_data['image'] = $this->model_tool_image->resize($this->config->get('config_image'), $this->config->get('theme_' . $this->config->get('config_theme') . '_image_location_width'), $this->config->get('theme_' . $this->config->get('config_theme') . '_image_location_height'));
        } else {
            $contact_data['image'] = false;
        }


        // Location Information (if multiple locations are configured)
        $contact_data['locations'] = array();
        $this->load->model('localisation/location');
        foreach ((array)$this->config->get('config_location') as $location_id) {
            $location_info = $this->model_localisation_location->getLocation($location_id);

            if ($location_info) {
                if ($location_info['image']) {
                    $image = $this->model_tool_image->resize($location_info['image'], $this->config->get('theme_' . $this->config->get('config_theme') . '_image_location_width'), $this->config->get('theme_' . $this->config->get('config_theme') . '_image_location_height'));
                } else {
                    $image = false;
                }

                $contact_data['locations'][] = array(
                    'location_id' => $location_info['location_id'],
                    'name' => $location_info['name'],
                    'address' => nl2br($location_info['address']),
                    'geocode' => $location_info['geocode'],
                    'telephone' => $location_info['telephone'],
                    'fax' => $location_info['fax'],
                    'image' => $image,
                    'open' => nl2br($location_info['open']),
                    'comment' => $location_info['comment']
                );
            }
        }



        if ($contact_data) {
            echo json_encode($contact_data);
            die;
        } else {
            $error['error'] = 'Contact information not found';
            echo json_encode($error);
            $this->response->setOutput(json_encode($error));
        }
    }

    //search products by keyword
    public function search() {
        $this->load->model('catalog/product');
        $this->load->model('tool/image');

        $json = array(); // Initialize an empty array for the JSON response

        if (isset($this->request->post['search'])) { // Get search term from POST body
            $search = $this->request->post['search'];

            $filter_data = array(
                'filter_name' => $search,
                'filter_tag' => $search,
                'filter_description' => $search, // Optional: Search in descriptions
                'start' => 0, // You can add pagination if needed
                'limit' => 1000 // Limit the number of results (adjust as needed)
            );

            $results = $this->model_catalog_product->getProducts($filter_data);

            foreach ($results as $result) {
                if ($result['image']) {
                    $image = $this->model_tool_image->resize($result['image'], $this->config->get('theme_' . $this->config->get('config_theme') . '_image_product_width'), $this->config->get('theme_' . $this->config->get('config_theme') . '_image_product_height'));
                } else {
                    $image = $this->model_tool_image->resize('placeholder.png', $this->config->get('theme_' . $this->config->get('config_theme') . '_image_product_width'), $this->config->get('theme_' . $this->config->get('config_theme') . '_image_product_height'));
                }

                $special = false;
                $product_specials = $this->model_catalog_product->getProductSpecials($result['product_id']);
                foreach ($product_specials as $product_special) {
                    $special = $product_special['price'];
                }

                $json['products'][] = array(
                    'product_id' => $result['product_id'],
                    'name' => $result['name'],
                    'description' => utf8_substr(trim(strip_tags(html_entity_decode($result['description'], ENT_QUOTES, 'UTF-8'))), 0, $this->config->get('theme_' . $this->config->get('config_theme') . '_product_description_length')) . '..',
                    'thumb' => $image,
                    'price' => $this->currency->format($this->tax->calculate($result['price'], $result['tax_class_id'], $this->config->get('config_tax')), $this->session->data['currency']),
                    'special' => $special,
                    'href' => $this->url->link('product/product', 'product_id=' . $result['product_id']) // Added product link
                );
            }


        } else {
            $json['error'] = "Search keyword is missing in the payload.";
        }

        $this->response->addHeader('Content-Type: application/json'); // Important: Set the content type header
        $this->response->setOutput(json_encode($json));
    }

    public function ordersList() {
        $this->load->model('sale/order');
        $this->load->model('customer/customer');
        $this->load->model('localisation/order_status');
        $this->load->model('customer/custom_field');
        $this->load->model('tool/upload');
        $this->load->model('setting/extension');
        $this->load->model('user/api');
        $this->load->language('sale/order');
        $this->load->language('customer/customer');
        $this->load->language('localisation/order_status');
        $this->load->language('customer/custom_field');
        $this->load->language('tool/upload');
        $this->load->language('setting/extension');
        $this->load->language('user/api');

        $orders = $this->model_sale_order->getOrders(); // Fetch all orders, you can add filters here

        $order_data = array();

        foreach ($orders as $order) {
            $order_info = $this->model_sale_order->getOrder($order['order_id']);

            if ($order_info) {
                $products = $this->model_sale_order->getOrderProducts($order['order_id']);
                $product_data = array();

                foreach ($products as $product) {
                    $option_data = array();
                    $options = $this->model_sale_order->getOrderOptions($order['order_id'], $product['order_product_id']);

                    foreach ($options as $option) {
                        if ($option['type'] != 'file') {
                            $option_data[] = array(
                                'name' => $option['name'],
                                'value' => $option['value'],
                                'type' => $option['type']
                            );
                        } else {
                            $upload_info = $this->model_tool_upload->getUploadByCode($option['value']);

                            if ($upload_info) {
                                $option_data[] = array(
                                    'name' => $option['name'],
                                    'value' => $upload_info['name'],
                                    'type' => $option['type'],
                                    'href' => $this->url->link('tool/upload/download', 'user_token=' . $this->session->data['user_token'] . '&code=' . $upload_info['code'], true)
                                );
                            }
                        }
                    }

                    $product_data[] = array(
                        'order_product_id' => $product['order_product_id'],
                        'product_id' => $product['product_id'],
                        'name' => $product['name'],
                        'model' => $product['model'],
                        'option' => $option_data,
                        'quantity' => $product['quantity'],
                        'price' => $this->currency->format($product['price'] + ($this->config->get('config_tax') ? $product['tax'] : 0), $order_info['currency_code'], $order_info['currency_value']),
                        'total' => $this->currency->format($product['total'] + ($this->config->get('config_tax') ? ($product['tax'] * $product['quantity']) : 0), $order_info['currency_code'], $order_info['currency_value']),
                        'href' => $this->url->link('catalog/product/edit', 'user_token=' . $this->session->data['user_token'] . '&product_id=' . $product['product_id'], true)
                    );
                }

                $vouchers = $this->model_sale_order->getOrderVouchers($order['order_id']);
                $voucher_data = array();

                foreach ($vouchers as $voucher) {
                    $voucher_data[] = array(
                        'description' => $voucher['description'],
                        'amount' => $this->currency->format($voucher['amount'], $order_info['currency_code'], $order_info['currency_value']),
                        'href' => $this->url->link('sale/voucher/edit', 'user_token=' . $this->session->data['user_token'] . '&voucher_id=' . $voucher['voucher_id'], true)
                    );
                }

                $totals = $this->model_sale_order->getOrderTotals($order['order_id']);
                $total_data = array();

                foreach ($totals as $total) {
                    $total_data[] = array(
                        'title' => $total['title'],
                        'text' => $this->currency->format($total['value'], $order_info['currency_code'], $order_info['currency_value'])
                    );
                }

                $order_status_info = $this->model_localisation_order_status->getOrderStatus($order_info['order_status_id']);

                $order_data[] = array(
                    'order_id' => $order_info['order_id'],
                    'invoice_no' => $order_info['invoice_prefix'] . $order_info['invoice_no'],
                    'date_added' => date($this->language->get('date_format_short'), strtotime($order_info['date_added'])),
                    'firstname' => $order_info['firstname'],
                    'lastname' => $order_info['lastname'],
                    'email' => $order_info['email'],
                    'telephone' => $order_info['telephone'],
                    'shipping_method' => $order_info['shipping_method'],
                    'payment_method' => $order_info['payment_method'],
                    'payment_firstname' => $order_info['payment_firstname'],
                    'payment_lastname' => $order_info['payment_lastname'],
                    'payment_address' => str_replace(array("\r\n", "\r", "\n"), '<br />', preg_replace(array("/\s\s+/", "/\r\r+/", "/\n\n+/"), '<br />', trim(str_replace(array('{firstname}', '{lastname}', '{company}', '{address_1}', '{address_2}', '{city}', '{postcode}', '{zone}', '{zone_code}', '{country}'), array('firstname' => $order_info['payment_firstname'], 'lastname' => $order_info['payment_lastname'], 'company' => $order_info['payment_company'], 'address_1' => $order_info['payment_address_1'], 'address_2' => $order_info['payment_address_2'], 'city' => $order_info['payment_city'], 'postcode' => $order_info['payment_postcode'], 'zone' => $order_info['payment_zone'], 'zone_code' => $order_info['payment_zone_code'], 'country' => $order_info['payment_country']), $order_info['payment_address_format'] ? $order_info['payment_address_format'] : '{firstname} {lastname}' . "\n" . '{company}' . "\n" . '{address_1}' . "\n" . '{address_2}' . "\n" . '{city} {postcode}' . "\n" . '{zone}' . "\n" . '{country}')))),
                    'shipping_firstname' => $order_info['shipping_firstname'],
                    'shipping_lastname' => $order_info['shipping_lastname'],
                    'shipping_address' => str_replace(array("\r\n", "\r", "\n"), '<br />', preg_replace(array("/\s\s+/", "/\r\r+/", "/\n\n+/"), '<br />', trim(str_replace(array('{firstname}', '{lastname}', '{company}', '{address_1}', '{address_2}', '{city}', '{postcode}', '{zone}', '{zone_code}', '{country}'), array('firstname' => $order_info['shipping_firstname'], 'lastname' => $order_info['shipping_lastname'], 'company' => $order_info['shipping_company'], 'address_1' => $order_info['shipping_address_1'], 'address_2' => $order_info['shipping_address_2'], 'city' => $order_info['shipping_city'], 'postcode' => $order_info['shipping_postcode'], 'zone' => $order_info['shipping_zone'], 'zone_code' => $order_info['shipping_zone_code'], 'country' => $order_info['shipping_country']), $order_info['shipping_address_format'] ? $order_info['shipping_address_format'] : '{firstname} {lastname}' . "\n" . '{company}' . "\n" . '{address_1}' . "\n" . '{address_2}' . "\n" . '{city} {postcode}' . "\n" . '{zone}' . "\n" . '{country}')))),
                    'products' => $product_data,
                    'vouchers' => $voucher_data,
                    'totals' => $total_data,
                    'comment' => nl2br($order_info['comment']),
                    'reward' => $order_info['reward'],
                    'affiliate_firstname' => $order_info['affiliate_firstname'],
                    'affiliate_lastname' => $order_info['affiliate_lastname'],
                    'commission' => $this->currency->format($order_info['commission'], $order_info['currency_code'], $order_info['currency_value']),
                    'order_status' => $order_status_info ? $order_status_info['name'] : '',
                    'order_status_id' => $order_info['order_status_id'],
                    'account_custom_field' => $order_info['custom_field'],
                    'payment_custom_field' => $order_info['payment_custom_field'],
                    'shipping_custom_field' => $order_info['shipping_custom_field'],
                    'ip' => $order_info['ip'],
                    'forwarded_ip' => $order_info['forwarded_ip'],
                    'user_agent' => $order_info['user_agent'],
                    'accept_language' => $order_info['accept_language']
                );
            }
        }

        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($order_data));
    }

}