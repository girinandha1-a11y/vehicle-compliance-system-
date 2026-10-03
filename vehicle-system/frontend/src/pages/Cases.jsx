import { useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function Cases() {
  const [regNumber, setRegNumber] = useState('');
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');

  const loadCases = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data: vehicle } = await client.get(`/vehicle/${regNumber.trim().toUpperCase()}`);
      const { data } = await client.get(`/cases/${vehicle.vehicle_id}`);
      setCases(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Vehicle not found');
      setCases([]);
    }
  };

  const visible = filter === 'All' ? cases : cases.filter((c) => c.status === filter);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-6">Vehicle Case Management</h1>
      <form onSubmit={loadCases} className="flex gap-3 mb-6">
        <input
          value={regNumber}
          onChange={(e) => setRegNumber(e.target.value)}
          placeholder="Registration number"
          className="flex-1 border border-navy-700 rounded px-4 py-2.5 font-plate tracking-wider bg-transparent focus:outline-none focus:border-amber-500"
          required
        />
        <button className="bg-amber-500 text-navy-950 font-medium px-6 rounded hover:bg-amber-600 transition-colors">
          Load cases
        </button>
      </form>
      {error && <p className="text-signal-red text-sm mb-4">{error}</p>}

      {cases.length > 0 && (
        <>
          <div className="flex gap-2 mb-4 text-sm">
            {['All', 'Active', 'Closed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded border ${filter === f ? 'bg-amber-500 text-navy-950 border-amber-500' : 'border-navy-700'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="border border-navy-700 rounded-lg divide-y divide-navy-700">
            {visible.map((c) => (
              <div key={c.case_id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{c.case_type}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-paper/60 text-sm mb-1">{c.description}</p>
                <p className="text-paper/50 text-xs">Hearing: {c.hearing_date || 'Not scheduled'}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
