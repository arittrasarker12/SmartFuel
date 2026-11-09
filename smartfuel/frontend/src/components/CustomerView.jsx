import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function CustomerView() {
  const [summary, setSummary] = useState([]);
  const [stations, setStations] = useState([]);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
    loadStations();

    const interval = setInterval(() => {
      loadStations(false);
      loadSummary();
    }, 30000);
    return () => clearInterval(interval);
  }, [gradeFilter, search]);

  const loadSummary = async () => {
    try {
      const res = await api.getSystemSummary();
      if (res.success) setSummary(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadStations = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await api.getStations(gradeFilter, search);
      if (res.success) setStations(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 mb-3">
            <i className="fa-solid fa-satellite-dish mr-1.5 animate-pulse"></i> Live Fuel Monitoring (Dhaka Area)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Real-Time Fuel Availability</h1>
          <p className="mt-2 text-emerald-100 text-sm sm:text-base leading-relaxed">
            Find verified fuel stations across Dhaka with real-time stock levels, official BPC rates, and freshness verification.
          </p>
        </div>
      </div>

      {/* System Stock Summary (SRS FR-C7) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <i className="fa-solid fa-chart-pie text-emerald-600 mr-2"></i> System Stock Summary (Dhaka City)
          </h2>
          <span className="text-xs text-slate-500">Excludes stale (&gt;6h) data</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h4 className="font-bold text-slate-800 text-base">{item.grade_name}</h4>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-slate-900">{item.total_available_litres.toLocaleString()}</span>
                  <span className="text-xs font-bold text-slate-400 ml-1">LITRES</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Across <strong className="text-slate-700">{item.active_stations}</strong> active stations
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Official Rate</span>
                <span className="text-lg font-extrabold text-emerald-600">৳{item.official_price.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 block">/ Litre</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search station name or location (e.g. Dhanmondi)..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
          {['', 'petrol', 'octane', 'diesel'].map((grade) => (
            <button
              key={grade}
              onClick={() => setGradeFilter(grade)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                gradeFilter === grade
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {grade ? grade : 'All Grades'}
            </button>
          ))}
          <button
            onClick={() => loadStations()}
            title="Refresh"
            className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <i className="fa-solid fa-arrows-rotate text-sm"></i>
          </button>
        </div>
      </div>

      {/* Stations List (SRS FR-C1, FR-C2, FR-C6) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center">
            <i className="fa-solid fa-location-dot text-emerald-600 mr-2"></i> Verified Stations & Available Litres
          </h3>
          <div className="text-xs text-slate-500 flex items-center space-x-3">
            <span className="inline-flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span> Available</span>
            <span className="inline-flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-1.5"></span> Low (≤20%)</span>
            <span className="inline-flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></span> Out</span>
            <span className="inline-flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5"></span> Stale (&gt;6h)</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-2 text-emerald-600"></i>
            <p className="text-sm">Fetching verified Dhaka fuel stations...</p>
          </div>
        ) : stations.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
            <i className="fa-solid fa-ban text-4xl text-slate-300 mb-3"></i>
            <h4 className="text-base font-bold text-slate-700">No matching stations found</h4>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting a different fuel grade.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stations.map((st) => (
              <div key={st.station_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">Lic: {st.license_no}</span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mt-1">{st.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                        <i className="fa-solid fa-location-dot text-slate-400 mr-1.5"></i> {st.address}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <i className="fa-solid fa-gas-pump text-lg"></i>
                    </div>
                  </div>

                  {/* Fuel Grades */}
                  <div className="mt-4 space-y-2.5">
                    {st.grades.map((g) => {
                      let badge = (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <i className="fa-solid fa-check mr-1"></i>Available
                        </span>
                      );
                      let barColor = 'bg-emerald-500';

                      if (g.is_stale) {
                        badge = (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200" title="Data older than 6h (SRS FR-C2)">
                            <i className="fa-solid fa-triangle-exclamation mr-1"></i>Stale (&gt;6h)
                          </span>
                        );
                        barColor = 'bg-amber-400';
                      } else if (g.status === 'out') {
                        badge = (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                            <i className="fa-solid fa-circle-xmark mr-1"></i>Out of Stock
                          </span>
                        );
                        barColor = 'bg-rose-500';
                      } else if (g.status === 'low') {
                        badge = (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-yellow-100 text-yellow-800 border border-yellow-200">
                            <i className="fa-solid fa-triangle-exclamation mr-1"></i>Low Stock
                          </span>
                        );
                        barColor = 'bg-yellow-500';
                      }

                      return (
                        <div key={g.grade_id} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-800 text-sm">{g.grade_name}</span>
                              <span className="text-xs font-bold text-slate-500">৳{g.official_price.toFixed(2)}/L</span>
                            </div>
                            <div>{badge}</div>
                          </div>

                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-slate-500">Litres Available Now:</span>
                            <div>
                              <span className="text-base font-extrabold text-slate-900">{g.available_now.toLocaleString()}</span>
                              <span className="text-slate-400 text-[10px]"> / {g.capacity_litres.toLocaleString()} L</span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div className={`${barColor} h-2 rounded-full transition-width`} style={{ width: `${Math.min(100, g.percentage)}%` }}></div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                            <span>{g.percentage}% capacity</span>
                            <span className="flex items-center"><i className="fa-regular fa-clock mr-1"></i> {g.time_label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center"><i className="fa-solid fa-user-tie mr-1 text-slate-400"></i> {st.manager_name}</span>
                  <span className="font-mono text-slate-600"><i className="fa-solid fa-phone mr-1 text-slate-400"></i> {st.manager_phone || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
