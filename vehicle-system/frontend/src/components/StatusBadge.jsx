const COLORS = {
  Valid: 'bg-signal-green',
  Paid: 'bg-signal-green',
  Closed: 'bg-signal-green',
  'Expiring Soon': 'bg-amber-500',
  Active: 'bg-amber-500',
  Pending: 'bg-amber-500',
  Expired: 'bg-signal-red',
  Unknown: 'bg-navy-700',
};

export default function StatusBadge({ status }) {
  const dot = COLORS[status] || 'bg-navy-700';
  return (
    <span className="inline-flex items-center text-sm font-medium">
      <span className={`status-dot ${dot}`} />
      {status}
    </span>
  );
}
