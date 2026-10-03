import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-navy-950 text-paper">
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <span className="plate-badge text-lg">RL-01</span>
        <h1 className="font-display text-5xl md:text-6xl mt-8 leading-tight">
          Every vehicle's record,<br />one search away.
        </h1>
        <p className="text-paper/60 mt-6 max-w-xl mx-auto">
          Look up cases, fines, and compliance status by registration number —
          or just point a camera at the plate. Built for the academic demo with
          sample data throughout.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link to="/login" className="bg-amber-500 text-navy-950 font-medium px-6 py-3 rounded hover:bg-amber-600 transition-colors">
            Sign in
          </Link>
          <Link to="/register" className="border border-paper/30 px-6 py-3 rounded hover:border-amber-500 hover:text-amber-500 transition-colors">
            Create an account
          </Link>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6 text-sm">
        {[
          ['Plate recognition', 'Upload a photo and the system reads the plate, then pulls the matching record.'],
          ['Fines & cases', 'Track pending fines, court hearings, and case status per vehicle.'],
          ['Compliance tracking', 'Insurance, pollution, tax and fitness — color-coded so nothing expires unnoticed.'],
        ].map(([title, body]) => (
          <div key={title} className="border border-navy-700 rounded-lg p-6">
            <h3 className="font-display text-lg mb-2">{title}</h3>
            <p className="text-paper/60">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
