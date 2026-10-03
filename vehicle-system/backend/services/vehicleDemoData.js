const crypto = require('crypto');

const owners = ['Aarav Sharma', 'Diya Iyer', 'Arjun Nair', 'Ananya Reddy', 'Kabir Singh', 'Meera Patel', 'Vihaan Rao', 'Sana Khan', 'Ishaan Das', 'Kavya Menon', 'Rohan Verma', 'Priya Joshi'];
const manufacturers = [
  { name: 'Tata', models: ['Nexon', 'Punch', 'Altroz', 'Tiago'] },
  { name: 'Mahindra', models: ['XUV 3XO', 'Scorpio N', 'Thar', 'Bolero'] },
  { name: 'Hyundai', models: ['i20', 'Creta', 'Venue', 'Grand i10'] },
  { name: 'Maruti Suzuki', models: ['Swift', 'Baleno', 'Brezza', 'Wagon R'] },
  { name: 'Toyota', models: ['Glanza', 'Innova Crysta', 'Urban Cruiser', 'Etios'] },
  { name: 'Honda', models: ['City', 'Amaze', 'Activa', 'Shine'] },
  { name: 'Kia', models: ['Seltos', 'Sonet', 'Carens', 'Clavis'] },
  { name: 'Renault', models: ['Kwid', 'Triber', 'Kiger', 'Duster'] },
];
const types = ['Car', 'Motorcycle', 'SUV', 'Commercial Vehicle', 'Auto Rickshaw'];
const fuels = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const violations = [
  ['Over Speeding', 1500], ['Signal Jumping', 1000], ['No Helmet', 500], ['No Seat Belt', 1000],
  ['Wrong Parking', 500], ['Mobile Phone While Driving', 2000], ['Expired Insurance', 5000], ['Pollution Certificate Expired', 2000],
];
const locations = ['Anna Salai, Chennai', 'Outer Ring Road, Bengaluru', 'MG Road, Kochi', 'Banjara Hills, Hyderabad', 'Andheri West, Mumbai', 'Connaught Place, Delhi', 'Koregaon Park, Pune', 'Alkapuri, Vadodara'];
const caseTypes = ['Traffic Violation', 'Parking Dispute', 'Repeat Offence', 'Road Safety Review', 'Document Compliance'];
const caseStatuses = ['Active', 'Pending', 'Under Review', 'Closed'];
const regions = ['TN', 'KL', 'KA', 'AP', 'MH', 'DL', 'GJ', 'TS', 'UP', 'WB', 'RJ', 'HR', 'PB', 'OD', 'MP', 'BR', 'AS', 'GA', 'UK', 'HP', 'JH', 'CG', 'CH', 'JK', 'PY', 'AN', 'DD', 'DN', 'LD', 'LA'];

function normalizeVehicleNumber(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isValidVehicleNumber(value) {
  const normalized = normalizeVehicleNumber(value);
  if (/^\d{2}BH\d{4}[A-Z]{1,2}$/.test(normalized)) return true;
  return /^(?:[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}|[A-Z]{2}\d{2}[A-Z]{1,2}\d{4})$/.test(normalized) && regions.includes(normalized.slice(0, 2));
}

function createRandom(seedValue) {
  let state = crypto.createHash('sha256').update(seedValue).digest().readUInt32LE(0);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function makeDate(random, minDays, maxDays) {
  const offset = minDays + Math.floor(random() * (maxDays - minDays + 1));
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function statusForExpiry(expiry) {
  const today = new Date().toISOString().slice(0, 10);
  if (expiry < today) return 'Expired';
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 30);
  return expiry < limit.toISOString().slice(0, 10) ? 'Expiring Soon' : 'Valid';
}

function generateVehicleDemoData(vehicleNumber, existing = {}) {
  const registrationNumber = normalizeVehicleNumber(vehicleNumber);
  if (!isValidVehicleNumber(registrationNumber)) throw new Error('Please enter a valid vehicle registration number.');
  const existingVehicle = existing.vehicle || existing;
  const hasStoredVehicle = Boolean(existing.vehicle || existing.vehicle_id);
  const random = createRandom(registrationNumber);
  const choose = (items) => items[Math.floor(random() * items.length)];
  const manufacturer = choose(manufacturers);
  const vehicleType = choose(types);
  const model = choose(manufacturer.models);
  const registrationDate = makeDate(random, -3650, -120);
  const ownerName = choose(owners);

  const vehicle = {
    vehicle_id: existingVehicle.vehicle_id ?? `DEMO-${registrationNumber}`,
    registration_number: registrationNumber,
    owner_name: existingVehicle.owner_name || ownerName,
    manufacturer: existingVehicle.manufacturer || manufacturer.name,
    model: existingVehicle.model || model,
    vehicle_type: existingVehicle.vehicle_type || vehicleType,
    fuel_type: existingVehicle.fuel_type || choose(fuels),
    registration_date: existingVehicle.registration_date || registrationDate,
    registration_status: existingVehicle.registration_status || 'Active',
  };

  const generatedFines = Array.from({ length: Math.floor(random() * 7) }, (_, index) => {
    const [violation_type, amount] = choose(violations);
    const status = random() < 0.58 ? 'Pending' : 'Paid';
    return {
      fine_id: `${registrationNumber}-F${index + 1}`,
      vehicle_id: vehicle.vehicle_id,
      registration_number: registrationNumber,
      violation_type,
      location: choose(locations),
      issued_date: makeDate(random, -900, -3),
      amount,
      status,
    };
  });
  const storedFines = existing.fines || [];
  const fines = hasStoredVehicle ? storedFines.map((fine, index) => ({
    ...fine,
    fine_id: fine.fine_id ?? `${registrationNumber}-F${index + 1}`,
    registration_number: registrationNumber,
    location: fine.location || choose(locations),
    issued_date: fine.issued_date || makeDate(random, -900, -3),
  })) : generatedFines;

  const generatedCases = Array.from({ length: Math.floor(random() * 5) }, (_, index) => ({
    case_id: `${registrationNumber}-C${index + 1}`,
    vehicle_id: vehicle.vehicle_id,
    registration_number: registrationNumber,
    case_type: choose(caseTypes),
    description: choose(['Repeat traffic violation recorded during routine monitoring.', 'Case opened following a road safety review.', 'Vehicle documents referred for verification.', 'Parking incident submitted for review.', 'Fine appeal is awaiting an administrative decision.']),
    date: makeDate(random, -1000, -7),
    location: choose(locations),
    status: choose(caseStatuses),
  }));
  const storedCases = existing.cases || [];
  const cases = hasStoredVehicle ? storedCases.map((item, index) => ({
    ...item,
    case_id: item.case_id ?? `${registrationNumber}-C${index + 1}`,
    registration_number: registrationNumber,
    date: item.date || item.hearing_date || makeDate(random, -1000, -7),
    location: item.location || choose(locations),
    status: caseStatuses.includes(item.status) ? item.status : item.status === 'Closed' ? 'Closed' : 'Active',
  })) : generatedCases;

  const savedCompliance = existing.compliance || {};
  const insuranceExpiry = savedCompliance.insurance_expiry || makeDate(random, -90, 420);
  const pollutionExpiry = savedCompliance.pollution_expiry || makeDate(random, -90, 420);
  const fitnessExpiry = savedCompliance.fitness_expiry || makeDate(random, -90, 900);
  const taxExpiry = savedCompliance.tax_expiry || makeDate(random, -90, 420);
  const compliance = {
    insurance_expiry: insuranceExpiry,
    insurance_status: savedCompliance.insurance_status || statusForExpiry(insuranceExpiry),
    pollution_expiry: pollutionExpiry,
    pollution_status: savedCompliance.pollution_status || statusForExpiry(pollutionExpiry),
    fitness_expiry: fitnessExpiry,
    fitness_status: savedCompliance.fitness_status || statusForExpiry(fitnessExpiry),
    tax_expiry: taxExpiry,
    road_tax_status: savedCompliance.tax_status === 'Unpaid' ? 'Expired' : statusForExpiry(taxExpiry),
    registration_status: vehicle.registration_status,
  };

  const payments = [...(existing.payments || [])];
  for (const fine of fines) {
    if (fine.status === 'Paid' && !payments.some((payment) => String(payment.fine_id) === String(fine.fine_id))) {
      payments.push({ payment_id: `PAY-${fine.fine_id}`, fine_id: fine.fine_id, amount: fine.amount, date: fine.issued_date, status: 'Paid', method: 'Demo payment record' });
    }
  }

  const totalFineAmount = fines.reduce((total, fine) => total + Number(fine.amount || 0), 0);
  const pendingFineAmount = fines.filter((fine) => fine.status === 'Pending').reduce((total, fine) => total + Number(fine.amount || 0), 0);
  const paidFines = fines.filter((fine) => fine.status === 'Paid').length;
  const pendingFines = fines.filter((fine) => fine.status === 'Pending').length;
  const activeCases = cases.filter((item) => item.status === 'Active').length;
  const expiredDocuments = [compliance.insurance_status, compliance.pollution_status, compliance.fitness_status, compliance.road_tax_status].filter((status) => status === 'Expired').length;
  const riskScore = Math.min(100, Math.round(fines.length * 7 + pendingFines * 8 + cases.length * 7 + activeCases * 8 + expiredDocuments * 8));
  const complianceScore = Math.max(0, Math.min(100, Math.round(
    [compliance.insurance_status, compliance.pollution_status, compliance.fitness_status, compliance.road_tax_status].filter((status) => status === 'Valid').length * 17 +
    (fines.length ? (paidFines / fines.length) * 20 : 20) +
    (cases.length ? (cases.filter((item) => item.status === 'Closed').length / cases.length) * 12 : 12)
  )));
  const countsByStatus = (items, statuses) => Object.fromEntries(statuses.map((status) => [status, items.filter((item) => item.status === status).length]));
  const fineAmounts = fines.reduce((result, fine) => {
    const label = `₹${Number(fine.amount).toLocaleString('en-IN')}`;
    result[label] = (result[label] || 0) + 1;
    return result;
  }, {});

  return {
    vehicle,
    fines,
    cases,
    compliance,
    payments: payments.sort((a, b) => String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || ''))),
    analytics: {
      fine_status: [{ name: 'Paid', value: paidFines }, { name: 'Pending', value: pendingFines }],
      fine_amounts: Object.entries(fineAmounts).map(([name, value]) => ({ name, value })),
      case_status: Object.entries(countsByStatus(cases, caseStatuses)).map(([name, value]) => ({ name, value })),
      compliance_status: [compliance.insurance_status, compliance.pollution_status, compliance.fitness_status, compliance.road_tax_status]
        .reduce((result, status) => { result[status] = (result[status] || 0) + 1; return result; }, {}),
    },
    summary: {
      total_fines: fines.length,
      paid_fines: paidFines,
      pending_fines: pendingFines,
      total_fine_amount: totalFineAmount,
      pending_fine_amount: pendingFineAmount,
      total_cases: cases.length,
      active_cases: activeCases,
      closed_cases: cases.filter((item) => item.status === 'Closed').length,
      pending_cases: cases.filter((item) => item.status === 'Pending').length,
    },
    riskScore,
    riskPercentage: riskScore,
    riskCategory: riskScore <= 30 ? 'Low Risk' : riskScore <= 60 ? 'Medium Risk' : 'High Risk',
    complianceScore,
    demoData: true,
    demoLabel: 'Sample vehicle information generated for demonstration purposes.',
  };
}

module.exports = { generateVehicleDemoData, normalizeVehicleNumber, isValidVehicleNumber };