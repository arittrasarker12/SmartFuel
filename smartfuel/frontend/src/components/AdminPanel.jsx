import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminPanel({ showToast }) {
  const [stats, setStats] = useState(null);
  const [prices, setPrices] = useState([]);
  const [stations, setStations] = useState([]);
  const [priceInputs, setPriceInputs] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const statsRes = await api.getAdminStats();
      if (statsRes.success) setStats(statsRes.data);

      const pricesRes = await api.getAdminPrices();
      if (pricesRes.success) {
        setPrices(pricesRes.data);
        const map = {};
        pricesRes.data.forEach((p) => {
          map[p.grade_id] = p.price_per_litre;
        });
        setPriceInputs(map);
      }

      const stRes = await api.getAdminStations();
      if (stRes.success) setStations(stRes.data);
    } catch (e) {
      console.error(e);
      showToast('Error loading admin data', 'error');
    }
  };

  const handleVerify = async (stationId, status) => {
    try {
      const res = await api.verifyStation(stationId, status);
      if (res.success) {
        showToast(res.message, 'success');
        loadData();
      } else {
        showToast(res.detail || 'Failed to update verification', 'error');
      }
    } catch (e) {
      showToast('Server communication error', 'error');
    }
  };

  const handleSavePrice = async (gradeId) => {
    const newPrice = parseFloat(priceInputs[gradeId]);
    if (isNaN(newPrice) || newPrice < 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    try {
      const res = await api.updateOfficialPrice(gradeId, newPrice);
      if (res.success) {
        showToast(res.message, 'success');
        loadData();
      } else {
        showToast(res.detail || 'Failed to update price', 'error');
      }
    } catch (e) {
      showToast('Server communication error', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-800 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30 mb-2">
            <i className="fa-solid fa-shield-halved mr-1.5"></i> Platform Administration (BPC & Operator)
          </span>
          <h1 className="text-2xl font-extrabold">SmartFuel System Administration</h1>
          <p className="text-purple-200 text-sm mt-1">Manage station approvals, enforce official fuel prices, and monitor city-wide fuel stats.</p>
        </div>
        <button onClick={loadData} className="px-3.5 py-2 bg-purple-700/60 hover:bg-purple-600 rounded-lg text-xs font-semibold transition-all">
          <i className="fa-solid fa-arrows-rotate mr-1.5"></i> Refresh Stats
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Registered Stations</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total_stations}</div>
            <div className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-bold">{stats.verified_stations} Verified</span> •{' '}
              <span className="text-amber-600 font-bold">{stats.pending_stations} Pending</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Users</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total_users}</div>
            <div className="text-xs text-slate-500 mt-1">Customers, Managers & Admins</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Fuel Sales</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.total_sales_litres.toLocaleString()} L</div>
            <div className="text-xs text-slate-500 mt-1">Revenue: <strong>৳{stats.total_sales_revenue.toLocaleString()}</strong></div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">City-Wide Stock</span>
            <div className="text-2xl font-black text-blue-700 mt-1">{stats.total_inventory_litres.toLocaleString()} L</div>
            <div className="text-xs text-slate-500 mt-1">In verified Dhaka tanks</div>
          </div>
        </div>
      )}

      {/* Official Prices (SRS FR-S5 & FR-D2) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-bold text-slate-800 text-base flex items-center mb-1">
          <i className="fa-solid fa-tags text-purple-600 mr-2"></i> Official BPC Fuel Prices (SRS FR-S5 & FR-D2)
        </h2>
        <p className="text-xs text-slate-500 mb-4">Only Admin can modify official prices. Changes update customer view and manager sales rate immediately.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {prices.map((p) => (
            <div key={p.grade_id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 text-sm block">{p.grade_name}</span>
                <span className="text-xs text-slate-400">Effective: {p.effective_from ? p.effective_from.substring(0, 10) : 'Active'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-500">৳</span>
                  <input
                    type="number"
                    step="0.5"
                    value={priceInputs[p.grade_id] !== undefined ? priceInputs[p.grade_id] : p.price_per_litre}
                    onChange={(e) => setPriceInputs({ ...priceInputs, [p.grade_id]: e.target.value })}
                    className="w-full pl-6 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
                  />
                </div>
                <button
                  onClick={() => handleSavePrice(p.grade_id)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Station Verification (SRS FR-A2 & FR-A3) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center">
              <i className="fa-solid fa-building-circle-check text-purple-600 mr-2"></i> Station Verification & Approvals (SRS FR-A2)
            </h2>
            <p className="text-xs text-slate-500">Unverified stations remain hidden from customers until approved here.</p>
          </div>
          <span className="text-xs bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
            {stations.length} Stations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Station Name</th>
                <th className="py-3 px-3">License No</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Manager</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stations.map((s) => (
                <tr key={s.station_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-800">{s.name}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{s.license_no}</td>
                  <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{s.address}</td>
                  <td className="py-3 px-3 text-slate-600">
                    {s.manager_name} <br />
                    <span className="text-[10px] text-slate-400">{s.manager_email}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.verification_status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.verification_status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.verification_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right space-x-1">
                    <button
                      onClick={() => handleVerify(s.station_id, 'verified')}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleVerify(s.station_id, 'rejected')}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
