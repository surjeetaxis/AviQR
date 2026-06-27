-- AviQR — PostgreSQL Database Initialization
-- Creates separate databases per microservice

CREATE DATABASE aviqr_auth;
CREATE DATABASE aviqr_shop;
CREATE DATABASE aviqr_menu;
CREATE DATABASE aviqr_order;
CREATE DATABASE aviqr_payment;
CREATE DATABASE aviqr_qr;
CREATE DATABASE aviqr_hotel;
CREATE DATABASE aviqr_mall;
CREATE DATABASE aviqr_support;
CREATE DATABASE aviqr_review;

-- Grant all privileges to aviqr user
GRANT ALL PRIVILEGES ON DATABASE aviqr_auth     TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_shop     TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_menu     TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_order    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_payment  TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_qr       TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_hotel    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_mall     TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_support  TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_review   TO aviqr;
