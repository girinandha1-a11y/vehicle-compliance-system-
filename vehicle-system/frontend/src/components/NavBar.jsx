import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/search', label: 'Vehicle Search' },
  { to: '/ocr', label: 'OCR Upload' },
  { to: '/fines', label: 'Fines' },
  { to: '/cases', label: 'Cases' },
  { to: '/compliance', label: 'Compliance' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/intelligence', label: 'Intelligence' },
  { to: '/documents', label: 'Documents' },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header className="border-b-2 border-navy-800 bg-navy-950 text-paper">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="plate-badge text-sm">RL-01</span>
          <span className="font-display text-xl">RoadLedger</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `hover:text-amber-500 transition-colors ${isActive ? 'text-amber-500 font-medium' : 'text-paper/80'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {user.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `hover:text-amber-500 transition-colors ${isActive ? 'text-amber-500 font-medium' : 'text-paper/80'}`
              }
            >
              Admin
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-paper/70">{user.name}</span>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="px-3 py-1.5 border border-amber-500 text-amber-500 rounded hover:bg-amber-500 hover:text-navy-950 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
      <nav className="md:hidden flex gap-5 overflow-x-auto whitespace-nowrap px-6 pb-3 text-xs" aria-label="Primary navigation">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => `shrink-0 ${isActive ? 'text-amber-500 font-medium' : 'text-paper/70'}`}>
            {link.label}
          </NavLink>
        ))}
        {user.role === 'admin' && <NavLink to="/admin" className={({ isActive }) => `shrink-0 ${isActive ? 'text-amber-500 font-medium' : 'text-paper/70'}`}>Admin</NavLink>}
      </nav>
    </header>
  );
}
