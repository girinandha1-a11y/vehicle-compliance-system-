import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import client from '../api/client';

const PIE_COLORS = ['#3FA66A', '#F2A93B', '#D8534F'];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [violations, setViolations] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);

  useEffect(() => {
    client.get('/analytics/summary').then((r) => setSummary(r.data));
    client.get('/analytics/fine-trends').then((r) => setTrends(r.data));
    client.get('/analytics/violation-categories').then((r) => setViolations(r.data));
    client.get('/analytics/vehicle-types').then((r) => setVehicleTypes(r.data));
  }, []);

  if (!summary) return <div className="p-8">Loading dashboard...</div>;

  const complianceData = Object.entries(summary.compliance_distribution).map(([name, value]) => ({ name, value }));

  const cards = [
    ['Total Vehicles', summary.total_vehicles],
    ['Total Fines', summary.total_fines],
    ['Pending Fine Amount', `₹${summary.pending_fines_amount}`],
    ['Active Cases', summary.active_cases],
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-8">Analytics Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {cards.map(([label, value]) => (
          <div key={label} className="border border-navy-700 rounded-lg p-5 bg-navy-900 dark:bg-navy-900">
            <p className="text-paper/60 text-xs uppercase tracking-wide">{label}</p>
            <p className="font-display text-3xl mt-2">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="border border-navy-700 rounded-lg p-6">
          <h2 className="font-display text-lg mb-4">Fine trends by month</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#F2A93B" strokeWidth={2} name="Amount (₹)" />
              <Line type="monotone" dataKey="count" stroke="#3FA66A" strokeWidth={2} name="Count" />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-navy-700 rounded-lg p-6">
          <h2 className="font-display text-lg mb-4">Violation categories</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={violations}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="violation_type" fontSize={11} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#F2A93B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-navy-700 rounded-lg p-6">
          <h2 className="font-display text-lg mb-4">Compliance status distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={complianceData} dataKey="value" nameKey="name" outerRadius={90} label>
                {complianceData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-navy-700 rounded-lg p-6">
          <h2 className="font-display text-lg mb-4">Vehicle type distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vehicleTypes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" fontSize={12} allowDecimals={false} />
              <YAxis type="category" dataKey="vehicle_type" fontSize={12} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#3FA66A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
