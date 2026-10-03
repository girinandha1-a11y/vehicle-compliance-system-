import { useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function Compliance() {
  const [regNumber, setRegNumber] = useState('');
  const [compliance, setCompliance] = useState(null);
  const [error, setError] = useState('');

  const load = async (e) => {
    e.preventDefault();
    setError('');
    setCompliance(null);
    try {
      const { data: vehicle } = await client.get(`/vehicle/${regNumber.trim().toUpperCase()}`);
      const { data } = await client.get(`/compliance/${vehicle.vehicle_id}`);
      setCompliance(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No record found');
    }
  };

  const items = compliance
    ? [
        ['Insurance', compliance.insurance_expiry, compliance.insurance_status],
        ['Pollution Certificate', compliance.pollution_expiry, compliance.pollution_status],
        ['Road Tax', compliance.tax_expiry || compliance.tax_status, compliance.tax_expiry ? compliance.tax_expiry_status : compliance.tax_status === 'Paid' ? 'Valid' : 'Expired'],
        ['Fitness Certificate', compliance.fitness_expiry, compliance.fitness_status],
      ]
    : [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-6">Compliance Tracking</h1>
      <form onSubmit={load} className="flex gap-3 mb-8">
        <input
          value={regNumber}
          onChange={(e) => setRegNumber(e.target.value)}
          placeholder="Registration number"
          className="flex-1 border border-navy-700 rounded px-4 py-2.5 font-plate tracking-wider bg-transparent focus:outline-none focus:border-amber-500"
          required
        />
        <button className="bg-amber-500 text-navy-950 font-medium px-6 rounded hover:bg-amber-600 transition-colors">
          Check
        </button>
      </form>
      {error && <p className="text-signal-red text-sm mb-4">{error}</p>}

      {compliance && (
        <div className="border border-navy-700 rounded-lg divide-y divide-navy-700">
          {items.map(([label, value, status]) => (
            <div key={label} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-paper/50 text-xs">{value || 'Not on record'}</p>
              </div>
              <StatusBadge status={status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
