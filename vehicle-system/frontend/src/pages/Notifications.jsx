import { useEffect, useState } from 'react';
import client from '../api/client';

export default function Notifications() {
  const [items, setItems] = useState([]);

  const load = () => client.get('/notifications').then((r) => setItems(r.data));

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    await client.put(`/notifications/${id}/read`);
    load();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-6">Notification Center</h1>
      {items.length === 0 ? (
        <p className="text-paper/60 text-sm">No notifications yet — alerts for expiring compliance, pending fines, and case updates will appear here.</p>
      ) : (
        <div className="border border-navy-700 rounded-lg divide-y divide-navy-700">
          {items.map((n) => (
            <div key={n.notification_id} className={`p-4 flex items-center justify-between ${n.status === 'Unread' ? 'bg-navy-800' : ''}`}>
              <div>
                <p>{n.message}</p>
                <p className="text-paper/50 text-xs">{n.created_at}</p>
              </div>
              {n.status === 'Unread' && (
                <button
                  onClick={() => markRead(n.notification_id)}
                  className="text-xs border border-navy-700 px-2 py-1 rounded hover:border-amber-500"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
