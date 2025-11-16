import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  if (!user) return null;

  return (
    <nav className="bg-white/95 dark:bg-navy-900/95 backdrop-blur-md shadow-sm border-b border-primary-500/10 dark:border-gold/10 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          {/* Logo / Brand */}
          <Link to="/trips" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 dark:from-accent-400 dark:to-accent-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-2xl font-display font-bold text-primary-600 dark:text-gold tracking-tight">
              Captain's Log
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            <Link
              to="/trips"
              className={`px-5 py-2.5 rounded-lg font-body font-medium relative group transition-colors ${
                isActive('/trips')
                  ? 'text-primary-600 dark:text-gold'
                  : 'text-slate dark:text-warm-gray hover:text-primary-600 dark:hover:text-gold'
              }`}
            >
              <span className="relative z-10">Trips</span>
              <div className={`absolute inset-x-2 bottom-1 h-0.5 bg-gradient-to-r from-primary-500 to-accent-400 dark:from-gold dark:to-accent-400 transition-transform origin-left ${
                isActive('/trips') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </Link>
            <Link
              to="/dashboard"
              className={`px-5 py-2.5 rounded-lg font-body font-medium relative group transition-colors ${
                isActive('/dashboard')
                  ? 'text-primary-600 dark:text-gold'
                  : 'text-slate dark:text-warm-gray hover:text-primary-600 dark:hover:text-gold'
              }`}
            >
              <span className="relative z-10">Dashboard</span>
              <div className={`absolute inset-x-2 bottom-1 h-0.5 bg-gradient-to-r from-primary-500 to-accent-400 dark:from-gold dark:to-accent-400 transition-transform origin-left ${
                isActive('/dashboard') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </Link>
            <Link
              to="/companions"
              className={`px-5 py-2.5 rounded-lg font-body font-medium relative group transition-colors ${
                isActive('/companions')
                  ? 'text-primary-600 dark:text-gold'
                  : 'text-slate dark:text-warm-gray hover:text-primary-600 dark:hover:text-gold'
              }`}
            >
              <span className="relative z-10">Companions</span>
              <div className={`absolute inset-x-2 bottom-1 h-0.5 bg-gradient-to-r from-primary-500 to-accent-400 dark:from-gold dark:to-accent-400 transition-transform origin-left ${
                isActive('/companions') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </Link>
            <Link
              to="/places-visited"
              className={`px-5 py-2.5 rounded-lg font-body font-medium relative group transition-colors ${
                isActive('/places-visited')
                  ? 'text-primary-600 dark:text-gold'
                  : 'text-slate dark:text-warm-gray hover:text-primary-600 dark:hover:text-gold'
              }`}
            >
              <span className="relative z-10">Places Visited</span>
              <div className={`absolute inset-x-2 bottom-1 h-0.5 bg-gradient-to-r from-primary-500 to-accent-400 dark:from-gold dark:to-accent-400 transition-transform origin-left ${
                isActive('/places-visited') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </Link>
            <Link
              to="/checklists"
              className={`px-5 py-2.5 rounded-lg font-body font-medium relative group transition-colors ${
                isActive('/checklists')
                  ? 'text-primary-600 dark:text-gold'
                  : 'text-slate dark:text-warm-gray hover:text-primary-600 dark:hover:text-gold'
              }`}
            >
              <span className="relative z-10">Checklists</span>
              <div className={`absolute inset-x-2 bottom-1 h-0.5 bg-gradient-to-r from-primary-500 to-accent-400 dark:from-gold dark:to-accent-400 transition-transform origin-left ${
                isActive('/checklists') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </Link>
          </div>

          {/* Right Side: User Menu */}
          <div className="flex items-center space-x-2">
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-body font-medium text-primary-600 dark:text-gold hover:bg-primary-50 dark:hover:bg-navy-800 rounded-lg transition-all"
              >
                <span>{user.username}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-navy-800 rounded-xl shadow-xl py-2 z-50 border-2 border-primary-500/10 dark:border-gold/10 backdrop-blur-sm">
                  <Link
                    to="/settings"
                    className="block px-4 py-2.5 text-sm font-body text-slate dark:text-warm-gray hover:bg-primary-50 dark:hover:bg-navy-700 hover:text-primary-600 dark:hover:text-gold transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-4 py-2.5 text-sm font-body text-slate dark:text-warm-gray hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
