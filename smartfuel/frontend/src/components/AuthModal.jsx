import React, { useState } from 'react';
import { api } from '../api';

export default function AuthModal({ isOpen, onClose, initialTab = 'login', onAuthSuccess, showToast }) {
  const [tab, setTab] = useState(initialTab);

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register inputs
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('customer');
  const [stationName, setStationName] = useState('');
  const [stationAddress, setStationAddress] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [regError, setRegError] = useState('');

  if (!isOpen) return null;

  const fillDemo = (role) => {
    setTab('login');
    if (role === 'admin') {
      setLoginEmail('admin@smartfuel.com');
      setLoginPassword('Admin@123');
    } else if (role === 'manager') {
      setLoginEmail('manager@dhakaoil.com');
      setLoginPassword('Manager@123');
    } else if (role === 'customer') {
      setLoginEmail('customer@gmail.com');
      setLoginPassword('Customer@123');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await api.login(loginEmail.trim(), loginPassword);
      if (res.success && res.data) {
        localStorage.setItem('smartfuel_user', JSON.stringify(res.data));
        onAuthSuccess(res.data);
        showToast(`Welcome back, ${res.data.name}!`, 'success');
        onClose();
      } else {
        setLoginError(res.detail || res.message || 'Invalid login credentials');
      }
    } catch (err) {
      setLoginError('Failed to communicate with server');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');

    const payload = {
      name: regName.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim(),
      password: regPassword,
      role: regRole
    };

    if (regRole === 'manager') {
      payload.station_name = stationName.trim();
      payload.station_address = stationAddress.trim();
      payload.license_no = licenseNo.trim();
      if (!payload.station_name || !payload.station_address || !payload.license_no) {
        setRegError('All Station details are required.');
        return;
      }
    }

    try {
      const res = await api.register(payload);
      if (res.success) {
        showToast('Registration successful! Please sign in.', 'success');
        setTab('login');
        setLoginEmail(payload.email);
        setLoginPassword(payload.password);
      } else {
        setRegError(res.detail || res.message || 'Registration failed');
      }
    } catch (err) {
      setRegError('Server connection failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {tab === 'login' ? 'Sign In to SmartFuel' : 'Create SmartFuel Account'}
            </h3>
            <p className="text-xs text-slate-500">
              {tab === 'login' ? 'Secure token authentication (SRS NFR-S1)' : 'Register as Customer or Station Manager'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* 1-Click Demo Switcher */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 p-3.5">
          <span className="text-xs font-bold text-emerald-800 block mb-1.5 flex items-center">
            <i className="fa-solid fa-bolt mr-1 text-emerald-600"></i> 1-Click Quick Demo Switcher (For Evaluation):
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => fillDemo('admin')}
              className="bg-white border border-emerald-200 hover:border-emerald-500 text-emerald-800 py-1.5 px-2 rounded-lg font-medium text-center shadow-xs transition-colors"
            >
              Admin
            </button>
            <button
              onClick={() => fillDemo('manager')}
              className="bg-white border border-emerald-200 hover:border-emerald-500 text-emerald-800 py-1.5 px-2 rounded-lg font-medium text-center shadow-xs transition-colors"
            >
              Manager
            </button>
            <button
              onClick={() => fillDemo('customer')}
              className="bg-white border border-emerald-200 hover:border-emerald-500 text-emerald-800 py-1.5 px-2 rounded-lg font-medium text-center shadow-xs transition-colors"
            >
              Customer
            </button>
          </div>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            {loginError && <div className="text-xs text-rose-600 font-medium">{loginError}</div>}

            <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md">
              Sign In
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Don't have an account? </span>
              <button type="button" onClick={() => setTab('register')} className="text-xs text-emerald-600 font-bold hover:underline">
                Register now
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Tanvir Ahmed"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="user@gmail.com"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password (min 6 chars, alphanumeric)</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Account Role</label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              >
                <option value="customer">Customer (Driver / Vehicle Owner)</option>
                <option value="manager">Station Manager (Fuel Station Operator)</option>
                <option value="admin">Administrator (Platform Admin / BPC)</option>
              </select>
            </div>

            {regRole === 'manager' && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-blue-700 block">Station Information (SRS FR-A1)</span>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-0.5">Station Name</label>
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="e.g. Meghna Petroleum Mirpur"
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-0.5">Address</label>
                  <input
                    type="text"
                    value={stationAddress}
                    onChange={(e) => setStationAddress(e.target.value)}
                    placeholder="e.g. Mirpur 1, Dhaka"
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-0.5">Trade / Operating License No</label>
                  <input
                    type="text"
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    placeholder="e.g. DHK-EXP-2026-1102"
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            {regError && <div className="text-xs text-rose-600 font-medium">{regError}</div>}

            <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md">
              Complete Registration
            </button>

            <div className="text-center pt-1">
              <span className="text-xs text-slate-500">Already registered? </span>
              <button type="button" onClick={() => setTab('login')} className="text-xs text-emerald-600 font-bold hover:underline">
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
