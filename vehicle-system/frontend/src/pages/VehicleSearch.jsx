import { useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import client from '../api/client';

const chartColors = ['#3FA66A', '#F2A93B', '#D8534F', '#4B91C8'];
const cash = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

function Status({ value }) {
  const tone = value === 'Valid' || value === 'Paid' || value === 'Closed' || value === 'Active'
    ? 'border-signal-green/50 text-signal-green bg-signal-green/10'
    : value === 'Expiring Soon' || value === 'Pending' || value === 'Under Review'
      ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
      : 'border-signal-red/50 text-signal-red bg-signal-red/10';
  return <span className={`inline-flex px-2 py-1 rounded-full border text-xs whitespace-nowrap ${tone}`}>{value || 'Unknown'}</span>;
}

function Empty({ children }) {
  return <p className="text-paper/40 text-sm py-7 text-center">{children}</p>;
}

function Gauge({ label, score, suffix = '', color = '#F2A93B', detail }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-24 shrink-0 rounded-full" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, #1E2E4D ${value * 3.6}deg)` }}>
        <div className="absolute inset-[7px] rounded-full bg-navy-900 flex flex-col items-center justify-center"><strong className="font-display text-2xl">{value}{suffix}</strong><span className="text-[10px] text-paper/50">{label}</span></div>
      </div>
      <div><p className="font-medium">{label}</p><p className="text-paper/50 text-sm">{detail}</p></div>
    </div>
  );
}

function Section({ title, subtitle, children, className = '' }) {
  return <section className={`border-t border-navy-700 pt-6 ${className}`}><div className="mb-4"><h2 className="font-display text-xl">{title}</h2>{subtitle && <p className="text-paper/45 text-sm mt-1">{subtitle}</p>}</div>{children}</section>;
}

export default function VehicleSearch() {
  const [regNumber, setRegNumber] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    setError('');
    setDashboard(null);
    setLoading(true);
    const normalized = regNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    try {
      const { data } = await client.get('/vehicles/', { params: { registration_number: normalized } });
      setDashboard(data);
      setRegNumber(normalized);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const { vehicle, fines = [], cases = [], compliance = {}, payments = [], analytics = {}, summary = {} } = dashboard || {};
  const riskColor = dashboard?.riskCategory === 'High Risk' ? '#D8534F' : dashboard?.riskCategory === 'Medium Risk' ? '#F2A93B' : '#3FA66A';
  const metrics = dashboard ? [
    ['Vehicle Number', vehicle.registration_number, 'font-plate text-lg'],
    ['Total Fines', summary.total_fines],
    ['Total Cases', summary.total_cases],
    ['Pending Fine Amount', cash(summary.pending_fine_amount)],
    ['Compliance Score', `${dashboard.complianceScore}%`],
    ['Risk Score', `${dashboard.riskScore}/100`],
  ] : [];

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div><p className="text-amber-500 text-xs uppercase tracking-widest">Records / Lookup</p><h1 className="font-display text-3xl mt-2">Vehicle Search</h1></div>
        <span className="border border-amber-500/50 text-amber-400 bg-amber-500/10 rounded px-2.5 py-1 text-xs">Demo Data</span>
      </header>
      <form onSubmit={search} className="flex gap-2 mb-3 max-w-2xl">
        <input value={regNumber} onChange={(event) => setRegNumber(event.target.value.toUpperCase())} placeholder="e.g. TN01AB1234" aria-label="Vehicle registration number" className="min-w-0 flex-1 border border-navy-700 rounded px-4 py-2.5 font-plate tracking-wider bg-transparent focus:outline-none focus:border-amber-500" required />
        <button disabled={loading} className="bg-amber-500 text-navy-950 font-medium px-5 rounded hover:bg-amber-600 transition-colors disabled:opacity-60">{loading ? 'Searching…' : 'Search Vehicle'}</button>
      </form>
      <p className="text-paper/40 text-xs mb-6">Accepts Indian registration formats. Unknown valid numbers receive consistent sample data; no government/RTO records are queried.</p>
      {error && <p role="alert" className="text-signal-red text-sm mb-5">{error}</p>}

      {loading && <div className="space-y-5 animate-pulse" aria-label="Loading vehicle dashboard"><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 rounded bg-navy-800" />)}</div><div className="h-64 rounded bg-navy-800" /></div>}

      {dashboard && !loading && <div className="space-y-8">
        <div className="border-l-2 border-amber-500 pl-3 text-xs text-paper/60">{dashboard.demoLabel}</div>
        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {metrics.map(([label, value, extraClass]) => <article key={label} className="min-h-24 border border-navy-700 rounded-md bg-navy-900 p-4"><p className="text-paper/45 text-[11px] uppercase tracking-wide">{label}</p><p className={`mt-2 font-display text-2xl ${extraClass || ''} ${label === 'Risk Score' ? (dashboard.riskCategory === 'High Risk' ? 'text-signal-red' : dashboard.riskCategory === 'Medium Risk' ? 'text-amber-400' : 'text-signal-green') : ''}`}>{value}</p></article>)}
        </section>

        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8">
          <Section title="Vehicle Information" subtitle="Sample vehicle and registered owner details.">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ['Registration Number', vehicle.registration_number], ['Owner Name', vehicle.owner_name],
                ['Manufacturer', vehicle.manufacturer], ['Model', vehicle.model], ['Vehicle Type', vehicle.vehicle_type],
                ['Fuel Type', vehicle.fuel_type], ['Registration Date', vehicle.registration_date], ['Registration Status', vehicle.registration_status],
              ].map(([label, value]) => <div key={label} className="border-b border-navy-800 pb-2"><p className="text-paper/45 text-xs mb-1">{label}</p><p className={label === 'Registration Number' ? 'font-plate' : 'font-medium'}>{value}</p></div>)}
            </div>
          </Section>
          <Section title="Risk & Compliance Scores" subtitle="Calculated from the generated vehicle history.">
            <div className="grid sm:grid-cols-2 gap-6">
              <Gauge label="Risk" score={dashboard.riskScore} suffix="" color={riskColor} detail={dashboard.riskCategory} />
              <Gauge label="Compliance" score={dashboard.complianceScore} suffix="%" color="#3FA66A" detail="Document and record score" />
            </div>
          </Section>
        </div>

        <Section title="Fine History" subtitle={`${summary.total_fines} records · Total ${cash(summary.total_fine_amount)} · Pending ${cash(summary.pending_fine_amount)}`}>
          {fines.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-paper/45 text-xs uppercase"><tr>{['Fine ID', 'Vehicle Number', 'Violation Type', 'Location', 'Date', 'Fine Amount', 'Payment Status'].map((label) => <th key={label} className="pb-3 pr-4 font-medium">{label}</th>)}</tr></thead><tbody>{fines.map((fine) => <tr key={fine.fine_id} className="border-t border-navy-800"><td className="py-3 pr-4 font-plate text-xs">{fine.fine_id}</td><td className="pr-4 font-plate text-xs">{vehicle.registration_number}</td><td className="pr-4">{fine.violation_type}</td><td className="pr-4 text-paper/60">{fine.location}</td><td className="pr-4 whitespace-nowrap">{fine.issued_date}</td><td className="pr-4">{cash(fine.amount)}</td><td><Status value={fine.status} /></td></tr>)}</tbody></table></div> : <Empty>No fines are recorded for this demo vehicle.</Empty>}
        </Section>

        <Section title="Case History" subtitle={`${summary.total_cases} records · ${summary.active_cases} active · ${summary.closed_cases} closed · ${summary.pending_cases} pending`}>
          {cases.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-paper/45 text-xs uppercase"><tr>{['Case ID', 'Vehicle Number', 'Case Type', 'Description', 'Date', 'Location', 'Status'].map((label) => <th key={label} className="pb-3 pr-4 font-medium">{label}</th>)}</tr></thead><tbody>{cases.map((item) => <tr key={item.case_id} className="border-t border-navy-800"><td className="py-3 pr-4 font-plate text-xs">{item.case_id}</td><td className="pr-4 font-plate text-xs">{vehicle.registration_number}</td><td className="pr-4">{item.case_type}</td><td className="pr-4 text-paper/60 max-w-xs">{item.description}</td><td className="pr-4 whitespace-nowrap">{item.date}</td><td className="pr-4 text-paper/60">{item.location}</td><td><Status value={item.status} /></td></tr>)}</tbody></table></div> : <Empty>No cases are recorded for this demo vehicle.</Empty>}
        </Section>

        <div className="grid lg:grid-cols-2 gap-8">
          <Section title="Compliance Status" subtitle="Expiry dates and current document standing.">
            <div className="divide-y divide-navy-800">
              {[
                ['Insurance', compliance.insurance_status, compliance.insurance_expiry],
                ['Pollution certificate (PUC)', compliance.pollution_status, compliance.pollution_expiry],
                ['Fitness certificate', compliance.fitness_status, compliance.fitness_expiry],
                ['Road tax', compliance.road_tax_status, compliance.tax_expiry],
                ['Registration', compliance.registration_status, vehicle.registration_date],
              ].map(([label, status, date]) => <div key={label} className="py-3 flex justify-between items-center gap-3"><div><p className="text-sm font-medium">{label}</p><p className="text-paper/45 text-xs mt-1">{date ? `${label === 'Registration' ? 'Registered' : 'Expires'} ${date}` : 'Date not available'}</p></div><Status value={status} /></div>)}
            </div>
          </Section>
          <Section title="Payment History" subtitle="Paid fines and recorded demo payment events.">
            {payments.length ? <div className="divide-y divide-navy-800">{payments.map((payment) => <div key={payment.payment_id} className="py-3 flex justify-between gap-3 text-sm"><div><p className="font-medium">{payment.payment_id}</p><p className="text-paper/45 text-xs mt-1">Fine {payment.fine_id} · {payment.date || new Date(payment.created_at).toLocaleDateString()}</p></div><div className="text-right"><p>{cash(payment.amount)}</p><p className="text-paper/45 text-xs">{payment.method || 'Recorded payment'}</p></div></div>)}</div> : <Empty>No payment records for this vehicle.</Empty>}
          </Section>
        </div>

        <Section title="Analytics" subtitle="Generated fine, case, and compliance distribution.">
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div><h3 className="text-sm mb-2">Paid vs Pending Fines</h3>{summary.total_fines ? <ResponsiveContainer width="100%" height={190}><PieChart><Pie data={analytics.fine_status} dataKey="value" nameKey="name" outerRadius={65} label>{analytics.fine_status.map((entry, index) => <Cell key={entry.name} fill={chartColors[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <Empty>No fine data</Empty>}</div>
            <div><h3 className="text-sm mb-2">Fine Amount Distribution</h3>{fines.length ? <ResponsiveContainer width="100%" height={190}><BarChart data={analytics.fine_amounts}><XAxis dataKey="name" fontSize={10} /><YAxis allowDecimals={false} fontSize={10} /><Tooltip /><Bar dataKey="value" fill="#F2A93B" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer> : <Empty>No fine data</Empty>}</div>
            <div><h3 className="text-sm mb-2">Cases by Status</h3>{cases.length ? <ResponsiveContainer width="100%" height={190}><PieChart><Pie data={analytics.case_status.filter((entry) => entry.value)} dataKey="value" nameKey="name" outerRadius={65} label>{analytics.case_status.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <Empty>No case data</Empty>}</div>
            <div><h3 className="text-sm mb-2">Compliance Status</h3><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={Object.entries(analytics.compliance_status).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" outerRadius={65} label>{Object.keys(analytics.compliance_status).map((name, index) => <Cell key={name} fill={name === 'Valid' ? '#3FA66A' : name === 'Expiring Soon' ? '#F2A93B' : '#D8534F'} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          </div>
          <div className="max-w-md border-t border-navy-800 pt-5 mt-4"><h3 className="text-sm mb-3">Risk Score</h3><Gauge label="Risk" score={dashboard.riskScore} color={riskColor} detail={dashboard.riskCategory} /></div>
        </Section>
      </div>}
    </main>
  );
}
