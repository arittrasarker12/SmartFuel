import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CustomerView from './components/CustomerView';
import ManagerDashboard from './components/ManagerDashboard';
import AdminPanel from './components/AdminPanel';
import AuthPage from './components/AuthPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('customer');
  const [user, setUser] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('smartfuel_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        if (parsed.role === 'manager') setActiveTab('manager');
        else if (parsed.role === 'admin') setActiveTab('admin');
        else setActiveTab('customer');
      } catch (e) {
        localStorage.removeItem('smartfuel_user');
      }
    }
    setLoadingInitial(false);
  }, []);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('smartfuel_user');
    setUser(null);
    showToast('Logged out successfully', 'info');
    setActiveTab('customer');
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    if (userData.role === 'manager') setActiveTab('manager');
    else if (userData.role === 'admin') setActiveTab('admin');
    else setActiveTab('customer');
  };

  const handleTabSwitch = (tab) => {
    if (tab === 'manager') {
      if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
        showToast('Please sign in as Station Manager to view this section', 'warning');
        return;
      }
    } else if (tab === 'admin') {
      if (!user || user.role !== 'admin') {
        showToast('Administrator privileges required', 'warning');
        return;
      }
    }
    setActiveTab(tab);
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <i className="fa-solid fa-gas-pump fa-bounce text-4xl text-emerald-400 mb-3"></i>
          <p className="text-sm font-semibold text-slate-400">Loading SmartFuel...</p>
        </div>
      </div>
    );
  }

  // 1. If not logged in: Show the dedicated Login / Sign Up page with App Name & Logo!
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        <AuthPage onAuthSuccess={handleAuthSuccess} showToast={showToast} />

        {/* Toast Container for Login/Signup alerts */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2 pointer-events-auto max-w-sm ${
                t.type === 'success'
                  ? 'bg-emerald-800 text-white border-emerald-700'
                  : t.type === 'error'
                  ? 'bg-rose-800 text-white border-rose-700'
                  : t.type === 'warning'
                  ? 'bg-amber-800 text-white border-amber-700'
                  : 'bg-slate-800 text-white border-slate-700'
              }`}
            >
              <i
                className={`fa-solid text-sm mr-1 ${
                  t.type === 'success'
                    ? 'fa-circle-check text-emerald-300'
                    : t.type === 'error'
                    ? 'fa-circle-xmark text-rose-300'
                    : t.type === 'warning'
                    ? 'fa-triangle-exclamation text-amber-300'
                    : 'fa-circle-info text-blue-300'
                }`}
              ></i>
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. After logging in: The Home / Dashboard appears!
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabSwitch}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'customer' && <CustomerView />}
        {activeTab === 'manager' && <ManagerDashboard showToast={showToast} />}
        {activeTab === 'admin' && <AdminPanel showToast={showToast} />}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-slate-600">AI-Based SmartFuel System • SWE • Daffodil International University (DIU)</p>
          <p className="mt-1">Course: SE331 Software Engineering Design Capstone Project • Group 07 (JESTER)</p>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2 pointer-events-auto max-w-sm ${
              t.type === 'success'
                ? 'bg-emerald-800 text-white border-emerald-700'
                : t.type === 'error'
                ? 'bg-rose-800 text-white border-rose-700'
                : t.type === 'warning'
                ? 'bg-amber-800 text-white border-amber-700'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            <i
              className={`fa-solid text-sm mr-1 ${
                t.type === 'success'
                  ? 'fa-circle-check text-emerald-300'
                  : t.type === 'error'
                  ? 'fa-circle-xmark text-rose-300'
                  : t.type === 'warning'
                  ? 'fa-triangle-exclamation text-amber-300'
                  : 'fa-circle-info text-blue-300'
              }`}
            ></i>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
