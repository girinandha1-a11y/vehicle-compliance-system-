import { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const documentTypes = ['Insurance', 'Pollution Certificate', 'Fitness Certificate', 'Registration Certificate', 'Road Tax'];

export default function Documents() {
  const { user } = useAuth();
  const [plate, setPlate] = useState('');
  const [vehicle, setVehicle] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [type, setType] = useState(documentTypes[0]);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const { data: found } = await client.get(`/vehicle/${plate.trim().toUpperCase()}`);
      const { data } = await client.get(`/documents/${found.vehicle_id}`);
      setVehicle(found);
      setDocuments(data);
    } catch (issue) {
      setError(issue.response?.data?.error || 'Vehicle lookup failed.');
      setVehicle(null);
      setDocuments([]);
    }
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file || !vehicle) return;
    const form = new FormData();
    form.append('document', file);
    form.append('vehicle_id', vehicle.vehicle_id);
    form.append('document_type', type);
    form.append('document_number', number);
    form.append('expiry_date', expiry);
    try {
      await client.post('/documents/upload', form);
      setFile(null);
      setNumber('');
      setExpiry('');
      setNotice('Document uploaded for verification.');
      const { data } = await client.get(`/documents/${vehicle.vehicle_id}`);
      setDocuments(data);
    } catch (issue) {
      setError(issue.response?.data?.error || 'Document upload failed.');
    }
  };

  const preview = async (document) => {
    const { data } = await client.get(`/documents/file/${document.document_id}`, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const verify = async (document) => {
    const expiryDate = window.prompt('Confirm document expiry date (YYYY-MM-DD):', document.expiry_date || '');
    if (expiryDate === null) return;
    await client.put(`/documents/${document.document_id}/verify`, { expiry_date: expiryDate, document_number: document.document_number });
    const { data } = await client.get(`/documents/${vehicle.vehicle_id}`);
    setDocuments(data);
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-9">
      <p className="text-amber-500 text-xs uppercase tracking-widest">Records / Documents</p>
      <h1 className="font-display text-3xl mt-2 mb-6">Vehicle documents</h1>
      <form onSubmit={load} className="flex gap-2 mb-7">
        <input value={plate} onChange={(event) => setPlate(event.target.value)} placeholder="Registration number" className="min-w-0 flex-1 border border-navy-700 rounded px-3 py-2 bg-transparent font-plate uppercase" required />
        <button className="bg-amber-500 text-navy-950 font-medium px-4 rounded">Find vehicle</button>
      </form>
      {error && <p role="alert" className="text-signal-red text-sm mb-4">{error}</p>}
      {notice && <p role="status" className="text-signal-green text-sm mb-4">{notice}</p>}
      {vehicle && <>
        <div className="flex items-baseline gap-3 border-b border-navy-700 pb-4 mb-5"><span className="font-plate text-xl">{vehicle.registration_number}</span><span className="text-paper/50">{vehicle.owner_name}</span></div>
        <form onSubmit={upload} className="grid sm:grid-cols-2 gap-3 border-b border-navy-700 pb-7 mb-6">
          <label className="text-sm">Document type<select value={type} onChange={(event) => setType(event.target.value)} className="block w-full mt-1 bg-navy-900 border border-navy-700 rounded px-3 py-2">{documentTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="text-sm">Document number<input value={number} onChange={(event) => setNumber(event.target.value)} className="block w-full mt-1 bg-transparent border border-navy-700 rounded px-3 py-2" /></label>
          <label className="text-sm">Expiry date<input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} className="block w-full mt-1 bg-navy-900 border border-navy-700 rounded px-3 py-2" /></label>
          <label className="text-sm">File (image or PDF, up to 10 MB)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files[0])} className="block w-full mt-1 text-xs" required /></label>
          <button disabled={!file} className="sm:col-span-2 justify-self-start bg-amber-500 text-navy-950 font-medium rounded px-4 py-2 disabled:opacity-50">Upload document</button>
        </form>
        <h2 className="font-display text-xl mb-3">On file <span className="text-paper/40 text-sm">{documents.length}</span></h2>
        <div className="divide-y divide-navy-800">
          {documents.map((document) => <article key={document.document_id} className="py-4 flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-medium">{document.document_type} <span className="ml-2 text-xs text-paper/50">{document.verification_status}</span></p><p className="text-xs text-paper/50 mt-1">{document.document_number || 'No document number'} · expiry {document.expiry_date || 'not extracted'}</p><p className="text-xs text-paper/40 mt-1">{document.original_name}</p></div>
            <div className="flex gap-2"><button onClick={() => preview(document)} className="border border-navy-700 rounded px-3 py-1.5 text-sm">Preview</button>{user?.role === 'admin' && <button onClick={() => verify(document)} className="border border-amber-500 text-amber-500 rounded px-3 py-1.5 text-sm">Verify</button>}</div>
          </article>)}
          {!documents.length && <p className="text-paper/45 text-sm py-5">No documents have been uploaded for this vehicle.</p>}
        </div>
      </>}
    </main>
  );
}