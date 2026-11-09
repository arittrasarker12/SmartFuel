// API Helper for SmartFuel React Client
const API_BASE = '/api';

function getAuthHeaders() {
  const userStr = localStorage.getItem('smartfuel_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        };
      }
    } catch (e) {
      console.error(e);
    }
  }
  return { 'Content-Type': 'application/json' };
}

export const api = {
  // Auth
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  register: async (data) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Feature 3: Customer Fuel Availability
  getStations: async (grade = '', search = '') => {
    let url = `${API_BASE}/customer/stations?`;
    if (grade) url += `grade=${encodeURIComponent(grade)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    const res = await fetch(url);
    return res.json();
  },

  getSystemSummary: async () => {
    const res = await fetch(`${API_BASE}/customer/summary`);
    return res.json();
  },

  // Station Manager: Feature 1 & Feature 2
  getManagerInventory: async () => {
    const res = await fetch(`${API_BASE}/manager/inventory`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  updateInventory: async (stationId, gradeId, litres) => {
    const res = await fetch(`${API_BASE}/manager/inventory/update`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        station_id: stationId,
        grade_id: gradeId,
        current_litres: litres
      })
    });
    return res.json();
  },

  recordSale: async (stationId, gradeId, litresSold) => {
    const res = await fetch(`${API_BASE}/manager/sales/record`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        station_id: stationId,
        grade_id: gradeId,
        litres_sold: litresSold
      })
    });
    return res.json();
  },

  getSalesHistory: async () => {
    const res = await fetch(`${API_BASE}/manager/sales/history`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  getInventoryLogs: async () => {
    const res = await fetch(`${API_BASE}/manager/inventory/logs`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Admin Side
  getAdminStats: async () => {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  getAdminStations: async () => {
    const res = await fetch(`${API_BASE}/admin/stations`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  verifyStation: async (stationId, status) => {
    const res = await fetch(`${API_BASE}/admin/stations/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ station_id: stationId, status })
    });
    return res.json();
  },

  getAdminPrices: async () => {
    const res = await fetch(`${API_BASE}/admin/prices`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  updateOfficialPrice: async (gradeId, newPrice) => {
    const res = await fetch(`${API_BASE}/admin/prices/update`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ grade_id: gradeId, new_price: newPrice })
    });
    return res.json();
  }
};
