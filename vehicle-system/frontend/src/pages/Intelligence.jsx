import { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const defaultOffsets = [30, 15, 7, 1];

function downloadCsv(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Intelligence() {
  const { user } = useAuth();
  const [plate, setPlate] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [lookupError, setLookupError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({ offsets: defaultOffsets, email_enabled: false });
  const [reminders, setReminders] = useState([]);
  const [audit, setAudit] = useState([]);
  const [auditQuery, setAuditQuery] = useState('');
  const [adminSummary, setAdminSummary] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    client.get('/intelligence/reminders/settings').then(({ data }) => setSettings(data));
    client.get('/intelligence/reminders/history').then(({ data }) => setReminders(data));
    if (user?.role === 'admin') {
      client.get('/intelligence/audit').then(({ data }) => setAudit(data));
      client.get('/intelligence/admin-summary').then(({ data }) => setAdminSummary(data));
    }
  }, [user]);

  const assess = async (event) => {
    event.preventDefault();
    setLookupError('');
    setAssessment(null);
    try {
      const { data: vehicle } = await client.get(`/vehicle/${plate.trim().toUpperCase()}`);
      const { data: prediction } = await client.post('/intelligence/predict', { vehicle_id: vehicle.vehicle_id });
      const { data: risk } = await client.get(`/intelligence/risk/${vehicle.vehicle_id}`);
      const { data: history } = await client.get(`/intelligence/predictions/${vehicle.vehicle_id}/history`);
      setAssessment({ vehicle, prediction, risk });
      setPredictions(history);
    } catch (error) {
      setLookupError(error.response?.data?.error || 'Could not assess this registration.');
    }
  };

  const search = async (event) => {
    event.preventDefault();
    try {
      const { data } = await client.get('/intelligence/search', { params: { q: query } });
      setResults(data);
    } catch (error) {
      setNotice(error.response?.data?.error || 'Search failed.');
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      const { data } = await client.post('/intelligence/chat', { message, conversation_id: conversationId });
      setConversationId(data.conversation_id);
      setMessages(data.messages);
      setMessage('');
    } catch {
      setNotice('Assistant is unavailable right now.');
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    try {
      const { data } = await client.put('/intelligence/reminders/settings', settings);
      setSettings(data);
      setNotice('Reminder preferences saved.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Could not save reminder preferences.');
    }
  };

  const runReminderCheck = async () => {
    try {
      const { data } = await client.post('/intelligence/reminders/run');
      const { data: history } = await client.get('/intelligence/reminders/history');
      setReminders(history);
      setNotice(`${data.generated} reminder${data.generated === 1 ? '' : 's'} generated.`);
    } catch {
      setNotice('Reminder scan failed.');
    }
  };

  const filterAudit = async (event) => {
    event.preventDefault();
    const { data } = await client.get('/intelligence/audit', { params: { q: auditQuery } });
    setAudit(data);
  };

  const exportCsv = async (type) => {
    const { data } = await client.get(`/intelligence/reports/${type}.csv`, { responseType: 'blob' });
    downloadCsv(data, `${type}-report.csv`);
  };

  const riskColor = assessment?.risk?.classification === 'High Risk' ? 'text-signal-red' : assessment?.risk?.classification === 'Moderate' ? 'text-amber-400' : 'text-signal-green';

  return (
    <main className="max-w-7xl mx-auto px-6 py-9 space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-navy-700 pb-5">
        <div>
          <p className="text-amber-500 text-xs uppercase tracking-widest">RoadLedger / Intelligence</p>
          <h1 className="font-display text-3xl mt-2">Risk & operations center</h1>
        </div>
        {notice && <p role="status" className="text-sm text-signal-green">{notice}</p>}
      </header>

      <section className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8">
        <div>
          <h2 className="font-display text-xl mb-1">Vehicle risk assessment</h2>
          <p className="text-paper/50 text-sm mb-4">Scores use recorded fines, cases, document status, and vehicle category.</p>
          <form onSubmit={assess} className="flex gap-2">
            <input value={plate} onChange={(event) => setPlate(event.target.value)} placeholder="Registration number" className="min-w-0 flex-1 border border-navy-700 rounded px-3 py-2 bg-transparent font-plate uppercase" required />
            <button className="bg-amber-500 text-navy-950 px-4 rounded font-medium">Assess</button>
          </form>
          {lookupError && <p className="text-signal-red text-sm mt-3">{lookupError}</p>}
          {assessment && (
            <div className="mt-5 border-t border-navy-700 pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div><span className="font-plate text-xl">{assessment.vehicle.registration_number}</span><span className="text-paper/50 text-sm ml-3">{assessment.vehicle.owner_name}</span></div>
                <strong className={riskColor}>{assessment.risk.classification} · {assessment.risk.risk_score}/100</strong>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="border-l-2 border-amber-500 pl-3"><p className="text-paper/50 text-xs uppercase">Violation probability</p><p className="font-display text-3xl">{assessment.prediction.probability}%</p></div>
                <div className="border-l-2 border-signal-green pl-3"><p className="text-paper/50 text-xs uppercase">Prediction class</p><p className="font-display text-2xl mt-1">{assessment.prediction.risk_level}</p></div>
              </div>
              <p className="text-paper/50 text-xs mt-4">Factors: {assessment.risk.factors.violations} fines, {assessment.risk.factors.pending_fines} pending, {assessment.risk.factors.active_cases} active cases, {assessment.risk.factors.expired_documents} expired documents.</p>
            </div>
          )}
        </div>
        <div className="min-h-56 border-l border-navy-700 pl-0 lg:pl-7">
          <h2 className="font-display text-xl mb-1">Prediction history</h2>
          <p className="text-paper/50 text-sm mb-3">A point is saved whenever a vehicle is assessed.</p>
          {predictions.length ? <ResponsiveContainer width="100%" height={210}><LineChart data={[...predictions].reverse()}>
            <XAxis dataKey="created_at" tickFormatter={(value) => new Date(value).toLocaleDateString()} fontSize={10} />
            <YAxis domain={[0, 100]} unit="%" fontSize={11} />
            <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
            <Line type="monotone" dataKey="probability" stroke="#F2A93B" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart></ResponsiveContainer> : <p className="text-paper/40 text-sm py-12 text-center">Assess a vehicle to start its trend.</p>}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-8 border-t border-navy-700 pt-8">
        <div>
          <h2 className="font-display text-xl mb-1">Ask RoadLedger</h2>
          <p className="text-paper/50 text-sm mb-4">Get help with fines, cases, compliance, or a specific registration.</p>
          <div className="max-h-60 overflow-y-auto border-y border-navy-700 divide-y divide-navy-800">
            {messages.map((item, index) => <p key={`${item.created_at}-${index}`} className={`py-3 text-sm ${item.role === 'assistant' ? 'text-amber-200' : 'text-paper/70'}`}><span className="text-paper/40 mr-2">{item.role === 'assistant' ? 'RL' : 'You'}</span>{item.content}</p>)}
            {!messages.length && <p className="py-6 text-sm text-paper/40">Ask about a fine, case, or compliance record.</p>}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 mt-3">
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask a question or enter a plate" className="min-w-0 flex-1 border border-navy-700 rounded px-3 py-2 bg-transparent" />
            <button className="border border-amber-500 text-amber-500 px-4 rounded">Send</button>
          </form>
        </div>
        <div>
          <h2 className="font-display text-xl mb-1">Global record search</h2>
          <p className="text-paper/50 text-sm mb-4">Search plates, owners, fine and case IDs, or document numbers.</p>
          <form onSubmit={search} className="flex gap-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="At least 2 characters" className="min-w-0 flex-1 border border-navy-700 rounded px-3 py-2 bg-transparent" />
            <button className="border border-navy-600 px-4 rounded">Search</button>
          </form>
          <div className="mt-3 divide-y divide-navy-800">
            {results.map((item) => <div key={`${item.type}-${item.id}`} className="py-2 flex justify-between gap-4 text-sm"><span>{item.label}</span><span className="text-paper/50">{item.type} · {item.detail}</span></div>)}
          </div>
        </div>
      </section>

      <section className="border-t border-navy-700 pt-8 grid lg:grid-cols-[0.8fr_1.2fr] gap-8">
        <div>
          <h2 className="font-display text-xl mb-1">Expiry reminder settings</h2>
          <p className="text-paper/50 text-sm mb-4">Automated checks create in-app reminders at the selected intervals.</p>
          <form onSubmit={saveSettings} className="space-y-4">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {defaultOffsets.map((day) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.offsets?.includes(day) || false} onChange={(event) => setSettings((current) => ({ ...current, offsets: event.target.checked ? [...(current.offsets || []), day] : current.offsets.filter((value) => value !== day) }))} />{day} days</label>)}
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.email_enabled || false} onChange={(event) => setSettings((current) => ({ ...current, email_enabled: event.target.checked }))} />Email reminders (requires SMTP configuration)</label>
            <button className="border border-amber-500 text-amber-500 px-4 py-2 rounded">Save preferences</button>
          </form>
          {user?.role === 'admin' && <button onClick={runReminderCheck} className="mt-3 block text-sm text-paper/60 underline">Run check now</button>}
        </div>
        <div>
          <div className="flex justify-between items-baseline gap-3"><h2 className="font-display text-xl">Reminder history</h2><span className="text-paper/40 text-xs">{reminders.length} records</span></div>
          <div className="max-h-64 overflow-y-auto divide-y divide-navy-800 mt-3">
            {reminders.slice(0, 30).map((item) => <div key={item.reminder_id} className="py-3 flex flex-wrap justify-between gap-2 text-sm"><span>{item.message}</span><span className="text-paper/40">{new Date(item.created_at).toLocaleDateString()}</span></div>)}
            {!reminders.length && <p className="text-paper/40 text-sm py-6">No reminders have been generated.</p>}
          </div>
        </div>
      </section>

      {user?.role === 'admin' && <section className="border-t border-navy-700 pt-8">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-4">
          <div><h2 className="font-display text-xl">Admin intelligence</h2><p className="text-paper/50 text-sm">Recent audit activity and downloadable operational data.</p></div>
          <div className="flex flex-wrap gap-2">{['vehicles', 'fines', 'cases', 'compliance', 'predictions', 'reminders', 'audit'].map((type) => <button key={type} onClick={() => exportCsv(type)} className="border border-navy-700 rounded px-2.5 py-1.5 text-xs capitalize hover:border-amber-500">{type} CSV</button>)}</div>
        </div>
        {adminSummary && <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            ['Payments settled', adminSummary.total_payments],
            ['Payments pending', adminSummary.pending_payments],
            ['Safe', adminSummary.risk_distribution.Safe],
            ['Moderate', adminSummary.risk_distribution.Moderate],
            ['High risk', adminSummary.risk_distribution['High Risk']],
          ].map(([label, value]) => <div key={label} className="border-l-2 border-amber-500 pl-3 py-1"><p className="text-paper/45 text-xs uppercase">{label}</p><p className="font-display text-2xl mt-1">{value}</p></div>)}
        </div>}
        <form onSubmit={filterAudit} className="flex gap-2 mb-3"><input value={auditQuery} onChange={(event) => setAuditQuery(event.target.value)} placeholder="Filter action, user, or details" className="min-w-0 w-full max-w-sm border border-navy-700 rounded px-3 py-2 bg-transparent text-sm" /><button className="border border-navy-700 rounded px-3 text-sm">Filter</button></form>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-paper/40"><tr><th className="py-2">When</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody>{audit.slice(0, 30).map((item) => <tr key={item.log_id} className="border-t border-navy-800"><td className="py-2 pr-3 whitespace-nowrap">{new Date(item.created_at).toLocaleString()}</td><td>{item.user_id}</td><td>{item.action}</td><td className="text-paper/60">{item.details}</td></tr>)}</tbody></table></div>
      </section>}
    </main>
  );
}