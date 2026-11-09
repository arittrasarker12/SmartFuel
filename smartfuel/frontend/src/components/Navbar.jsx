import React from 'react';

export default function Navbar({ activeTab, setActiveTab, user, onLogout }) {
  const getRoleBadgeStyle = (role) => {
    if (role === 'admin') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (role === 'manager') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => setActiveTab('customer')} 
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-gas-pump text-xl"></i>
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              SmartFuel
            </span>
            <span className="text-[11px] block text-slate-400 font-medium -mt-1">
              DIU SWE • Group JESTER
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'customer'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-car mr-1.5 text-emerald-600"></i> Customer View
          </button>
          <button
            onClick={() => setActiveTab('manager')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'manager'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-charging-station mr-1.5 text-blue-600"></i> Station Manager
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'admin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-shield-halved mr-1.5 text-purple-600"></i> Admin Panel
          </button>
        </nav>

        {/* Logged in User Profile & Log Out */}
        <div className="flex items-center space-x-3">
          {user && (
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-xs">
                {(user.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-bold text-slate-800 leading-tight text-xs sm:text-sm">{user.name}</div>
                <span className={`inline-block text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(user.role)}`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Log Out (Return to Login page)"
                className="ml-2 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
