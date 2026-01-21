/**
 * QuickActionsWidget - Quick access to common actions
 */

import { useNavigate } from 'react-router-dom';

export default function QuickActionsWidget() {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'New Trip',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onClick: () => navigate('/trips/new'),
      color: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    },
    {
      label: 'Upload Photos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      onClick: () => navigate('/trips'),
      color: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    },
    {
      label: 'Add Location',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      onClick: () => navigate('/places-visited'),
      color: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    },
    {
      label: 'New Companion',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      onClick: () => navigate('/companions'),
      color: 'from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700',
    },
    {
      label: 'View Map',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      onClick: () => navigate('/places-visited'),
      color: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
    },
    {
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      onClick: () => navigate('/settings'),
      color: 'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700',
    },
  ];

  return (
    <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-lg border-2 border-primary-100 dark:border-sky/10 hover:shadow-xl transition-shadow duration-300 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white">
          Quick Actions
        </h3>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`p-4 rounded-xl bg-gradient-to-br ${action.color} text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-100 group`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                {action.icon}
              </div>
              <span className="text-sm font-semibold text-center">
                {action.label}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Keyboard shortcut hint */}
      <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-navy-900/50 border border-gray-200 dark:border-navy-700">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-navy-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">⌘K</kbd> for global search
          </span>
        </div>
      </div>
    </div>
  );
}
