import { useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function Fines() {
  const [regNumber, setRegNumber] = useState('');
  const [vehicleId, setVehicleId] = useState(null);
  const [fines, setFines] = useState([]);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');

  const loadFines = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data: vehicle } = await client.get(`/vehicle/${regNumber.trim().toUpperCase()}`);
      setVehicleId(vehicle.vehicle_id);
      const { data } = await client.get(`/fines/${vehicle.vehicle_id}`);
      setFines(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Vehicle not found');
      setFines([]);
    }
  };

  const payOnline = async (fineId) => {
    setError('');
    try {
      const { data: order } = await client.post('/payments/order', { fine_id: fineId });
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }
      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'RoadLedger',
        description: `Fine #${fineId}`,
        handler: async (response) => {
          try {
            await client.post('/payments/verify', { payment_id: order.payment_id, ...response });
            const { data } = await client.get(`/fines/${vehicleId}`);
            setFines(data);
          } catch (issue) {
            setError(issue.response?.data?.error || 'Payment verification failed. Retry or contact support.');
          }
        },
        modal: { ondismiss: () => setError('Checkout was closed. The fine remains pending and can be retried.') },
      });
      checkout.on('payment.failed', (event) => setError(event.error?.description || 'Payment failed. You can retry checkout.'));
      checkout.open();
    } catch (issue) {
      setError(issue.response?.data?.error || 'Could not start secure checkout.');
    }
  };

  const visible = filter === 'All' ? fines : fines.filter((f) => f.status === filter);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-6">Fine Management</h1>
      <form onSubmit={loadFines} className="flex gap-3 mb-6">
        <input
          value={regNumber}
          onChange={(e) => setRegNumber(e.target.value)}
          placeholder="Registration number"
          className="flex-1 border border-navy-700 rounded px-4 py-2.5 font-plate tracking-wider bg-transparent focus:outline-none focus:border-amber-500"
          required
        />
        <button className="bg-amber-500 text-navy-950 font-medium px-6 rounded hover:bg-amber-600 transition-colors">
          Load fines
        </button>
      </form>
      {error && <p className="text-signal-red text-sm mb-4">{error}</p>}

      {fines.length > 0 && (
        <>
          <div className="flex gap-2 mb-4 text-sm">
            {['All', 'Pending', 'Paid'].map((f) => (
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
            {visible.map((f) => (
              <div key={f.fine_id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{f.violation_type}</p>
                  <p className="text-paper/50 text-xs">{f.issued_date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-plate">₹{f.amount}</span>
                  <StatusBadge status={f.status} />
                  {f.status === 'Pending' && (
                    <button
                      onClick={() => payOnline(f.fine_id)}
                      className="text-xs border border-signal-green text-signal-green px-2 py-1 rounded hover:bg-signal-green hover:text-navy-950"
                    >
                      Pay online
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
