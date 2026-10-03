import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="plate-badge text-lg">RL-01</span>
          <h1 className="font-display text-3xl text-paper mt-4">Create your account</h1>
        </div>
        <form onSubmit={submit} className="bg-navy-900 border border-navy-700 rounded-lg p-8 space-y-4">
          {error && <div className="text-signal-red text-sm">{error}</div>}
          <div>
            <label className="block text-paper/70 text-sm mb-1">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded px-3 py-2 text-paper focus:outline-none focus:border-amber-500"
              required
            />
          </div>
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
              minLength={6}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-amber-500 text-navy-950 font-medium py-2.5 rounded hover:bg-amber-600 transition-colors"
          >
            Create account
          </button>
        </form>
        <p className="text-center text-paper/60 text-sm mt-6">
          Already registered? <Link to="/login" className="text-amber-500 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
