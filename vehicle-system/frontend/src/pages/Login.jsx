import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="plate-badge text-lg">RL-01</span>
          <h1 className="font-display text-3xl text-paper mt-4">RoadLedger</h1>
          <p className="text-paper/60 text-sm mt-1">Vehicle case, fine & compliance sign-in</p>
        </div>
        <form onSubmit={submit} className="bg-navy-900 border border-navy-700 rounded-lg p-8 space-y-4">
          {error && <div className="text-signal-red text-sm">{error}</div>}
          <div>
            <label className="block text-paper/70 text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded px-3 py-2 text-paper focus:outline-none focus:border-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-paper/70 text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded px-3 py-2 text-paper focus:outline-none focus:border-amber-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-amber-500 text-navy-950 font-medium py-2.5 rounded hover:bg-amber-600 transition-colors"
          >
            Sign in
          </button>
          <p className="text-paper/50 text-xs text-center pt-2">
            Demo accounts — admin@demo.com / Admin@123 · user@demo.com / User@123
          </p>
        </form>
        <p className="text-center text-paper/60 text-sm mt-6">
          No account? <Link to="/register" className="text-amber-500 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
