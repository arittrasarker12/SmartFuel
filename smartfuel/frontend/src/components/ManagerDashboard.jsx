import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ManagerDashboard({ showToast }) {
  const [station, setStation] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modals state
  const [invModalOpen, setInvModalOpen] = useState(false);
  const [selectedInvGrade, setSelectedInvGrade] = useState(1);
  const [newLitres, setNewLitres] = useState('');
  const [invError, setInvError] = useState('');

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedSaleGrade, setSelectedSaleGrade] = useState(1);
  const [saleLitres, setSaleLitres] = useState('');
  const [saleError, setSaleError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const invRes = await api.getManagerInventory();
      if (invRes.success && invRes.data) {
        setStation(invRes.data.station);
        setInventory(invRes.data.inventory);
      }

      const salesRes = await api.getSalesHistory();
      if (salesRes.success) setSalesHistory(salesRes.data);

      const logsRes = await api.getInventoryLogs();
      if (logsRes.success) setAuditLogs(logsRes.data);
    } catch (e) {
      console.error(e);
      showToast('Error loading manager data', 'error');
    }
  };

  // Feature 1: Update Inventory Handlers
  const openUpdateModal = (gradeId = 1) => {
    setSelectedInvGrade(gradeId);
    const item = inventory.find((i) => i.grade_id == gradeId);
    setNewLitres(item ? item.current_litres : '');
    setInvError('');
    setInvModalOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setInvError('');
    const val = parseFloat(newLitres);

    if (isNaN(val) || val < 0) {
      setInvError('Stock quantity cannot be negative (SRS FR-S3).');
      return;
    }

    const currentItem = inventory.find((i) => i.grade_id == selectedInvGrade);
    const cap = currentItem ? currentItem.capacity_litres : 10000;
    if (val > cap) {
      setInvError(`Stock cannot exceed tank capacity of ${cap.toLocaleString()} L (SRS FR-S3).`);
      return;
    }

    try {
      const res = await api.updateInventory(station.station_id, selectedInvGrade, val);
      if (res.success) {
        setInvModalOpen(false);
        showToast(res.message, 'success');
        loadData();
      } else {
        setInvError(res.detail || res.message || 'Update failed');
      }
    } catch (err) {
      setInvError('Failed to communicate with server');
    }
  };

  // Feature 2: Record Sales Handlers
  const openSaleModal = (gradeId = 1) => {
    setSelectedSaleGrade(gradeId);
    setSaleLitres('');
    setSaleError('');
    setSaleModalOpen(true);
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    setSaleError('');
    const val = parseFloat(saleLitres);

    if (isNaN(val) || val <= 0) {
      setSaleError('Litres sold must be greater than zero.');
      return;
    }

    const currentItem = inventory.find((i) => i.grade_id == selectedSaleGrade);
    if (currentItem && val > currentItem.available_now) {
      setSaleError(`Insufficient stock! Cannot sell ${val} L. Only ${currentItem.available_now} L available.`);
      return;
    }

    try {
      const res = await api.recordSale(station.station_id, selectedSaleGrade, val);
      if (res.success) {
        setSaleModalOpen(false);
        showToast(res.message, 'success');
        loadData();
      } else {
        setSaleError(res.detail || res.message || 'Sale failed');
      }
    } catch (err) {
      setSaleError('Failed to communicate with server');
    }
  };

  const selectedSaleItem = inventory.find((i) => i.grade_id == selectedSaleGrade);
  const saleRate = selectedSaleItem ? selectedSaleItem.official_price : 125.0;
  const computedTotal = (parseFloat(saleLitres) || 0) * saleRate;

  return (
    <div className="space-y-6">
      {/* Station Header */}
      {station && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span
                className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full border ${
                  station.verification_status === 'verified'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}
              >
                {station.verification_status === 'verified' ? 'Verified Station' : 'Pending Admin Verification'}
              </span>
              <span className="text-xs text-slate-400 font-mono">LIC: {station.license_no}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 mt-1">{station.name}</h1>
            <p className="text-sm text-slate-500 flex items-center mt-1">
              <i className="fa-solid fa-location-dot mr-1.5 text-slate-400"></i> {station.address}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => openUpdateModal(1)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center"
            >
              <i className="fa-solid fa-boxes-stacked mr-2"></i> Update Stock (Feature 1)
            </button>
            <button
              onClick={() => openSaleModal(1)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center"
            >
              <i className="fa-solid fa-cash-register mr-2"></i> Record Sale (Feature 2)
            </button>
          </div>
        </div>
      )}

      {/* Feature 1: Current Fuel Inventory Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <i className="fa-solid fa-gas-pump text-blue-600 mr-2"></i> Current Fuel Inventory & Capacities (SRS FR-S1)
          </h2>
          <button onClick={loadData} className="text-xs text-blue-600 hover:underline flex items-center">
            <i className="fa-solid fa-arrows-rotate mr-1"></i> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {inventory.map((item) => {
            let barColor = 'bg-emerald-500';
            if (item.status === 'out') barColor = 'bg-rose-500';
            else if (item.status === 'low') barColor = 'bg-yellow-500';
            else if (item.is_stale) barColor = 'bg-amber-400';

            return (
              <div key={item.grade_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 text-lg">{item.grade_name}</span>
                    <span className="text-xs font-bold text-slate-500">৳{item.official_price.toFixed(2)}/L</span>
                  </div>

                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">{item.current_litres.toLocaleString()}</span>
                    <span className="text-xs font-bold text-slate-400"> / {item.capacity_litres.toLocaleString()} L</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
                    <div className={`${barColor} h-2.5 rounded-full transition-width`} style={{ width: `${Math.min(100, item.percentage)}%` }}></div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <span>{item.percentage}% capacity</span>
                    <span className="flex items-center"><i className="fa-regular fa-clock mr-1"></i> {item.time_label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openUpdateModal(item.grade_id)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center"
                  >
                    <i className="fa-solid fa-pen-to-square mr-1"></i> Update Stock
                  </button>
                  <button
                    onClick={() => openSaleModal(item.grade_id)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center"
                  >
                    <i className="fa-solid fa-cart-shopping mr-1"></i> Record Sale
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature 2: Tables for Sales History & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Records (SRS FR-S2) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center">
              <i className="fa-solid fa-receipt text-emerald-600 mr-2"></i> Recent Sales History (SRS FR-S2)
            </h3>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
              {salesHistory.length} Sales
            </span>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Grade</th>
                  <th className="py-2.5 px-3">Litres Sold</th>
                  <th className="py-2.5 px-3">Unit Rate</th>
                  <th className="py-2.5 px-3">Total (BDT)</th>
                  <th className="py-2.5 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesHistory.length === 0 ? (
                  <tr><td colSpan="5" className="py-6 text-center text-slate-400">No sales recorded yet.</td></tr>
                ) : (
                  salesHistory.map((s) => (
                    <tr key={s.sale_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{s.grade_name}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{s.litres_sold.toLocaleString()} L</td>
                      <td className="py-2.5 px-3 text-slate-500">৳{s.unit_price.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">৳{s.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{s.created_at ? s.created_at.replace('T', ' ').substring(0, 19) : ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Logs (SRS Table 7.4) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center">
              <i className="fa-solid fa-clock-rotate-left text-blue-600 mr-2"></i> Inventory Audit Logs (SRS Table 7.4)
            </h3>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
              Stock Audits
            </span>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Grade</th>
                  <th className="py-2.5 px-3">Stock Level</th>
                  <th className="py-2.5 px-3">Updated By</th>
                  <th className="py-2.5 px-3">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr><td colSpan="5" className="py-6 text-center text-slate-400">No logs yet.</td></tr>
                ) : (
                  auditLogs.map((l) => (
                    <tr key={l.log_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.action === 'SALE_DEDUCTION' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{l.grade_name}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{l.litres.toLocaleString()} L</td>
                      <td className="py-2.5 px-3 text-slate-500">{l.recorded_by_name || 'Manager'}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{l.recorded_at ? l.recorded_at.replace('T', ' ').substring(0, 19) : ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: Feature 1 - Update Inventory */}
      {invModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Feature 1: Update Fuel Stock</h3>
                <p className="text-xs text-slate-500">SRS FR-S1 & FR-S3 • Validated against tank capacity</p>
              </div>
              <button onClick={() => setInvModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fuel Grade</label>
                <select
                  value={selectedInvGrade}
                  onChange={(e) => {
                    setSelectedInvGrade(parseInt(e.target.value));
                    const it = inventory.find((i) => i.grade_id == e.target.value);
                    setNewLitres(it ? it.current_litres : '');
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                >
                  <option value="1">Petrol</option>
                  <option value="2">Octane</option>
                  <option value="3">Diesel</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">New Stock Level (Litres)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={newLitres}
                    onChange={(e) => setNewLitres(e.target.value)}
                    placeholder="e.g. 7500"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white pr-10"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">LITRES</span>
                </div>
              </div>

              {invError && <div className="text-xs text-rose-600 font-medium">{invError}</div>}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInvModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md">
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Feature 2 - Record Sales */}
      {saleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Feature 2: Record Fuel Sale</h3>
                <p className="text-xs text-slate-500">SRS FR-S2 & FR-S3 • Deducts stock & creates sales log</p>
              </div>
              <button onClick={() => setSaleModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSaleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fuel Grade</label>
                <select
                  value={selectedSaleGrade}
                  onChange={(e) => setSelectedSaleGrade(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                >
                  <option value="1">Petrol</option>
                  <option value="2">Octane</option>
                  <option value="3">Diesel</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Available Stock:</span>
                  <span className="font-bold text-emerald-700">{selectedSaleItem ? selectedSaleItem.available_now.toLocaleString() : 0} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Official Rate:</span>
                  <span className="font-bold text-slate-800">৳{saleRate.toFixed(2)} / L</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Litres Sold</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={saleLitres}
                    onChange={(e) => setSaleLitres(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white pr-10"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">LITRES</span>
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-800">Total BDT Amount:</span>
                <span className="text-lg font-extrabold text-emerald-700">৳{computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {saleError && <div className="text-xs text-rose-600 font-medium">{saleError}</div>}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md">
                  Confirm & Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
