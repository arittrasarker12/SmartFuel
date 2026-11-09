import React, { useState } from 'react';
import { api } from '../api';

export default function AuthPage({ onAuthSuccess, showToast }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const fillDemo = (role) => {
    setLoginError('');
    setRegError('');
    if (tab === 'login') {
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
    } else {
      // User is on Sign Up tab!
      if (role === 'admin') {
        setRegName('Admin Kabir');
        setRegEmail(`admin_${Math.floor(100 + Math.random() * 900)}@smartfuel.com`);
        setRegPhone('01711002233');
        setRegPassword('Admin@123');
        setRegRole('admin');
      } else if (role === 'manager') {
        const rnd = Math.floor(100 + Math.random() * 900);
        setRegName(`Manager Hasan ${rnd}`);
        setRegEmail(`manager_${rnd}@dhakaoil.com`);
        setRegPhone('01811003344');
        setRegPassword('Manager@123');
        setRegRole('manager');
        setStationName(`Tejgaon Petroleum Depot ${rnd}`);
        setStationAddress('Tejgaon Industrial Area, Dhaka');
        setLicenseNo(`DHK-EXP-2026-${rnd}`);
      } else if (role === 'customer') {
        const rnd = Math.floor(100 + Math.random() * 900);
        setRegName(`Customer Rifat ${rnd}`);
        setRegEmail(`customer_${rnd}@gmail.com`);
        setRegPhone('01511004455');
        setRegPassword('Customer@123');
        setRegRole('customer');
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    try {
      const res = await api.login(loginEmail.trim(), loginPassword);
      if (res.success && res.data) {
        localStorage.setItem('smartfuel_user', JSON.stringify(res.data));
        showToast(`Welcome back, ${res.data.name}!`, 'success');
        onAuthSuccess(res.data);
      } else {
        setLoginError(res.detail || res.message || 'Invalid email or password.');
      }
    } catch (err) {
      setLoginError('Server connection failed. Please ensure the backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setIsSubmitting(true);

    const payload = {
      name: regName.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim(),
      password: regPassword,
      role: regRole,
    };

    if (regRole === 'manager') {
      payload.station_name = stationName.trim();
      payload.station_address = stationAddress.trim();
      payload.license_no = licenseNo.trim();
      if (!payload.station_name || !payload.station_address || !payload.license_no) {
        setRegError('Please provide all Station details.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const res = await api.register(payload);
      if (res.success) {
        showToast('Registration successful! Logging you in...', 'success');
        // Auto-login after registration
        const loginRes = await api.login(payload.email, payload.password);
        if (loginRes.success && loginRes.data) {
          localStorage.setItem('smartfuel_user', JSON.stringify(loginRes.data));
          onAuthSuccess(loginRes.data);
        } else {
          setTab('login');
          setLoginEmail(payload.email);
          setLoginPassword(payload.password);
        }
      } else {
        setRegError(res.detail || res.message || 'Registration failed.');
      }
    } catch (err) {
      setRegError('Server connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        {/* App Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-4 animate-bounce-slow">
          <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
            <i className="fa-solid fa-gas-pump text-3xl text-emerald-400"></i>
          </div>
        </div>

        {/* App Name & Branding */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            SmartFuel
          </span>
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
          Intelligent Fuel Availability & Station Management Platform
        </p>
        <span className="inline-block mt-2 px-3 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded-full">
          DIU SWE Capstone • Group JESTER
        </span>
      </div>

      {/* Main Auth Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/70 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          
          {/* Quick Demo Switcher (For Evaluation) */}
          <div className="mb-6 p-3.5 bg-slate-900/80 rounded-2xl border border-slate-700/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center">
                <i className="fa-solid fa-bolt mr-1.5 text-amber-400"></i> 1-Click Demo Evaluation:
              </span>
              <span className="text-[10px] text-slate-400">Instant test</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="py-1.5 px-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 hover:border-purple-400 transition-all text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemo('manager')}
                className="py-1.5 px-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-blue-900/40 text-blue-300 border border-blue-500/30 hover:border-blue-400 transition-all text-center"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => fillDemo('customer')}
                className="py-1.5 px-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 transition-all text-center"
              >
                Customer
              </button>
            </div>
          </div>

          {/* Tab Selector: Sign In vs Sign Up */}
          <div className="flex bg-slate-900/60 p-1 rounded-2xl mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => { setTab('login'); setLoginError(''); }}
              className={`w-1/2 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                tab === 'login'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setRegError(''); }}
              className={`w-1/2 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                tab === 'register'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* ===================== SIGN IN FORM ===================== */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <i className="fa-regular fa-envelope text-sm"></i>
                  </span>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. manager@dhakaoil.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <i className="fa-solid fa-lock text-sm"></i>
                  </span>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-slate-500"
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                  <i className="fa-solid fa-circle-exclamation text-rose-400"></i>
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ===================== SIGN UP FORM ===================== */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full px-3.5 py-2 text-sm bg-slate-900/80 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. user@gmail.com"
                  className="w-full px-3.5 py-2 text-sm bg-slate-900/80 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full px-3.5 py-2 text-sm bg-slate-900/80 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password (min 6 chars, alphanumeric)
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm bg-slate-900/80 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Account Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-900/80 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="customer">Customer (Vehicle Owner / Driver)</option>
                  <option value="manager">Station Manager (Fuel Station Operator)</option>
                  <option value="admin">Administrator (Platform Admin / BPC)</option>
                </select>
              </div>

              {/* Admin Notice */}
              {regRole === 'admin' && (
                <div className="p-3 bg-purple-950/60 border border-purple-500/40 rounded-xl text-xs text-purple-200 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-purple-300">
                    <i className="fa-solid fa-shield-halved"></i>
                    <span>Administrator Privileges</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Signing up as Administrator will grant you full access to verify fuel stations, monitor sales, and manage official BPC fuel prices.
                  </p>
                </div>
              )}

              {/* Station Manager Fields */}
              {regRole === 'manager' && (
                <div className="space-y-3 pt-2 border-t border-slate-700/80">
                  <span className="text-xs font-bold text-teal-400 block">
                    Station Details (SRS FR-A1)
                  </span>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Station Name</label>
                    <input
                      type="text"
                      required
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                      placeholder="e.g. Meghna Petroleum Mirpur"
                      className="w-full px-3 py-1.5 text-sm bg-slate-900/80 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Address</label>
                    <input
                      type="text"
                      required
                      value={stationAddress}
                      onChange={(e) => setStationAddress(e.target.value)}
                      placeholder="e.g. Mirpur 1, Dhaka"
                      className="w-full px-3 py-1.5 text-sm bg-slate-900/80 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Trade / License Number</label>
                    <input
                      type="text"
                      required
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      placeholder="e.g. DHK-EXP-2026-1102"
                      className="w-full px-3 py-1.5 text-sm bg-slate-900/80 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {regError && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                  <i className="fa-solid fa-circle-exclamation text-rose-400"></i>
                  <span>{regError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Continue</span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Highlights */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center space-x-2">
              <i className="fa-solid fa-shield-halved text-emerald-400"></i>
              <span>Secured with Salted PBKDF2 Hashing (No hardcoded logins)</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
