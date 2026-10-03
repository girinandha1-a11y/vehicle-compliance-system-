// Populates the database with demo/sample data only, per the academic-project
// requirement (no real government vehicle records are used or implied).
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models/db');

function run() {
  console.log('Seeding database with demo data...');

  db.exec(
    'DELETE FROM notifications; DELETE FROM audit_logs; DELETE FROM compliance; DELETE FROM cases; DELETE FROM fines; DELETE FROM vehicles; DELETE FROM users;'
  );
  db.collection('demo_vehicle_data').splice(0);
  db.save();

  const adminPass = bcrypt.hashSync('Admin@123', 10);
  const userPass = bcrypt.hashSync('User@123', 10);
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
    'Demo Admin', 'admin@demo.com', adminPass, 'admin'
  );
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
    'Demo User', 'user@demo.com', userPass, 'user'
  );

  const vehicles = [
    ['KA01AB1234', 'Ravi Kumar', 'Car', '2019-05-14'],
    ['TN09CD5678', 'Priya Raman', 'Motorcycle', '2021-02-20'],
    ['MH12EF4321', 'Aditya Shah', 'Car', '2018-11-02'],
    ['DL03GH8765', 'Sana Sheikh', 'SUV', '2020-07-09'],
    ['AP16IJ2468', 'Kiran Reddy', 'Truck', '2017-03-25'],
    ['KL07KL1357', 'Meera Nair', 'Car', '2022-01-15'],
  ];

  const insertVehicle = db.prepare(
    'INSERT INTO vehicles (registration_number, owner_name, vehicle_type, registration_date) VALUES (?, ?, ?, ?)'
  );
  const vehicleIds = vehicles.map((v) => insertVehicle.run(...v).lastInsertRowid);

  const insertFine = db.prepare(
    'INSERT INTO fines (vehicle_id, violation_type, amount, status, issued_date) VALUES (?, ?, ?, ?, ?)'
  );
  insertFine.run(vehicleIds[0], 'Overspeeding', 1500, 'Pending', '2026-06-10');
  insertFine.run(vehicleIds[0], 'Signal Jump', 1000, 'Paid', '2025-12-02');
  insertFine.run(vehicleIds[1], 'No Helmet', 500, 'Pending', '2026-07-01');
  insertFine.run(vehicleIds[2], 'Illegal Parking', 300, 'Paid', '2026-01-18');
  insertFine.run(vehicleIds[3], 'Overspeeding', 2000, 'Pending', '2026-08-05');
  insertFine.run(vehicleIds[4], 'No Insurance', 3000, 'Pending', '2026-04-22');

  const insertCase = db.prepare(
    'INSERT INTO cases (vehicle_id, case_type, description, hearing_date, status) VALUES (?, ?, ?, ?, ?)'
  );
  insertCase.run(vehicleIds[0], 'Traffic Violation', 'Repeated overspeeding violation', '2026-10-15', 'Active');
  insertCase.run(vehicleIds[3], 'Accident Dispute', 'Minor collision claim under review', '2026-09-30', 'Active');
  insertCase.run(vehicleIds[2], 'Parking Violation', 'Resolved with fine payment', '2026-02-10', 'Closed');

  const insertCompliance = db.prepare(
    `INSERT INTO compliance (vehicle_id, insurance_expiry, pollution_expiry, tax_status, fitness_expiry)
     VALUES (?, ?, ?, ?, ?)`
  );
  insertCompliance.run(vehicleIds[0], '2026-09-20', '2026-11-01', 'Paid', '2027-05-14');
  insertCompliance.run(vehicleIds[1], '2026-12-01', '2026-10-01', 'Paid', '2028-02-20');
  insertCompliance.run(vehicleIds[2], '2026-08-01', '2026-09-15', 'Unpaid', '2026-11-02');
  insertCompliance.run(vehicleIds[3], '2026-09-10', '2026-12-05', 'Paid', '2027-07-09');
  insertCompliance.run(vehicleIds[4], '2025-12-01', '2026-01-01', 'Unpaid', '2026-03-25');
  insertCompliance.run(vehicleIds[5], '2027-01-15', '2027-01-15', 'Paid', '2028-01-15');

  console.log('Seed complete.');
  console.log('Demo logins:');
  console.log('  Admin -> admin@demo.com / Admin@123');
  console.log('  User  -> user@demo.com / User@123');
}

run();
