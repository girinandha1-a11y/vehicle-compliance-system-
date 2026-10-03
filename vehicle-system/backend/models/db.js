// db.js - Minimal in-memory database (no native modules required)
// This allows the project to run without C++ build tools
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let store = {
  users: [],
  vehicles: [],
  fines: [],
  cases: [],
  compliance: [],
  notifications: [],
  audit_logs: [],
  prediction_history: [],
  reminder_history: [],
  reminder_settings: [],
  conversations: [],
  documents: [],
  payments: [],
  scan_history: [],
  demo_vehicle_data: []
};

const dbPath = process.env.DB_FILE || './database.json';

// Load from file if exists
function loadDb() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      store = JSON.parse(data);
      for (const [name, initialValue] of Object.entries({
        users: [], vehicles: [], fines: [], cases: [], compliance: [], notifications: [], audit_logs: [],
        prediction_history: [], reminder_history: [], reminder_settings: [], conversations: [],
        documents: [], payments: [], scan_history: [], demo_vehicle_data: []
      })) {
        if (!Array.isArray(store[name])) store[name] = initialValue;
      }
      console.log('Loaded database from file');
    }
  } catch (e) {
    console.log('Creating new database...');
  }
}

// Save to file
function saveDb() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

// Auto-save every 5 seconds
setInterval(saveDb, 5000);
process.on('exit', saveDb);

loadDb();

// Simple query engine
class SimpleDb {
  collection(name) {
    if (!Object.prototype.hasOwnProperty.call(store, name) || !Array.isArray(store[name])) {
      throw new Error(`Unknown database collection: ${name}`);
    }
    return store[name];
  }

  createRecord(name, fields) {
    const idFields = {
      prediction_history: 'prediction_id', reminder_history: 'reminder_id', conversations: 'conversation_id',
      documents: 'document_id', payments: 'payment_id', scan_history: 'scan_id'
    };
    const rows = this.collection(name);
    const idField = idFields[name];
    if (!idField) throw new Error(`Collection does not support generated IDs: ${name}`);
    const nextId = rows.reduce((max, row) => Math.max(max, Number(row[idField]) || 0), 0) + 1;
    const record = { [idField]: nextId, created_at: new Date().toISOString(), ...fields };
    rows.push(record);
    saveDb();
    return record;
  }

  save() {
    saveDb();
  }

  prepare(sql) {
    return {
      run: (...params) => {
        try {
          // Handle INSERT
          if (sql.includes('INSERT INTO users')) {
            const [name, email, password, role] = params;
            const id = store.users.length + 1;
            store.users.push({ user_id: id, name, email, password, role, created_at: new Date().toISOString() });
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('INSERT INTO vehicles')) {
            const [registration_number, owner_name, vehicle_type, registration_date] = params;
            const id = store.vehicles.length + 1;
            store.vehicles.push({ vehicle_id: id, registration_number, owner_name, vehicle_type, registration_date, created_at: new Date().toISOString() });
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('INSERT INTO fines')) {
            const [vehicle_id, violation_type, amount, status, issued_date] = params;
            const id = store.fines.length + 1;
            store.fines.push({ fine_id: id, vehicle_id, violation_type, amount, status, issued_date });
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('INSERT INTO cases')) {
            const [vehicle_id, case_type, description, hearing_date, status] = params;
            const id = store.cases.length + 1;
            store.cases.push({ case_id: id, vehicle_id, case_type, description, hearing_date, status });
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('INSERT INTO compliance')) {
            const [vehicle_id, insurance_expiry, pollution_expiry, tax_status, fitness_expiry, tax_expiry] = params;
            const id = store.compliance.length + 1;
            store.compliance.push({ compliance_id: id, vehicle_id, insurance_expiry, pollution_expiry, tax_status, fitness_expiry, tax_expiry });
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('INSERT INTO notifications')) {
            const [user_id, message, status] = params;
            const id = store.notifications.length + 1;
            store.notifications.push({ notification_id: id, user_id, message, status, created_at: new Date().toISOString() });
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('INSERT INTO audit_logs')) {
            const [user_id, action, details] = params;
            const id = store.audit_logs.length + 1;
            store.audit_logs.push({ log_id: id, user_id, action, details, created_at: new Date().toISOString() });
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('UPDATE users SET reset_token = ?')) {
            const user = store.users.find((row) => String(row.user_id) === String(params[2]));
            if (user) { user.reset_token = params[0]; user.reset_token_expiry = params[1]; }
            saveDb();
            return { changes: user ? 1 : 0 };
          }
          if (sql.includes('UPDATE users SET password = ?')) {
            const user = store.users.find((row) => String(row.user_id) === String(params[1]));
            if (user) { user.password = params[0]; user.reset_token = null; user.reset_token_expiry = null; }
            saveDb();
            return { changes: user ? 1 : 0 };
          }
          if (sql.includes('UPDATE users SET name = ?')) {
            const user = store.users.find((row) => String(row.user_id) === String(params[1]));
            if (user) user.name = params[0];
            saveDb();
            return { changes: user ? 1 : 0 };
          }
          if (sql.includes('UPDATE fines SET status =')) {
            const fine = store.fines.find((row) => String(row.fine_id) === String(params[0]));
            if (fine) fine.status = sql.includes("status = 'Paid'") ? 'Paid' : params[0];
            saveDb();
            return { changes: fine ? 1 : 0 };
          }
          if (sql.includes('UPDATE cases SET status =')) {
            const item = store.cases.find((row) => String(row.case_id) === String(params[0]));
            if (item) item.status = sql.includes("status = 'Closed'") ? 'Closed' : params[0];
            saveDb();
            return { changes: item ? 1 : 0 };
          }
          if (sql.includes('UPDATE compliance SET insurance_expiry')) {
            const item = store.compliance.find((row) => String(row.vehicle_id) === String(params[5]));
            if (item) Object.assign(item, { insurance_expiry: params[0], pollution_expiry: params[1], tax_status: params[2], fitness_expiry: params[3], tax_expiry: params[4] });
            saveDb();
            return { changes: item ? 1 : 0 };
          }
          if (sql.includes('UPDATE notifications SET status')) {
            const item = store.notifications.find((row) => String(row.notification_id) === String(params[0]) && String(row.user_id) === String(params[1]));
            if (item) item.status = 'Read';
            saveDb();
            return { changes: item ? 1 : 0 };
          }
          // Handle DELETE
          if (sql.includes('DELETE FROM notifications') && sql.includes('DELETE FROM audit_logs')) {
            store.notifications = [];
            store.audit_logs = [];
            store.prediction_history = [];
            store.reminder_history = [];
            store.reminder_settings = [];
            store.conversations = [];
            store.documents = [];
            store.payments = [];
            store.scan_history = [];
            store.compliance = [];
            store.cases = [];
            store.fines = [];
            store.vehicles = [];
            store.users = [];
            return { changes: 0 };
          }
          return { lastInsertRowid: 0, changes: 0 };
        } catch (e) {
          console.error('DB Error in run():', e.message);
          return { lastInsertRowid: 0, changes: 0 };
        }
      },
      get: (...params) => {
        try {
          const sqlLower = sql.toLowerCase();
          // Handle COUNT queries
          if (sqlLower.includes('select count(*)') && sqlLower.includes('from vehicles')) {
            return { c: store.vehicles.length };
          }
          if (sqlLower.includes('select count(*)') && sqlLower.includes('from fines')) {
            return { c: store.fines.length };
          }
          if (sqlLower.includes('select count(*)') && sqlLower.includes('from cases')) {
            if (sqlLower.includes("where status = 'active'")) {
              return { c: store.cases.filter(x => x.status === 'Active').length };
            }
            return { c: store.cases.length };
          }
          if (sqlLower.includes('select count(*)') && sqlLower.includes('from users')) {
            return { c: store.users.length };
          }
          // Handle SUM queries
          if (sqlLower.includes('sum(amount)') && sqlLower.includes('from fines')) {
            if (sqlLower.includes("status = 'pending'")) {
              const sum = store.fines
                .filter(f => f.status === 'Pending')
                .reduce((acc, f) => acc + f.amount, 0);
              return { s: sum };
            }
            const sum = store.fines.reduce((acc, f) => acc + f.amount, 0);
            return { s: sum };
          }
          // SELECT by email or registration_number
          if (sqlLower.includes('from users') && sqlLower.includes('where email')) {
            return store.users.find(u => u.email === params[0]);
          }
          if (sqlLower.includes('from vehicles') && sqlLower.includes('where registration_number')) {
            return store.vehicles.find(v => v.registration_number === params[0]);
          }
          if (sqlLower.includes('from users') && sqlLower.includes('where user_id')) {
            return store.users.find(u => String(u.user_id) === String(params[0]));
          }
          if (sqlLower.includes('from vehicles') && sqlLower.includes('where vehicle_id')) {
            return store.vehicles.find(v => String(v.vehicle_id) === String(params[0]));
          }
          if (sqlLower.includes('from fines') && sqlLower.includes('where fine_id')) {
            return store.fines.find((f) => String(f.fine_id) === String(params[0]));
          }
          if (sqlLower.includes('from compliance') && sqlLower.includes('where vehicle_id')) {
            return store.compliance.find(c => String(c.vehicle_id) === String(params[0]));
          }
          return undefined;
        } catch (e) {
          console.error('DB Error in get():', e.message, 'SQL:', sql);
          return undefined;
        }
      },
      all: (...params) => {
        try {
          const sqlLower = sql.toLowerCase();
          // Handle GROUP BY queries for analytics
          if (sqlLower.includes('group by violation_type')) {
            const grouped = {};
            for (const f of store.fines) {
              if (!grouped[f.violation_type]) grouped[f.violation_type] = 0;
              grouped[f.violation_type]++;
            }
            return Object.entries(grouped).map(([violation_type, count]) => ({ violation_type, count }));
          }
          if (sqlLower.includes('group by vehicle_type')) {
            const grouped = {};
            for (const v of store.vehicles) {
              if (!grouped[v.vehicle_type]) grouped[v.vehicle_type] = 0;
              grouped[v.vehicle_type]++;
            }
            return Object.entries(grouped).map(([vehicle_type, count]) => ({ vehicle_type, count }));
          }
          // Handle time series (group by month)
          if ((sqlLower.includes("strftime('%y-%m'") || sqlLower.includes("strftime('%y-%m'")) && sqlLower.includes('group by month')) {
            const grouped = {};
            for (const f of store.fines) {
              if (!f.issued_date) continue;
              const date = new Date(f.issued_date);
              const month = date.toISOString().substring(0, 7); // YYYY-MM format
              if (!grouped[month]) grouped[month] = { month, count: 0, total: 0 };
              grouped[month].count++;
              grouped[month].total += f.amount;
            }
            return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
          }
          // SELECT all
          if (sqlLower.includes('from users')) {
            return store.users;
          }
          if (sqlLower.includes('from vehicles')) {
            return store.vehicles;
          }
          if (sqlLower.includes('from fines')) {
            if (sqlLower.includes('where vehicle_id')) {
              return store.fines.filter(f => String(f.vehicle_id) === String(params[0]));
            }
            return store.fines;
          }
          if (sqlLower.includes('from cases')) {
            if (sqlLower.includes('where vehicle_id')) {
              return store.cases.filter(c => String(c.vehicle_id) === String(params[0]));
            }
            return store.cases;
          }
          if (sqlLower.includes('from compliance')) {
            if (sqlLower.includes('where vehicle_id')) {
              return store.compliance.filter(c => String(c.vehicle_id) === String(params[0]));
            }
            return store.compliance;
          }
          if (sqlLower.includes('from notifications')) {
            if (sqlLower.includes('where user_id')) {
              return store.notifications.filter(n => String(n.user_id) === String(params[0]));
            }
            return store.notifications;
          }
          if (sqlLower.includes('from audit_logs')) {
            return store.audit_logs;
          }
          return [];
        } catch (e) {
          console.error('DB Error in all():', e.message);
          return [];
        }
      }
    };
  }
  
  exec(sql) {
    // Just parse and ignore for table creation
    if (sql.includes('CREATE TABLE')) {
      return;
    }
  }
  
  pragma(pragma) {
    // Ignore pragma statements
  }
  
  transaction(fn) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (e) {
        throw e;
      }
    };
  }
}

module.exports = new SimpleDb();
