import { useEffect, useState } from 'react';
import client from '../api/client';

export default function Admin() {
  const [vehicles, setVehicles] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const limit = 5;

  const load = () => {
    client.get('/vehicles', { params: { page, limit, q: query } }).then((r) => {
      setVehicles(r.data.data);
      setTotal(r.data.total);
    });
  };

  useEffect(load, [page, query]);

  const [fineForm, setFineForm] = useState({ vehicle_id: '', violation_type: '', amount: '', issued_date: '' });
  const addFine = async (e) => {
    e.preventDefault();
    await client.post('/fine/add', fineForm);
    setFineForm({ vehicle_id: '', violation_type: '', amount: '', issued_date: '' });
    alert('Fine added');
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-6">Admin Panel</h1>

      <div className="border border-navy-700 rounded-lg p-6 mb-10">
        <h2 className="font-display text-lg mb-4">Vehicle records</h2>
        <input
          placeholder="Search by plate or owner…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          className="w-full border border-navy-700 rounded px-3 py-2 mb-4 bg-transparent focus:outline-none focus:border-amber-500"
        />
        <table className="w-full text-sm">
          <thead className="text-paper/50 text-left">
            <tr><th className="pb-2">Plate</th><th>Owner</th><th>Type</th><th>Registered</th></tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.vehicle_id} className="border-t border-navy-700">
                <td className="py-2 font-plate">{v.registration_number}</td>
                <td>{v.owner_name}</td>
                <td>{v.vehicle_type}</td>
                <td>{v.registration_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center mt-4 text-sm">
          <span className="text-paper/50">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border border-navy-700 rounded disabled:opacity-40">Prev</button>
            <button disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border border-navy-700 rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      <div className="border border-navy-700 rounded-lg p-6">
        <h2 className="font-display text-lg mb-4">Add a fine</h2>
        <form onSubmit={addFine} className="grid grid-cols-2 gap-4">
          <input placeholder="Vehicle ID" value={fineForm.vehicle_id} onChange={(e) => setFineForm({ ...fineForm, vehicle_id: e.target.value })} className="border border-navy-700 rounded px-3 py-2 bg-transparent" required />
          <input placeholder="Violation type" value={fineForm.violation_type} onChange={(e) => setFineForm({ ...fineForm, violation_type: e.target.value })} className="border border-navy-700 rounded px-3 py-2 bg-transparent" required />
          <input placeholder="Amount" type="number" value={fineForm.amount} onChange={(e) => setFineForm({ ...fineForm, amount: e.target.value })} className="border border-navy-700 rounded px-3 py-2 bg-transparent" required />
          <input placeholder="Issued date (YYYY-MM-DD)" value={fineForm.issued_date} onChange={(e) => setFineForm({ ...fineForm, issued_date: e.target.value })} className="border border-navy-700 rounded px-3 py-2 bg-transparent" required />
          <button className="col-span-2 bg-amber-500 text-navy-950 font-medium py-2.5 rounded hover:bg-amber-600 transition-colors">Add fine</button>
        </form>
      </div>
    </div>
  );
}
