-- ============================================================
-- AI-Powered Smart Vehicle Case, Fine & Compliance Management System
-- MySQL Database Schema
-- Academic project - demo/sample data only, no real government data.
-- ============================================================

CREATE DATABASE IF NOT EXISTS vehicle_compliance_system;
USE vehicle_compliance_system;

-- -----------------------------
-- Users
-- -----------------------------
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,        -- bcrypt hash
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  reset_token VARCHAR(255) DEFAULT NULL,
  reset_token_expiry BIGINT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------
-- Vehicles
-- -----------------------------
CREATE TABLE vehicles (
  vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
  registration_number VARCHAR(20) NOT NULL UNIQUE,
  owner_name VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  registration_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------
-- Fines
-- -----------------------------
CREATE TABLE fines (
  fine_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  violation_type VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('Pending', 'Paid') NOT NULL DEFAULT 'Pending',
  issued_date DATE NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);

-- -----------------------------
-- Cases
-- -----------------------------
CREATE TABLE cases (
  case_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  case_type VARCHAR(100) NOT NULL,
  description TEXT,
  hearing_date DATE,
  status ENUM('Active', 'Closed') NOT NULL DEFAULT 'Active',
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);

-- -----------------------------
-- Compliance
-- -----------------------------
CREATE TABLE compliance (
  compliance_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL UNIQUE,
  insurance_expiry DATE,
  pollution_expiry DATE,
  tax_status ENUM('Paid', 'Unpaid') DEFAULT 'Unpaid',
  fitness_expiry DATE,
  tax_expiry DATE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);

-- -----------------------------
-- Notifications
-- -----------------------------
CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message VARCHAR(500) NOT NULL,
  category ENUM('Success', 'Warning', 'Information', 'Critical') NOT NULL DEFAULT 'Information',
  status ENUM('Unread', 'Read') NOT NULL DEFAULT 'Unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- -----------------------------
-- Audit Logs (supports the "Audit Logs" additional feature)
-- -----------------------------
CREATE TABLE audit_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  details VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- -----------------------------
-- AI risk predictions and history
-- -----------------------------
CREATE TABLE prediction_history (
  prediction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  probability DECIMAL(5,2) NOT NULL,
  risk_level VARCHAR(30) NOT NULL,
  risk_score TINYINT UNSIGNED NOT NULL,
  factors_json JSON NOT NULL,
  model VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);

-- -----------------------------
-- Reminder preferences and delivery history
-- -----------------------------
CREATE TABLE reminder_settings (
  user_id INT PRIMARY KEY,
  offsets_json JSON NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE reminder_history (
  reminder_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  document VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL,
  days_before SMALLINT NOT NULL,
  message VARCHAR(500) NOT NULL,
  email_status VARCHAR(30) DEFAULT 'Not configured',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reminder_once (user_id, vehicle_id, document, expiry_date, days_before),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);

-- -----------------------------
-- Context-aware assistant history
-- -----------------------------
CREATE TABLE conversations (
  conversation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  messages_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- -----------------------------
-- Secure vehicle document metadata (file bytes live in private object storage)
-- -----------------------------
CREATE TABLE documents (
  document_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  document_type VARCHAR(80) NOT NULL,
  document_number VARCHAR(100),
  original_name VARCHAR(180) NOT NULL,
  storage_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  expiry_date DATE,
  extracted_text TEXT,
  ocr_mode VARCHAR(40),
  verification_status VARCHAR(30) NOT NULL DEFAULT 'Pending review',
  uploaded_by INT NOT NULL,
  verified_by INT,
  verified_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id),
  FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- -----------------------------
-- Payment provider ledger
-- -----------------------------
CREATE TABLE payments (
  payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fine_id INT NOT NULL,
  user_id INT NOT NULL,
  order_id VARCHAR(100) NOT NULL UNIQUE,
  provider_payment_id VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('Pending', 'Paid', 'Failed') NOT NULL DEFAULT 'Pending',
  failure_reason VARCHAR(500),
  verified_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fine_id) REFERENCES fines(fine_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- -----------------------------
-- Indexes for common lookups
-- -----------------------------
CREATE INDEX idx_fines_vehicle ON fines(vehicle_id);
CREATE INDEX idx_cases_vehicle ON cases(vehicle_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_vehicles_reg ON vehicles(registration_number);
CREATE INDEX idx_prediction_vehicle_date ON prediction_history(vehicle_id, created_at);
CREATE INDEX idx_reminder_user_date ON reminder_history(user_id, created_at);
CREATE INDEX idx_documents_vehicle ON documents(vehicle_id);
CREATE INDEX idx_payments_fine ON payments(fine_id, created_at);
