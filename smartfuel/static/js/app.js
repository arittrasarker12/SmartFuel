// SmartFuel Application Client Logic
// SE331 Software Engineering Design Capstone Project

let currentUser = null;
let currentTab = 'customer';
let currentGradeFilter = '';
let searchDebounceTimer = null;
let managerInventoryData = [];
let managerStation = null;
let officialPrices = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadUserFromStorage();

    // Auto-refresh customer data every 30s per SRS NFR-PF2
    setInterval(() => {
        if (currentUser && currentTab === 'customer') {
            loadCustomerStations(false);
            loadCustomerSummary();
        }
    }, 30000);
});

// -------------------------------------------------------------
// Authentication State & Session
// -------------------------------------------------------------
function loadUserFromStorage() {
    const authScreen = document.getElementById('authScreen');
    const appScreen = document.getElementById('appScreen');
    const stored = localStorage.getItem('smartfuel_user');

    if (stored) {
        try {
            currentUser = JSON.parse(stored);
            updateNavUserDisplay();
            if (authScreen) authScreen.classList.add('hidden');
            if (appScreen) appScreen.classList.remove('hidden');

            if (currentUser.role === 'manager') {
                navigateTo('manager');
            } else if (currentUser.role === 'admin') {
                navigateTo('admin');
            } else {
                navigateTo('customer');
            }
            return;
        } catch (e) {
            localStorage.removeItem('smartfuel_user');
            currentUser = null;
        }
    }

    // Not logged in -> Show Auth Screen with Logo & App Name!
    if (authScreen) authScreen.classList.remove('hidden');
    if (appScreen) appScreen.classList.add('hidden');
}

function updateNavUserDisplay() {
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userRoleDisplay = document.getElementById('userRoleDisplay');
    const userAvatar = document.getElementById('userAvatar');

    if (currentUser) {
        if (userNameDisplay) userNameDisplay.textContent = currentUser.name || 'User';
        if (userRoleDisplay) {
            userRoleDisplay.textContent = (currentUser.role || 'USER').toUpperCase();
            if (currentUser.role === 'admin') {
                userRoleDisplay.className = 'inline-block text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border bg-purple-100 text-purple-700 border-purple-200';
            } else if (currentUser.role === 'manager') {
                userRoleDisplay.className = 'inline-block text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border bg-blue-100 text-blue-700 border-blue-200';
            } else {
                userRoleDisplay.className = 'inline-block text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border bg-emerald-100 text-emerald-700 border-emerald-200';
            }
        }
        if (userAvatar) userAvatar.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
    }
}

function handleLogout() {
    localStorage.removeItem('smartfuel_user');
    currentUser = null;
    const authScreen = document.getElementById('authScreen');
    const appScreen = document.getElementById('appScreen');
    if (appScreen) appScreen.classList.add('hidden');
    if (authScreen) authScreen.classList.remove('hidden');
    showToast('Logged out successfully', 'info');
}

// -------------------------------------------------------------
// Navigation & Tab Switching
// -------------------------------------------------------------
function setupNavigation() {
    navigateTo('customer');
}

function navigateTo(tab) {
    currentTab = tab;

    // Update active tab buttons
    ['Customer', 'Manager', 'Admin'].forEach(t => {
        const btn = document.getElementById(`tab${t}`);
        if (btn) {
            if (t.toLowerCase() === tab) {
                btn.classList.add('active-nav-tab');
            } else {
                btn.classList.remove('active-nav-tab');
            }
        }
    });

    // Toggle views
    document.getElementById('viewCustomer').classList.add('hidden');
    document.getElementById('viewManager').classList.add('hidden');
    document.getElementById('viewAdmin').classList.add('hidden');

    if (tab === 'customer') {
        document.getElementById('viewCustomer').classList.remove('hidden');
        loadCustomerSummary();
        loadCustomerStations();
    } else if (tab === 'manager') {
        if (!currentUser || (currentUser.role !== 'manager' && currentUser.role !== 'admin')) {
            showToast('Please sign in as Station Manager to access this dashboard.', 'warning');
            openAuthModal('login');
            fillDemoCredentials('manager');
            return;
        }
        document.getElementById('viewManager').classList.remove('hidden');
        loadManagerData();
    } else if (tab === 'admin') {
        if (!currentUser || currentUser.role !== 'admin') {
            showToast('Administrator privileges required.', 'warning');
            openAuthModal('login');
            fillDemoCredentials('admin');
            return;
        }
        document.getElementById('viewAdmin').classList.remove('hidden');
        loadAdminData();
    }
}

// -------------------------------------------------------------
// FEATURE 3: Customer Fuel Availability (SRS FR-C1, C2, C6, C7)
// -------------------------------------------------------------
async function loadCustomerSummary() {
    try {
        const res = await fetch('/api/customer/summary');
        const json = await res.json();
        if (json.success && json.data) {
            renderSystemSummary(json.data);
        }
    } catch (e) {
        console.error('Failed to load system stock summary:', e);
    }
}

function renderSystemSummary(summaryList) {
    const container = document.getElementById('systemStockSummary');
    if (!container) return;

    container.innerHTML = summaryList.map(item => {
        let icon = 'fa-gas-pump';
        let accent = 'emerald';
        if (item.grade_name === 'Petrol') {
            icon = 'fa-fire-flame-simple';
            accent = 'emerald';
        } else if (item.grade_name === 'Octane') {
            icon = 'fa-bolt';
            accent = 'teal';
        } else if (item.grade_name === 'Diesel') {
            icon = 'fa-truck-fast';
            accent = 'cyan';
        }

        officialPrices[item.grade_name] = item.official_price;

        return `
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                    <div class="flex items-center space-x-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-${accent}-500"></span>
                        <h4 class="font-bold text-slate-800 text-base">${item.grade_name}</h4>
                    </div>
                    <div class="mt-2">
                        <span class="text-2xl font-black text-slate-900">${item.total_available_litres.toLocaleString()}</span>
                        <span class="text-xs font-bold text-slate-400">LITRES</span>
                    </div>
                    <div class="text-xs text-slate-500 mt-1">
                        Across <strong class="text-slate-700">${item.active_stations}</strong> active verified stations
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Official Rate</span>
                    <span class="text-lg font-extrabold text-${accent}-600">৳${item.official_price.toFixed(2)}</span>
                    <span class="text-[10px] text-slate-400 block">/ Litre</span>
                </div>
            </div>
        `;
    }).join('');
}

function debounceSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        loadCustomerStations();
    }, 300);
}

function setGradeFilter(grade) {
    currentGradeFilter = grade;
    ['All', 'Petrol', 'Octane', 'Diesel'].forEach(g => {
        const btn = document.getElementById(`filter${g}`);
        if (btn) {
            const val = g === 'All' ? '' : g.toLowerCase();
            if (val === grade) {
                btn.classList.add('active-pill');
            } else {
                btn.classList.remove('active-pill');
            }
        }
    });
    loadCustomerStations();
}

async function loadCustomerStations(showLoading = true) {
    const listContainer = document.getElementById('customerStationsList');
    const searchVal = document.getElementById('stationSearchInput')?.value || '';

    if (showLoading && listContainer) {
        listContainer.innerHTML = `
            <div class="col-span-full py-12 text-center text-slate-400">
                <i class="fa-solid fa-circle-notch fa-spin text-3xl mb-2 text-emerald-600"></i>
                <p class="text-sm">Fetching verified Dhaka fuel stations...</p>
            </div>
        `;
    }

    try {
        let url = `/api/customer/stations?`;
        if (currentGradeFilter) url += `grade=${encodeURIComponent(currentGradeFilter)}&`;
        if (searchVal) url += `search=${encodeURIComponent(searchVal)}&`;

        const res = await fetch(url);
        const json = await res.json();

        if (json.success) {
            renderCustomerStations(json.data);
        } else {
            listContainer.innerHTML = `<div class="col-span-full py-8 text-center text-rose-500">${json.message || 'Error loading stations'}</div>`;
        }
    } catch (e) {
        listContainer.innerHTML = `<div class="col-span-full py-8 text-center text-rose-500">Failed to connect to server.</div>`;
    }
}

function renderCustomerStations(stations) {
    const listContainer = document.getElementById('customerStationsList');
    if (!stations || stations.length === 0) {
        listContainer.innerHTML = `
            <div class="col-span-full bg-white rounded-2xl p-10 text-center border border-slate-200">
                <i class="fa-solid fa-ban text-4xl text-slate-300 mb-3"></i>
                <h4 class="text-base font-bold text-slate-700">No matching stations found</h4>
                <p class="text-xs text-slate-400 mt-1">Try clearing your search query or selecting a different fuel grade.</p>
                <button onclick="document.getElementById('stationSearchInput').value=''; setGradeFilter('');" class="mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100">
                    Reset Filters
                </button>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = stations.map(station => {
        const gradesHtml = station.grades.map(g => {
            // Badges
            let badgeHtml = '';
            let barColor = 'bg-emerald-500';

            if (g.is_stale) {
                badgeHtml = `<span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200" title="Data is older than 6 hours (SRS FR-C2)"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Stale (>6h)</span>`;
                barColor = 'bg-amber-400';
            } else if (g.status === 'available') {
                badgeHtml = `<span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-check mr-1"></i>Available</span>`;
                barColor = 'bg-emerald-500';
            } else if (g.status === 'low') {
                badgeHtml = `<span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-yellow-100 text-yellow-800 border border-yellow-200"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Low Stock</span>`;
                barColor = 'bg-yellow-500';
            } else {
                badgeHtml = `<span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200"><i class="fa-solid fa-circle-xmark mr-1"></i>Out of Stock</span>`;
                barColor = 'bg-rose-500';
            }

            return `
                <div class="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-slate-800 text-sm">${g.grade_name}</span>
                            <span class="text-xs font-bold text-slate-500">৳${g.official_price.toFixed(2)}/L</span>
                        </div>
                        <div>${badgeHtml}</div>
                    </div>

                    <!-- Litres Available Today (SRS FR-C6) -->
                    <div class="flex items-baseline justify-between text-xs">
                        <span class="text-slate-500">Litres Available Now:</span>
                        <div>
                            <span class="text-base font-extrabold text-slate-900">${g.available_now.toLocaleString()}</span>
                            <span class="text-slate-400 text-[10px]">/ ${g.capacity_litres.toLocaleString()} L</span>
                        </div>
                    </div>

                    <!-- Capacity Percentage Bar -->
                    <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div class="${barColor} h-2 rounded-full transition-width" style="width: ${Math.min(100, g.percentage)}%"></div>
                    </div>

                    <!-- Last Updated Time (SRS FR-C1 & FR-C2) -->
                    <div class="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span>${g.percentage}% capacity</span>
                        <span class="flex items-center"><i class="fa-regular fa-clock mr-1"></i> ${g.time_label}</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                    <!-- Station Header -->
                    <div class="flex items-start justify-between">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Verified
                                </span>
                                <span class="text-[11px] text-slate-400 font-mono">Lic: ${station.license_no}</span>
                            </div>
                            <h4 class="text-lg font-bold text-slate-900 mt-1">${station.name}</h4>
                            <p class="text-xs text-slate-500 mt-0.5 flex items-center">
                                <i class="fa-solid fa-location-dot text-slate-400 mr-1.5"></i> ${station.address}
                            </p>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                            <i class="fa-solid fa-gas-pump text-lg"></i>
                        </div>
                    </div>

                    <!-- Fuel Grades Breakdown Grid -->
                    <div class="mt-4 space-y-2.5">
                        ${gradesHtml}
                    </div>
                </div>

                <!-- Footer Manager Contact -->
                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span class="flex items-center"><i class="fa-solid fa-user-tie mr-1 text-slate-400"></i> ${station.manager_name}</span>
                    <span class="font-mono text-slate-600"><i class="fa-solid fa-phone mr-1 text-slate-400"></i> ${station.manager_phone || 'N/A'}</span>
                </div>
            </div>
        `;
    }).join('');
}

// -------------------------------------------------------------
// STATION MANAGER DASHBOARD (Feature 1 & Feature 2)
// -------------------------------------------------------------
async function loadManagerData() {
    if (!currentUser || !currentUser.token) return;

    try {
        const headers = { 'Authorization': `Bearer ${currentUser.token}` };

        // 1. Fetch Station & Inventory
        const invRes = await fetch('/api/manager/inventory', { headers });
        const invJson = await invRes.json();

        if (invJson.success && invJson.data) {
            managerStation = invJson.data.station;
            managerInventoryData = invJson.data.inventory;

            document.getElementById('mgrStationName').textContent = managerStation.name;
            document.getElementById('mgrStationAddress').innerHTML = `<i class="fa-solid fa-location-dot mr-1.5 text-slate-400"></i> ${managerStation.address}`;
            document.getElementById('mgrLicenseNo').textContent = `LIC: ${managerStation.license_no}`;

            const badge = document.getElementById('mgrStationStatusBadge');
            if (managerStation.verification_status === 'verified') {
                badge.className = 'px-2.5 py-1 text-xs font-bold uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200';
                badge.textContent = 'Verified Station';
            } else {
                badge.className = 'px-2.5 py-1 text-xs font-bold uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-200';
                badge.textContent = 'Pending Admin Verification';
            }

            renderManagerInventoryCards(managerInventoryData);
        }

        // 2. Fetch Sales History (Feature 2 logs)
        const salesRes = await fetch('/api/manager/sales/history', { headers });
        const salesJson = await salesRes.json();
        if (salesJson.success) {
            renderManagerSales(salesJson.data);
        }

        // 3. Fetch Stock Audit Logs (Feature 1 logs)
        const logsRes = await fetch('/api/manager/inventory/logs', { headers });
        const logsJson = await logsRes.json();
        if (logsJson.success) {
            renderManagerLogs(logsJson.data);
        }
    } catch (e) {
        console.error('Error loading manager dashboard:', e);
        showToast('Failed to load manager dashboard data.', 'error');
    }
}

function renderManagerInventoryCards(inventory) {
    const container = document.getElementById('managerInventoryCards');
    if (!container) return;

    container.innerHTML = inventory.map(item => {
        let barColor = 'bg-emerald-500';
        if (item.status === 'out') barColor = 'bg-rose-500';
        else if (item.status === 'low') barColor = 'bg-yellow-500';
        else if (item.is_stale) barColor = 'bg-amber-400';

        return `
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between">
                        <span class="font-extrabold text-slate-800 text-lg">${item.grade_name}</span>
                        <span class="text-xs font-bold text-slate-500">৳${item.official_price.toFixed(2)}/L</span>
                    </div>

                    <div class="mt-4">
                        <span class="text-3xl font-black text-slate-900">${item.current_litres.toLocaleString()}</span>
                        <span class="text-xs font-bold text-slate-400">/ ${item.capacity_litres.toLocaleString()} L</span>
                    </div>

                    <div class="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
                        <div class="${barColor} h-2.5 rounded-full transition-width" style="width: ${Math.min(100, item.percentage)}%"></div>
                    </div>

                    <div class="flex items-center justify-between text-xs text-slate-500 mt-2">
                        <span>${item.percentage}% of capacity</span>
                        <span class="flex items-center"><i class="fa-regular fa-clock mr-1"></i> ${item.time_label}</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-slate-100">
                    <button onclick="openInventoryUpdateModal(${item.grade_id})" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center">
                        <i class="fa-solid fa-pen-to-square mr-1"></i> Update Stock
                    </button>
                    <button onclick="openSalesModal(${item.grade_id})" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center">
                        <i class="fa-solid fa-cart-shopping mr-1"></i> Record Sale
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderManagerSales(sales) {
    const tbody = document.getElementById('managerSalesTableBody');
    const badge = document.getElementById('salesCountBadge');
    if (badge) badge.textContent = `${sales.length} Sales`;

    if (!sales || sales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">No sales recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = sales.map(s => {
        const timeStr = s.created_at ? s.created_at.replace('T', ' ').substring(0, 19) : 'N/A';
        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-2.5 px-3 font-bold text-slate-800">${s.grade_name}</td>
                <td class="py-2.5 px-3 font-semibold text-slate-700">${s.litres_sold.toLocaleString()} L</td>
                <td class="py-2.5 px-3 text-slate-500">৳${s.unit_price.toFixed(2)}</td>
                <td class="py-2.5 px-3 font-bold text-emerald-700">৳${s.total_price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="py-2.5 px-3 text-slate-400 font-mono text-[11px]">${timeStr}</td>
            </tr>
        `;
    }).join('');
}

function renderManagerLogs(logs) {
    const tbody = document.getElementById('managerLogsTableBody');
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">No inventory logs yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(l => {
        const timeStr = l.recorded_at ? l.recorded_at.replace('T', ' ').substring(0, 19) : 'N/A';
        let actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">UPDATE</span>`;
        if (l.action === 'SALE_DEDUCTION') {
            actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">SALE DEDUCTION</span>`;
        } else if (l.action === 'INITIAL_STOCK') {
            actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">INITIAL</span>`;
        }

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-2.5 px-3">${actionBadge}</td>
                <td class="py-2.5 px-3 font-bold text-slate-800">${l.grade_name}</td>
                <td class="py-2.5 px-3 font-semibold text-slate-700">${l.litres.toLocaleString()} L</td>
                <td class="py-2.5 px-3 text-slate-500">${l.recorded_by_name || 'Manager'}</td>
                <td class="py-2.5 px-3 text-slate-400 font-mono text-[11px]">${timeStr}</td>
            </tr>
        `;
    }).join('');
}

// -------------------------------------------------------------
// FEATURE 1: Modal & Action (Update Fuel Inventory)
// -------------------------------------------------------------
function openInventoryUpdateModal(preselectedGradeId = 1) {
    const modal = document.getElementById('updateInventoryModal');
    const select = document.getElementById('modalInvGradeSelect');
    const err = document.getElementById('modalInvError');
    err.classList.add('hidden');
    select.value = preselectedGradeId;
    onModalGradeChange(preselectedGradeId);
    modal.classList.remove('hidden');
}

function closeInventoryUpdateModal() {
    document.getElementById('updateInventoryModal').classList.add('hidden');
}

function onModalGradeChange(gradeId) {
    const item = managerInventoryData.find(i => i.grade_id == gradeId);
    if (item) {
        document.getElementById('modalInvTankCapacity').textContent = `${item.capacity_litres.toLocaleString()} L`;
        document.getElementById('modalInvCurrentStock').textContent = `${item.current_litres.toLocaleString()} L`;
        document.getElementById('modalInvNewLitres').value = item.current_litres;
    } else {
        document.getElementById('modalInvTankCapacity').textContent = `10,000 L`;
        document.getElementById('modalInvCurrentStock').textContent = `0 L`;
        document.getElementById('modalInvNewLitres').value = '';
    }
}

async function handleUpdateInventorySubmit(event) {
    event.preventDefault();
    const err = document.getElementById('modalInvError');
    err.classList.add('hidden');

    if (!managerStation) {
        err.textContent = 'No station found for this manager.';
        err.classList.remove('hidden');
        return;
    }

    const gradeId = parseInt(document.getElementById('modalInvGradeSelect').value);
    const newLitres = parseFloat(document.getElementById('modalInvNewLitres').value);

    // Client-side validation per SRS FR-S3
    if (isNaN(newLitres) || newLitres < 0) {
        err.textContent = 'Litres value cannot be negative (SRS FR-S3).';
        err.classList.remove('hidden');
        return;
    }

    const currentItem = managerInventoryData.find(i => i.grade_id == gradeId);
    const capacity = currentItem ? currentItem.capacity_litres : 10000;
    if (newLitres > capacity) {
        err.textContent = `Stock cannot exceed tank capacity of ${capacity.toLocaleString()} L (SRS FR-S3).`;
        err.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/api/manager/inventory/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({
                station_id: managerStation.station_id,
                grade_id: gradeId,
                current_litres: newLitres
            })
        });

        const json = await res.json();
        if (json.success) {
            closeInventoryUpdateModal();
            showToast(json.message, 'success');
            loadManagerData();
            loadCustomerStations(false);
            loadCustomerSummary();
        } else {
            err.textContent = json.detail || json.message || 'Update failed.';
            err.classList.remove('hidden');
        }
    } catch (e) {
        err.textContent = 'Network or server error.';
        err.classList.remove('hidden');
    }
}

// -------------------------------------------------------------
// FEATURE 2: Modal & Action (Record Fuel Sales)
// -------------------------------------------------------------
function openSalesModal(preselectedGradeId = 1) {
    const modal = document.getElementById('recordSalesModal');
    const select = document.getElementById('modalSaleGradeSelect');
    const err = document.getElementById('modalSaleError');
    err.classList.add('hidden');
    select.value = preselectedGradeId;
    document.getElementById('modalSaleLitres').value = '';
    document.getElementById('modalSaleTotalBdt').textContent = '৳0.00';
    onModalSaleGradeChange(preselectedGradeId);
    modal.classList.remove('hidden');
}

function closeSalesModal() {
    document.getElementById('recordSalesModal').classList.add('hidden');
}

function onModalSaleGradeChange(gradeId) {
    const item = managerInventoryData.find(i => i.grade_id == gradeId);
    if (item) {
        document.getElementById('modalSaleAvailableStock').textContent = `${item.available_now.toLocaleString()} L`;
        document.getElementById('modalSaleOfficialRate').textContent = `৳${item.official_price.toFixed(2)} / L`;
    }
    calculateSaleTotal();
}

function calculateSaleTotal() {
    const gradeId = parseInt(document.getElementById('modalSaleGradeSelect').value);
    const litres = parseFloat(document.getElementById('modalSaleLitres').value) || 0;
    const item = managerInventoryData.find(i => i.grade_id == gradeId);
    const rate = item ? item.official_price : 125.0;
    const total = litres * rate;
    document.getElementById('modalSaleTotalBdt').textContent = `৳${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

async function handleRecordSaleSubmit(event) {
    event.preventDefault();
    const err = document.getElementById('modalSaleError');
    err.classList.add('hidden');

    if (!managerStation) {
        err.textContent = 'No station found for this manager.';
        err.classList.remove('hidden');
        return;
    }

    const gradeId = parseInt(document.getElementById('modalSaleGradeSelect').value);
    const litresSold = parseFloat(document.getElementById('modalSaleLitres').value);

    // Validation per SRS FR-S2 & FR-S3
    if (isNaN(litresSold) || litresSold <= 0) {
        err.textContent = 'Litres sold must be greater than zero.';
        err.classList.remove('hidden');
        return;
    }

    const currentItem = managerInventoryData.find(i => i.grade_id == gradeId);
    if (currentItem && litresSold > currentItem.available_now) {
        err.textContent = `Insufficient stock! Cannot sell ${litresSold} L. Only ${currentItem.available_now} L available.`;
        err.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/api/manager/sales/record', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({
                station_id: managerStation.station_id,
                grade_id: gradeId,
                litres_sold: litresSold
            })
        });

        const json = await res.json();
        if (json.success) {
            closeSalesModal();
            showToast(json.message, 'success');
            loadManagerData();
            loadCustomerStations(false);
            loadCustomerSummary();
        } else {
            err.textContent = json.detail || json.message || 'Sale recording failed.';
            err.classList.remove('hidden');
        }
    } catch (e) {
        err.textContent = 'Network or server error.';
        err.classList.remove('hidden');
    }
}

// -------------------------------------------------------------
// ADMIN MANAGEMENT (SRS FR-A2, FR-A3, FR-D1, FR-D2, FR-S5)
// -------------------------------------------------------------
async function loadAdminData() {
    if (!currentUser || currentUser.role !== 'admin') return;

    const headers = { 'Authorization': `Bearer ${currentUser.token}` };

    try {
        // 1. Stats
        const statsRes = await fetch('/api/admin/stats', { headers });
        const statsJson = await statsRes.json();
        if (statsJson.success) {
            renderAdminStats(statsJson.data);
        }

        // 2. Official Prices
        const pricesRes = await fetch('/api/admin/prices', { headers });
        const pricesJson = await pricesRes.json();
        if (pricesJson.success) {
            renderAdminPrices(pricesJson.data);
        }

        // 3. Stations for Verification
        const stationsRes = await fetch('/api/admin/stations', { headers });
        const stationsJson = await stationsRes.json();
        if (stationsJson.success) {
            renderAdminStations(stationsJson.data);
        }
    } catch (e) {
        console.error('Error loading admin panel:', e);
        showToast('Failed to load admin data.', 'error');
    }
}

function renderAdminStats(stats) {
    const grid = document.getElementById('adminStatsGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block">Registered Stations</span>
            <div class="text-2xl font-black text-slate-900 mt-1">${stats.total_stations}</div>
            <div class="text-xs text-slate-500 mt-1">
                <span class="text-emerald-600 font-bold">${stats.verified_stations} Verified</span> • 
                <span class="text-amber-600 font-bold">${stats.pending_stations} Pending</span>
            </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Users</span>
            <div class="text-2xl font-black text-slate-900 mt-1">${stats.total_users}</div>
            <div class="text-xs text-slate-500 mt-1">Customers, Managers & Admins</div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Fuel Sales</span>
            <div class="text-2xl font-black text-emerald-700 mt-1">${stats.total_sales_litres.toLocaleString()} L</div>
            <div class="text-xs text-slate-500 mt-1">Revenue: <strong>৳${stats.total_sales_revenue.toLocaleString()}</strong></div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block">City-Wide Stock</span>
            <div class="text-2xl font-black text-blue-700 mt-1">${stats.total_inventory_litres.toLocaleString()} L</div>
            <div class="text-xs text-slate-500 mt-1">In verified Dhaka tanks</div>
        </div>
    `;
}

function renderAdminPrices(prices) {
    const grid = document.getElementById('adminPricesGrid');
    if (!grid) return;

    grid.innerHTML = prices.map(p => `
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
            <div>
                <span class="font-bold text-slate-800 text-sm block">${p.grade_name}</span>
                <span class="text-xs text-slate-400">Effective: ${p.effective_from ? p.effective_from.substring(0, 10) : 'Active'}</span>
            </div>
            <div class="flex items-center space-x-2">
                <div class="relative w-28">
                    <span class="absolute left-2.5 top-2 text-xs font-bold text-slate-500">৳</span>
                    <input type="number" step="0.5" id="priceInput_${p.grade_id}" value="${p.price_per_litre}" 
                           class="w-full pl-6 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500">
                </div>
                <button onclick="handleUpdatePrice(${p.grade_id})" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors">
                    Save
                </button>
            </div>
        </div>
    `).join('');
}

async function handleUpdatePrice(gradeId) {
    const input = document.getElementById(`priceInput_${gradeId}`);
    const newPrice = parseFloat(input.value);

    if (isNaN(newPrice) || newPrice < 0) {
        showToast('Please enter a valid price.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/admin/prices/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ grade_id: gradeId, new_price: newPrice })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message, 'success');
            loadAdminData();
            loadCustomerSummary();
        } else {
            showToast(json.detail || 'Failed to update price', 'error');
        }
    } catch (e) {
        showToast('Server error updating price', 'error');
    }
}

function renderAdminStations(stations) {
    const tbody = document.getElementById('adminStationsTableBody');
    const badge = document.getElementById('adminStationCount');
    if (badge) badge.textContent = `${stations.length} Stations`;

    if (!stations || stations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400 text-xs">No registered stations found.</td></tr>`;
        return;
    }

    tbody.innerHTML = stations.map(s => {
        let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">PENDING</span>`;
        if (s.verification_status === 'verified') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">VERIFIED</span>`;
        } else if (s.verification_status === 'rejected') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">REJECTED</span>`;
        }

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3 px-3 font-bold text-slate-800">${s.name}</td>
                <td class="py-3 px-3 font-mono text-slate-600">${s.license_no}</td>
                <td class="py-3 px-3 text-slate-500 max-w-xs truncate">${s.address}</td>
                <td class="py-3 px-3 text-slate-600">${s.manager_name} <br><span class="text-[10px] text-slate-400">${s.manager_email}</span></td>
                <td class="py-3 px-3">${statusBadge}</td>
                <td class="py-3 px-3 text-right space-x-1">
                    <button onclick="handleVerifyStation(${s.station_id}, 'verified')" 
                            class="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                        Approve
                    </button>
                    <button onclick="handleVerifyStation(${s.station_id}, 'rejected')" 
                            class="px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200">
                        Reject
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleVerifyStation(stationId, status) {
    try {
        const res = await fetch('/api/admin/stations/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ station_id: stationId, status: status })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message, 'success');
            loadAdminData();
            loadCustomerStations(false);
            loadCustomerSummary();
        } else {
            showToast(json.detail || 'Verification update failed', 'error');
        }
    } catch (e) {
        showToast('Server error updating verification status', 'error');
    }
}

// -------------------------------------------------------------
// AUTHENTICATION MODAL & ACTIONS (Module A)
// -------------------------------------------------------------
function openAuthModal(tab = 'login') {
    document.getElementById('authModal').classList.remove('hidden');
    switchAuthTab(tab);
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabBtnLogin = document.getElementById('tabBtnLogin');
    const tabBtnRegister = document.getElementById('tabBtnRegister');

    if (tab === 'login') {
        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (tabBtnLogin) {
            tabBtnLogin.className = 'w-1/2 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all bg-emerald-600 text-white shadow-md';
        }
        if (tabBtnRegister) {
            tabBtnRegister.className = 'w-1/2 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all text-slate-400 hover:text-white';
        }
    } else {
        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
        if (tabBtnLogin) {
            tabBtnLogin.className = 'w-1/2 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all text-slate-400 hover:text-white';
        }
        if (tabBtnRegister) {
            tabBtnRegister.className = 'w-1/2 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all bg-emerald-600 text-white shadow-md';
        }
    }
}

function toggleStationFields(role) {
    const mgrContainer = document.getElementById('stationManagerFields');
    const adminNotice = document.getElementById('adminNoticeBox');
    if (mgrContainer) {
        if (role === 'manager') {
            mgrContainer.classList.remove('hidden');
        } else {
            mgrContainer.classList.add('hidden');
        }
    }
    if (adminNotice) {
        if (role === 'admin') {
            adminNotice.classList.remove('hidden');
        } else {
            adminNotice.classList.add('hidden');
        }
    }
}

function fillDemoCredentials(role) {
    const registerForm = document.getElementById('registerForm');
    const isRegistering = registerForm && !registerForm.classList.contains('hidden');

    if (isRegistering) {
        const rnd = Math.floor(100 + Math.random() * 900);
        if (role === 'admin') {
            document.getElementById('regName').value = `Admin Kabir ${rnd}`;
            document.getElementById('regEmail').value = `admin_${rnd}@smartfuel.com`;
            document.getElementById('regPhone').value = '01711002233';
            document.getElementById('regPassword').value = 'Admin@123';
            document.getElementById('regRole').value = 'admin';
            toggleStationFields('admin');
        } else if (role === 'manager') {
            document.getElementById('regName').value = `Manager Hasan ${rnd}`;
            document.getElementById('regEmail').value = `manager_${rnd}@dhakaoil.com`;
            document.getElementById('regPhone').value = '01811003344';
            document.getElementById('regPassword').value = 'Manager@123';
            document.getElementById('regRole').value = 'manager';
            toggleStationFields('manager');
            document.getElementById('regStationName').value = `Tejgaon Petroleum Depot ${rnd}`;
            document.getElementById('regStationAddress').value = 'Tejgaon Industrial Area, Dhaka';
            document.getElementById('regLicenseNo').value = `DHK-EXP-2026-${rnd}`;
        } else {
            document.getElementById('regName').value = `Customer Rifat ${rnd}`;
            document.getElementById('regEmail').value = `customer_${rnd}@gmail.com`;
            document.getElementById('regPhone').value = '01511004455';
            document.getElementById('regPassword').value = 'Customer@123';
            document.getElementById('regRole').value = 'customer';
            toggleStationFields('customer');
        }
    } else {
        switchAuthTab('login');
        const emailInput = document.getElementById('loginEmail');
        const passInput = document.getElementById('loginPassword');

        if (role === 'admin') {
            emailInput.value = 'admin@smartfuel.com';
            passInput.value = 'Admin@123';
        } else if (role === 'manager') {
            emailInput.value = 'manager@dhakaoil.com';
            passInput.value = 'Manager@123';
        } else if (role === 'customer') {
            emailInput.value = 'customer@gmail.com';
            passInput.value = 'Customer@123';
        }
    }
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const err = document.getElementById('loginError');
    if (err) err.classList.add('hidden');

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const json = await res.json();
        if (json.success && json.data) {
            currentUser = json.data;
            localStorage.setItem('smartfuel_user', JSON.stringify(currentUser));
            updateNavUserDisplay();

            const authScreen = document.getElementById('authScreen');
            const appScreen = document.getElementById('appScreen');
            if (authScreen) authScreen.classList.add('hidden');
            if (appScreen) appScreen.classList.remove('hidden');

            showToast(`Welcome back, ${currentUser.name}!`, 'success');

            // Redirect to appropriate view
            if (currentUser.role === 'manager') {
                navigateTo('manager');
            } else if (currentUser.role === 'admin') {
                navigateTo('admin');
            } else {
                navigateTo('customer');
            }
        } else {
            if (err) {
                err.textContent = json.detail || json.message || 'Invalid credentials.';
                err.classList.remove('hidden');
            }
        }
    } catch (e) {
        if (err) {
            err.textContent = 'Server connection failed.';
            err.classList.remove('hidden');
        }
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();
    const err = document.getElementById('regError');
    if (err) err.classList.add('hidden');

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    const payload = { name, email, phone, password, role };

    if (role === 'manager') {
        payload.station_name = document.getElementById('regStationName').value.trim();
        payload.station_address = document.getElementById('regStationAddress').value.trim();
        payload.license_no = document.getElementById('regLicenseNo').value.trim();

        if (!payload.station_name || !payload.station_address || !payload.license_no) {
            if (err) {
                err.textContent = 'Please fill in all Station details.';
                err.classList.remove('hidden');
            }
            return;
        }
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            showToast('Account registered successfully! Logging you in...', 'success');
            // Auto login
            const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: payload.email, password: payload.password })
            });
            const loginJson = await loginRes.json();
            if (loginJson.success && loginJson.data) {
                currentUser = loginJson.data;
                localStorage.setItem('smartfuel_user', JSON.stringify(currentUser));
                updateNavUserDisplay();
                const authScreen = document.getElementById('authScreen');
                const appScreen = document.getElementById('appScreen');
                if (authScreen) authScreen.classList.add('hidden');
                if (appScreen) appScreen.classList.remove('hidden');
                navigateTo(currentUser.role === 'manager' ? 'manager' : 'customer');
            } else {
                switchAuthTab('login');
                document.getElementById('loginEmail').value = email;
                document.getElementById('loginPassword').value = password;
            }
        } else {
            if (err) {
                err.textContent = json.detail || json.message || 'Registration failed.';
                err.classList.remove('hidden');
            }
        }
    } catch (e) {
        if (err) {
            err.textContent = 'Server connection error.';
            err.classList.remove('hidden');
        }
    }
}

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2 transition-all duration-300 pointer-events-auto transform translate-y-2 opacity-0 max-w-sm`;

    if (type === 'success') {
        toast.classList.add('bg-emerald-800', 'text-white', 'border-emerald-700');
        toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-300 text-sm"></i> <span>${message}</span>`;
    } else if (type === 'error') {
        toast.classList.add('bg-rose-800', 'text-white', 'border-rose-700');
        toast.innerHTML = `<i class="fa-solid fa-circle-xmark text-rose-300 text-sm"></i> <span>${message}</span>`;
    } else if (type === 'warning') {
        toast.classList.add('bg-amber-800', 'text-white', 'border-amber-700');
        toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-300 text-sm"></i> <span>${message}</span>`;
    } else {
        toast.classList.add('bg-slate-800', 'text-white', 'border-slate-700');
        toast.innerHTML = `<i class="fa-solid fa-circle-info text-blue-300 text-sm"></i> <span>${message}</span>`;
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
