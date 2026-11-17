-- QueueBee Database Schema (Canteen & Laundry Prototype)
-- PostgreSQL

CREATE TABLE IF NOT EXISTS hostel (
    hostel_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hostel_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS student (
    student_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    hostel_id INTEGER NOT NULL,
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id)
);

CREATE TABLE IF NOT EXISTS service_point (
    service_point_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(20) NOT NULL
        CHECK (service_type IN ('CANTEEN', 'LAUNDRY')),
    location VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS menu_item (
    item_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_point_id INTEGER NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_price NUMERIC(10, 2) NOT NULL CHECK (item_price >= 0),
    FOREIGN KEY (service_point_id)
        REFERENCES service_point(service_point_id)
);

CREATE TABLE IF NOT EXISTS food_order (
    order_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,
    service_point_id INTEGER NOT NULL,
    token_number INTEGER NOT NULL CHECK (token_number > 0),
    order_status VARCHAR(20) NOT NULL DEFAULT 'PLACED'
        CHECK (order_status IN ('PLACED', 'PREPARING', 'READY', 'COLLECTED')),
    FOREIGN KEY (student_id) REFERENCES student(student_id),
    FOREIGN KEY (service_point_id)
        REFERENCES service_point(service_point_id),
    UNIQUE (service_point_id, token_number)
);

CREATE TABLE IF NOT EXISTS order_item (
    order_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, item_id),
    FOREIGN KEY (order_id) REFERENCES food_order(order_id),
    FOREIGN KEY (item_id) REFERENCES menu_item(item_id)
);

CREATE TABLE IF NOT EXISTS laundry_request (
    laundry_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,
    service_point_id INTEGER NOT NULL,
    laundry_status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED'
        CHECK (laundry_status IN ('RECEIVED', 'PROCESSING', 'READY', 'COLLECTED')),
    FOREIGN KEY (student_id) REFERENCES student(student_id),
    FOREIGN KEY (service_point_id)
        REFERENCES service_point(service_point_id)
);

CREATE TABLE IF NOT EXISTS status_history (
    history_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER,
    laundry_id INTEGER,
    status VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES food_order(order_id),
    FOREIGN KEY (laundry_id) REFERENCES laundry_request(laundry_id),
    CHECK (
        (order_id IS NOT NULL AND laundry_id IS NULL)
        OR
        (order_id IS NULL AND laundry_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS notification (
    notification_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
);
