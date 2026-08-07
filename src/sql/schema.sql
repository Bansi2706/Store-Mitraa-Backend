CREATE DATABASE IF NOT EXISTS store_mitraa;
USE store_mitraa;

-------------------------------------
-- Owners 
-------------------------------------
CREATE TABLE owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    whatsapp VARCHAR(15),
    address VARCHAR(255),
    logo VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    language VARCHAR(50) DEFAULT 'English (US)',
    timezone VARCHAR(100) DEFAULT '(GMT+05:30) India Standard Time',
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-------------------------------------
-- Products
-------------------------------------
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    product_description TEXT,
    product_category VARCHAR(100) NOT NULL,
    product_sku VARCHAR(100) UNIQUE,

    buying_price DECIMAL(10,2) NOT NULL,
    product_mrp DECIMAL(10,2) NOT NULL,

    stock_quantity INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    product_unit VARCHAR(50) DEFAULT 'pcs',

    product_image VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES owners(id)
);

-------------------------------------
-- Products images
-------------------------------------
CREATE TABLE product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,

    product_id INT NOT NULL,

    image_url VARCHAR(255) NOT NULL,

    is_main BOOLEAN DEFAULT FALSE,

    display_order INT DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

-------------------------------------
-- Vendors
-------------------------------------
CREATE TABLE vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,

    owner_id INT NOT NULL,

    vendor_company_name VARCHAR(150) NOT NULL,
    display_name VARCHAR(150),

    payment_terms VARCHAR(50) DEFAULT 'Net 15',
    gst_vat_number VARCHAR(30) UNIQUE,

    default_reminder_days INT DEFAULT 7,

    status ENUM('Active','Inactive') DEFAULT 'Active',

    contact_person VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(15),
    alternate_phone VARCHAR(15),

    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),

    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',

    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
);


-------------------------------------
-- Vendor-Bills
-------------------------------------
CREATE TABLE vendor_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,

    owner_id INT NOT NULL,
    vendor_id INT NOT NULL,

    bill_number VARCHAR(100) NOT NULL UNIQUE,
    bill_date DATE NOT NULL,

    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    remaining_amount DECIMAL(10,2) NOT NULL,

    due_date DATE,

    reminder_days ENUM(
    '3 Days',
    '5 Days',
    '7 Days',
    '15 Days',
    '30 Days'
    ) DEFAULT '5 Days',

    payment_mode ENUM(
    'Not Specified',
    'Cash',
    'UPI',
    'Bank Transfer',
    'Card',
    'Cheque',
    'Other'
    ) DEFAULT 'Not Specified',

    payment_reference VARCHAR(150),

    status ENUM(
        'Draft',
        'Pending',
        'Partial',
        'Paid',
        'Cancelled'
    ) DEFAULT 'Draft',

    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);


-------------------------------------
-- vendor_bill_payments
-------------------------------------
CREATE TABLE vendor_bill_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    vendor_bill_id INT NOT NULL,

    amount DECIMAL(10,2) NOT NULL,

    payment_date DATE NOT NULL,

    payment_mode ENUM(
        'Cash',
        'UPI',
        'Bank Transfer',
        'Cheque',
        'Card',
        'Other'
    ) NOT NULL,

    payment_reference VARCHAR(150),

    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_bill_id)
    REFERENCES vendor_bills(id)
    ON DELETE CASCADE
);


-------------------------------------
-- Customers
-------------------------------------
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,

    owner_id INT NOT NULL,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),

    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(150),

    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),

    gst_number VARCHAR(30),

    address TEXT,

    status ENUM('VIP','ACTIVE','INACTIVE') DEFAULT 'ACTIVE',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
);

-------------------------------------
-- Invoice 
-------------------------------------
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,

    owner_id INT NOT NULL,
    customer_id INT NOT NULL,

    invoice_number VARCHAR(100) NOT NULL UNIQUE,

    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    remaining_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    payment_mode ENUM(
        'Cash',
        'UPI',
        'Card',
        'Bank Transfer',
        'Other'
    ) NOT NULL DEFAULT 'Cash',

    payment_status ENUM(
        'Pending',
        'Partial',
        'Paid'
    ) NOT NULL DEFAULT 'Pending',

    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_invoice_owner
        FOREIGN KEY (owner_id)
        REFERENCES owners(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_invoice_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE
);

-------------------------------------
-- Invoice_items
-------------------------------------
CREATE TABLE invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,

    invoice_id INT NOT NULL,
    product_id INT NOT NULL,

    product_name VARCHAR(150) NOT NULL,
    product_sku VARCHAR(100),

    quantity INT NOT NULL DEFAULT 1,

    buying_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    line_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_invoice_items_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_invoice_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

-------------------------------------
-- Expenses
-------------------------------------
CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,

    owner_id INT NOT NULL,

    title VARCHAR(255) NOT NULL,

    category ENUM(
        'Rent',
        'Electricity',
        'Water',
        'Maintenance',
        'Salaries',
        'Internet',
        'Utilities',
        'Supplies',
        'Transport',
        'Repairs',
        'Marketing',
        'Miscellaneous'
    ) NOT NULL,

    amount DECIMAL(12,2) NOT NULL,

    payment_mode ENUM(
        'Cash',
        'UPI',
        'Card',
        'Bank Transfer',
        'Cheque',
        'Auto Debit',
        'Other'
    ) NOT NULL,

    expense_date DATE NOT NULL,

    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_expense_owner
        FOREIGN KEY (owner_id)
        REFERENCES owners(id)
        ON DELETE CASCADE
);
