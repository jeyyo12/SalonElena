// script.js

// Stock management
if (document.getElementById('stockForm')) {
    const stockForm = document.getElementById('stockForm');
    const stockTable = document.getElementById('stockTable').querySelector('tbody');

    let stock = JSON.parse(localStorage.getItem('stock')) || [];

    function renderStock() {
        stockTable.innerHTML = '';
        stock.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${item.image || 'https://via.placeholder.com/50?text=No+Image'}" alt="${item.name}" style="width:50px; height:50px;"></td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>
                    <button onclick="increaseQuantity(${index})">Mărește Cantitate</button>
                    <button onclick="removeStock(${index})">Șterge</button>
                </td>
            `;
            stockTable.appendChild(row);
        });
    }

    stockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('productName').value;
        const quantity = document.getElementById('quantity').value;
        const image = document.getElementById('productImage').value;
        stock.push({ name, quantity: parseInt(quantity), image });
        localStorage.setItem('stock', JSON.stringify(stock));
        renderStock();
        stockForm.reset();
    });

    window.increaseQuantity = (index) => {
        const newQty = prompt('Introdu noua cantitate:', stock[index].quantity);
        if (newQty !== null && !isNaN(newQty)) {
            stock[index].quantity = parseInt(newQty);
            localStorage.setItem('stock', JSON.stringify(stock));
            renderStock();
        }
    };

    window.removeStock = (index) => {
        stock.splice(index, 1);
        localStorage.setItem('stock', JSON.stringify(stock));
        renderStock();
    };

    renderStock();
}

// Clients management
if (document.getElementById('clientForm')) {
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            document.getElementById(tabName + '-tab').classList.add('active');
        });
    });

    const clientForm = document.getElementById('clientForm');
    const clientsList = document.getElementById('clientsList');
    const searchInput = document.getElementById('search');
    const addClientBtn = document.getElementById('addClientBtn');
    const filterBtn = document.getElementById('filterBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    let clients = JSON.parse(localStorage.getItem('clients')) || [];
    let filteredClients = [...clients];
    let currentPage = 1;
    const itemsPerPage = 6;

    function renderClients() {
        const sexFilter = document.getElementById('filterSex').value;
        const tagFilter = document.getElementById('filterTag').value;
        let displayClients = filteredClients.filter(client => {
            return (!sexFilter || client.sex === sexFilter) && (!tagFilter || client.tag === tagFilter);
        });
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageClients = displayClients.slice(start, end);

        clientsList.innerHTML = '';
        pageClients.forEach((client, index) => {
            const card = document.createElement('div');
            card.className = 'client-card';
            card.innerHTML = `
                <img src="${client.image ? `images/${client.image}.jpg` : 'https://via.placeholder.com/56?text=' + client.name.charAt(0)}" alt="${client.name}" class="client-avatar">
                <div class="client-info">
                    <h3>${client.name}</h3>
                    <p>Telefon: ${client.phone}</p>
                    <p>Email: ${client.email || 'N/A'}</p>
                    <p>Tag: ${client.tag || 'Niciunul'}</p>
                </div>
                <div class="client-actions">
                    <button class="edit-btn" onclick="editClient(${start + index})"><i class="fas fa-edit"></i></button>
                </div>
            `;
            clientsList.appendChild(card);
        });

        updatePagination(displayClients.length);
    }

    function updatePagination(total) {
        const start = (currentPage - 1) * itemsPerPage + 1;
        const end = Math.min(currentPage * itemsPerPage, total);
        pageInfo.textContent = `Showing ${start}–${end} of ${total} Clients`;

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === Math.ceil(total / itemsPerPage);
    }

    function filterClients() {
        const query = searchInput.value.toLowerCase();
        filteredClients = clients.filter(client => client.name.toLowerCase().includes(query));
        currentPage = 1;
        renderClients();
    }

    clientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('clientName').value;
        const phone = document.getElementById('clientPhone').value;
        const email = document.getElementById('clientEmail').value;
        const sex = document.getElementById('clientSex').value;
        const notes = document.getElementById('clientNotes').value;
        const tag = document.getElementById('clientTag').value;
        clients.push({ name, phone, email, sex, notes, tag, work: '', image: '', visits: [] });
        localStorage.setItem('clients', JSON.stringify(clients));
        filteredClients = [...clients];
        renderClients();
        clientForm.reset();
        clientForm.style.display = 'none';
    });

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        filteredClients = clients.filter(client => client.name.toLowerCase().includes(query));
        currentPage = 1;
        renderClients();
    });

    document.getElementById('filterSex').addEventListener('change', () => {
        currentPage = 1;
        renderClients();
    });

    document.getElementById('filterTag').addEventListener('change', () => {
        currentPage = 1;
        renderClients();
    });

    addClientBtn.addEventListener('click', () => {
        clientForm.style.display = clientForm.style.display === 'none' ? 'block' : 'none';
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderClients();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentPage < Math.ceil(filteredClients.length / itemsPerPage)) {
            currentPage++;
            renderClients();
        }
    });

    window.editClient = (index) => {
        const client = clients[index];
        const newWork = prompt('Editează lucrări:', client.work);
        if (newWork !== null) {
            clients[index].work = newWork;
            localStorage.setItem('clients', JSON.stringify(clients));
            filteredClients = [...clients];
            renderClients();
        }
    };

    // Appointments
    let appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    let currentDateFilter = 'today';

    function checkConflicts() {
        const dateInput = document.getElementById('apptDate');
        const durationInput = document.getElementById('apptDuration');
        const conflictEl = document.getElementById('conflictChecker');

        if (!dateInput.value || !durationInput.value) {
            conflictEl.style.display = 'none';
            return;
        }

        const selectedDate = new Date(dateInput.value);
        const duration = parseInt(durationInput.value);
        const endTime = new Date(selectedDate.getTime() + duration * 60000);

        let conflict = false;
        let conflictTime = '';

        appointments.forEach(appt => {
            if (appt.status === 'Anulată') return;
            const apptStart = new Date(appt.date);
            const apptEnd = new Date(apptStart.getTime() + appt.duration * 60000);

            if ((selectedDate >= apptStart && selectedDate < apptEnd) ||
                (endTime > apptStart && endTime <= apptEnd) ||
                (selectedDate <= apptStart && endTime >= apptEnd)) {
                conflict = true;
                conflictTime = `${apptStart.toLocaleTimeString('ro-RO', {hour: '2-digit', minute: '2-digit'})}–${apptEnd.toLocaleTimeString('ro-RO', {hour: '2-digit', minute: '2-digit'})}`;
            }
        });

        if (conflict) {
            conflictEl.className = 'conflict-status conflict';
            conflictEl.textContent = `Se suprapune cu ${conflictTime}`;
        } else {
            conflictEl.className = 'conflict-status available';
            conflictEl.textContent = 'Slot disponibil';
        }
        conflictEl.style.display = 'block';
    }

    function renderAppointments() {
        const list = document.getElementById('appointmentsList');
        const statusFilter = document.getElementById('filterAppointmentStatus').value;
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        list.innerHTML = '';
        appointments
            .filter(appt => {
                if (statusFilter && appt.status !== statusFilter) return false;
                const apptDate = new Date(appt.date);
                if (currentDateFilter === 'today' && apptDate.toDateString() !== today.toDateString()) return false;
                if (currentDateFilter === 'tomorrow' && apptDate.toDateString() !== tomorrow.toDateString()) return false;
                if (currentDateFilter === 'week' && (apptDate < today || apptDate > weekEnd)) return false;
                // 'all' shows all
                return true;
            })
            .forEach((appt, index) => {
                const li = document.createElement('li');
                li.className = 'appointment-item';
                const apptDate = new Date(appt.date);
                li.innerHTML = `
                    <div class="appointment-info">
                        <strong>${appt.client}</strong> - ${appt.service} (${appt.duration} min)<br>
                        ${apptDate.toLocaleString('ro-RO')} - Status: ${appt.status}
                    </div>
                    <div class="appointment-actions">
                        ${appt.status === 'Programată' ? `<button onclick="completeAppointment(${index})">Finalizează</button>` : ''}
                        ${appt.status === 'Programată' ? `<button onclick="cancelAppointment(${index})">Anulează</button>` : ''}
                        <button onclick="deleteAppointment(${index})">Șterge</button>
                    </div>
                `;
                list.appendChild(li);
            });
    }

    function populateAppointmentSelects() {
        const clientSelect = document.getElementById('apptClient');
        const serviceSelect = document.getElementById('apptService');
        clientSelect.innerHTML = '<option value="">Selectează client</option>';
        serviceSelect.innerHTML = '<option value="">Selectează serviciu</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.name;
            option.textContent = client.name;
            clientSelect.appendChild(option);
        });
        const services = JSON.parse(localStorage.getItem('services')) || [];
        services.filter(s => s.active !== false).forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = `${service.name} - ${service.price} RON`;
            serviceSelect.appendChild(option);
        });
    }

    // Event listeners for chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentDateFilter = chip.dataset.filter;
            renderAppointments();
        });
    });

    document.getElementById('saveAppointmentBtn').addEventListener('click', (e) => {
        e.preventDefault();
        const client = document.getElementById('apptClient').value;
        const service = document.getElementById('apptService').value;
        const date = document.getElementById('apptDate').value;
        const duration = document.getElementById('apptDuration').value;

        if (!client || !service || !date || !duration) {
            alert('Completează toate câmpurile!');
            return;
        }

        appointments.push({ client, service, date, duration: parseInt(duration), status: 'Programată' });
        localStorage.setItem('appointments', JSON.stringify(appointments));
        renderAppointments();
        document.getElementById('appointmentFormCard').reset();
        document.getElementById('appointmentFormCard').style.display = 'none';
        document.getElementById('conflictChecker').style.display = 'none';
    });

    // Conflict checker listeners
    document.getElementById('apptDate').addEventListener('change', checkConflicts);
    document.getElementById('apptDuration').addEventListener('input', checkConflicts);

    window.completeAppointment = (index) => {
        appointments[index].status = 'Finalizată';
        localStorage.setItem('appointments', JSON.stringify(appointments));
        // Add to earnings
        const appt = appointments[index];
        const services = JSON.parse(localStorage.getItem('services')) || [];
        const service = services.find(s => s.name === appt.service);
        if (service) {
            const earnings = JSON.parse(localStorage.getItem('earnings')) || [];
            earnings.push({
                date: new Date().toLocaleDateString('ro-RO'),
                amount: service.price,
                description: `${appt.service} pentru ${appt.client}`,
                method: 'Cash' // Default, can be changed later
            });
            localStorage.setItem('earnings', JSON.stringify(earnings));
        }
        renderAppointments();
        renderBilling();
    };

    window.cancelAppointment = (index) => {
        appointments[index].status = 'Anulată';
        localStorage.setItem('appointments', JSON.stringify(appointments));
        renderAppointments();
    };

    window.deleteAppointment = (index) => {
        appointments.splice(index, 1);
        localStorage.setItem('appointments', JSON.stringify(appointments));
        renderAppointments();
    };

    // Services
    let services = JSON.parse(localStorage.getItem('services')) || [];

    function renderServices() {
        const list = document.getElementById('servicesList');
        list.innerHTML = '';
        services.forEach((service, index) => {
            if (service.active === false) return;
            const li = document.createElement('li');
            li.className = 'service-item';
            li.innerHTML = `
                <div class="service-info">
                    <strong>${service.name}</strong> - ${service.price} RON (${service.duration} min) - ${service.category}
                </div>
                <div class="service-actions">
                    <button onclick="editService(${index})">Editează</button>
                    <button onclick="deactivateService(${index})">Dezactivează</button>
                </div>
            `;
            list.appendChild(li);
        });
    }

    if (document.getElementById('serviceForm')) {
        const svcForm = document.getElementById('serviceForm');
        svcForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('serviceName').value;
            const price = parseFloat(document.getElementById('servicePrice').value);
            const duration = parseInt(document.getElementById('serviceDuration').value);
            const category = document.getElementById('serviceCategory').value;
            services.push({ name, price, duration, category, active: true });
            localStorage.setItem('services', JSON.stringify(services));
            renderServices();
            populateAppointmentSelects();
            populateBillingSelects();
            svcForm.reset();
            svcForm.style.display = 'none';
        });
    }

    window.editService = (index) => {
        const service = services[index];
        document.getElementById('serviceName').value = service.name;
        document.getElementById('servicePrice').value = service.price;
        document.getElementById('serviceDuration').value = service.duration;
        document.getElementById('serviceCategory').value = service.category;
        document.getElementById('serviceForm').style.display = 'block';
        // For simplicity, edit by replacing
        document.getElementById('serviceForm').addEventListener('submit', function editHandler(e) {
            e.preventDefault();
            services[index] = {
                name: document.getElementById('serviceName').value,
                price: parseFloat(document.getElementById('servicePrice').value),
                duration: parseInt(document.getElementById('serviceDuration').value),
                category: document.getElementById('serviceCategory').value,
                active: true
            };
            localStorage.setItem('services', JSON.stringify(services));
            renderServices();
            populateAppointmentSelects();
            populateBillingSelects();
            document.getElementById('serviceForm').reset();
            document.getElementById('serviceForm').style.display = 'none';
            this.removeEventListener('submit', editHandler);
        }, { once: true });
    };

    window.deactivateService = (index) => {
        services[index].active = false;
        localStorage.setItem('services', JSON.stringify(services));
        renderServices();
        populateAppointmentSelects();
        populateBillingSelects();
    };

    // Billing
    function renderBilling(viewDate = null) {
        const today = viewDate || new Date().toLocaleDateString('ro-RO');
        const earnings = JSON.parse(localStorage.getItem('earnings')) || [];
        const todayEarnings = earnings.filter(e => e.date === today);
        const total = todayEarnings.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const clientsCount = new Set(todayEarnings.map(e => e.description.split(' pentru ')[1])).size;
        // Assuming profit is total for now, can add costs later
        const profit = total;

        document.getElementById('todayTotal').textContent = total.toFixed(2) + ' RON';
        document.getElementById('todayClients').textContent = clientsCount;
        document.getElementById('todayProfit').textContent = profit.toFixed(2) + ' RON';

        const list = document.getElementById('billingList');
        list.innerHTML = '';
        todayEarnings.forEach(entry => {
            const li = document.createElement('li');
            li.className = 'billing-item';
            li.innerHTML = `
                <div class="billing-info">
                    ${entry.description} - ${entry.amount} RON (${entry.method}) - ${entry.date}
                </div>
            `;
            list.appendChild(li);
        });
    }

    function populateBillingSelects() {
        const clientSelect = document.getElementById('billingClient');
        const serviceSelect = document.getElementById('billingService');
        clientSelect.innerHTML = '<option value="">Selectează client</option>';
        serviceSelect.innerHTML = '<option value="">Selectează serviciu</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.name;
            option.textContent = client.name;
            clientSelect.appendChild(option);
        });
        services.filter(s => s.active !== false).forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = `${service.name} - ${service.price} RON`;
            serviceSelect.appendChild(option);
        });
    }

    if (document.getElementById('manualBillingForm')) {
        const billForm = document.getElementById('manualBillingForm');
        billForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const client = document.getElementById('billingClient').value;
            const service = document.getElementById('billingService').value;
            const amount = parseFloat(document.getElementById('billingAmount').value);
            const method = document.getElementById('billingMethod').value;
            const date = document.getElementById('billingDate').value;
            const earnings = JSON.parse(localStorage.getItem('earnings')) || [];
            earnings.push({
                date: new Date(date).toLocaleDateString('ro-RO'),
                amount,
                description: service ? `${service} pentru ${client}` : `Încasare manuală pentru ${client}`,
                method
            });
            localStorage.setItem('earnings', JSON.stringify(earnings));
            renderBilling();
            billForm.reset();
            billForm.style.display = 'none';
        });
    }

    document.getElementById('addAppointmentBtn').addEventListener('click', () => {
        document.getElementById('appointmentFormCard').style.display = document.getElementById('appointmentFormCard').style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('addServiceBtn').addEventListener('click', () => {
        document.getElementById('serviceForm').style.display = document.getElementById('serviceForm').style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('addManualBillingBtn').addEventListener('click', () => {
        document.getElementById('manualBillingForm').style.display = document.getElementById('manualBillingForm').style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('viewPreviousDayBtn').addEventListener('click', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        renderBilling(yesterday.toLocaleDateString('ro-RO'));
    });

    document.getElementById('filterAppointmentStatus').addEventListener('change', renderAppointments);

    // Initial renders
    filteredClients = [...clients];
    renderClients();
    renderAppointments();
    renderServices();
    renderBilling();
    populateAppointmentSelects();
    populateBillingSelects();
}

// Dashboard
if (document.getElementById('totalClients')) {
    const totalClientsEl = document.getElementById('totalClients');
    const todayEarningsEl = document.getElementById('todayEarnings');
    const todayProfitEl = document.getElementById('todayProfit');
    const todayClientsEl = document.getElementById('todayClients');
    const recentListEl = document.getElementById('recentList');

    function loadDashboard() {
        const clients = JSON.parse(localStorage.getItem('clients')) || [];
        totalClientsEl.textContent = clients.length;

        const today = new Date().toDateString();
        const earnings = JSON.parse(localStorage.getItem('earnings')) || [];
        const todayEarnings = earnings.filter(e => new Date(e.date).toDateString() === today);
        const totalEarn = todayEarnings.reduce((sum, e) => sum + e.price, 0);
        const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === today);
        const totalExp = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
        const profit = totalEarn - totalExp;

        todayEarningsEl.textContent = totalEarn + ' RON';
        todayProfitEl.textContent = profit + ' RON';
        todayClientsEl.textContent = new Set(todayEarnings.map(e => e.client)).size;

        // Recent activity
        const recent = [...todayEarnings, ...todayExpenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        recentListEl.innerHTML = recent.map(item => `<li>${item.service || item.desc} - ${item.price || item.amount} RON</li>`).join('');
    }

    loadDashboard();
}

// Earnings
if (document.getElementById('earningsForm')) {
    const earningsForm = document.getElementById('earningsForm');
    const expensesForm = document.getElementById('expensesForm');
    const reportDate = document.getElementById('reportDate');
    const clientSelect = document.getElementById('clientSelect');
    const totalEarningsEl = document.getElementById('totalEarnings');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const netProfitEl = document.getElementById('netProfit');
    const clientsServedEl = document.getElementById('clientsServed');
    const transactionsListEl = document.getElementById('transactionsList');

    let earnings = JSON.parse(localStorage.getItem('earnings')) || [];
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

    function loadClients() {
        const clients = JSON.parse(localStorage.getItem('clients')) || [];
        clientSelect.innerHTML = '<option value="">Client nou</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.name;
            option.textContent = client.name;
            clientSelect.appendChild(option);
        });
    }

    function updateBalance(date) {
        const dayEarnings = earnings.filter(e => e.date === date);
        const dayExpenses = expenses.filter(e => e.date === date);
        const totalEarn = dayEarnings.reduce((sum, e) => sum + e.price, 0);
        const totalExp = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
        const profit = totalEarn - totalExp;
        const clientsServed = new Set(dayEarnings.map(e => e.client)).size;

        totalEarningsEl.textContent = totalEarn + ' RON';
        totalExpensesEl.textContent = totalExp + ' RON';
        netProfitEl.textContent = profit + ' RON';
        clientsServedEl.textContent = clientsServed;

        transactionsListEl.innerHTML = [...dayEarnings, ...dayExpenses].map(item => `<li>${item.service || item.desc} - ${item.price || item.amount} RON (${item.paymentMethod || 'Cheltuială'})</li>`).join('');
    }

    reportDate.value = new Date().toISOString().split('T')[0];
    reportDate.addEventListener('change', () => updateBalance(reportDate.value));

    earningsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const service = document.getElementById('service').value;
        const client = document.getElementById('clientSelect').value;
        const price = parseFloat(document.getElementById('price').value);
        const paymentMethod = document.getElementById('paymentMethod').value;
        const date = reportDate.value;
        earnings.push({ service, client, price, paymentMethod, date });
        localStorage.setItem('earnings', JSON.stringify(earnings));
        updateBalance(date);
        earningsForm.reset();
    });

    expensesForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const desc = document.getElementById('expenseDesc').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const date = reportDate.value;
        expenses.push({ desc, amount, date });
        localStorage.setItem('expenses', JSON.stringify(expenses));
        updateBalance(date);
        expensesForm.reset();
    });

    loadClients();
    updateBalance(reportDate.value);
}

// Settings
if (document.getElementById('servicesForm')) {
    const servicesForm = document.getElementById('servicesForm');
    const servicesListEl = document.getElementById('servicesList');

    let services = JSON.parse(localStorage.getItem('services')) || [];

    function renderServices() {
        servicesListEl.innerHTML = '';
        services.forEach((service, index) => {
            const li = document.createElement('li');
            li.textContent = `${service.name} - ${service.price} RON`;
            servicesListEl.appendChild(li);
        });
    }

    servicesForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('serviceName').value;
        const price = parseFloat(document.getElementById('servicePrice').value);
        services.push({ name, price });
        localStorage.setItem('services', JSON.stringify(services));
        renderServices();
        servicesForm.reset();
    });

    renderServices();
}

// Men clients management
if (document.getElementById('menClientForm')) {
    const menClientForm = document.getElementById('menClientForm');
    const menClientsList = document.getElementById('menClientsList');
    const searchMenInput = document.getElementById('search-men');
    const addMenClientBtn = document.getElementById('addMenClientBtn');
    const filterMenBtn = document.getElementById('filterMenBtn');
    const prevMenBtn = document.getElementById('prevMenBtn');
    const nextMenBtn = document.getElementById('nextMenBtn');
    const pageMenInfo = document.getElementById('pageMenInfo');

    let menClients = JSON.parse(localStorage.getItem('menClients')) || [];
    let filteredMenClients = [...menClients];
    let currentMenPage = 1;
    const itemsPerPage = 6;

    function renderMenClients() {
        const start = (currentMenPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageClients = filteredMenClients.slice(start, end);

        menClientsList.innerHTML = '';
        pageClients.forEach((client, index) => {
            const card = document.createElement('div');
            card.className = 'client-card';
            card.innerHTML = `
                <div class="client-avatar" style="background: #C8A24A; display: flex; align-items: center; justify-content: center; color: #0B0B0E; font-size: 24px;">${client.name.charAt(0)}</div>
                <div class="client-info">
                    <h3>${client.name}</h3>
                    <p>Sumă: ${client.charge} RON</p>
                    <p>Data: ${client.date}</p>
                </div>
                <div class="client-actions">
                    <button class="edit-btn" onclick="editMenClient(${start + index})"><i class="fas fa-edit"></i></button>
                </div>
            `;
            menClientsList.appendChild(card);
        });

        updateMenPagination();
    }

    function updateMenPagination() {
        const total = filteredMenClients.length;
        const start = (currentMenPage - 1) * itemsPerPage + 1;
        const end = Math.min(currentMenPage * itemsPerPage, total);
        pageMenInfo.textContent = `Showing ${start}–${end} of ${total} Clients`;

        prevMenBtn.disabled = currentMenPage === 1;
        nextMenBtn.disabled = currentMenPage === Math.ceil(total / itemsPerPage);
    }

    function filterMenClients() {
        const query = searchMenInput.value.toLowerCase();
        filteredMenClients = menClients.filter(client => client.name.toLowerCase().includes(query));
        currentMenPage = 1;
        renderMenClients();
    }

    menClientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('menClientName').value;
        const charge = document.getElementById('menCharge').value;
        const date = new Date().toLocaleDateString('ro-RO');
        menClients.push({ name, charge: parseFloat(charge), date });
        localStorage.setItem('menClients', JSON.stringify(menClients));
        filteredMenClients = [...menClients];
        renderMenClients();
        menClientForm.reset();
        menClientForm.style.display = 'none';
    });

    searchMenInput.addEventListener('input', filterMenClients);

    addMenClientBtn.addEventListener('click', () => {
        menClientForm.style.display = menClientForm.style.display === 'none' ? 'block' : 'none';
    });

    prevMenBtn.addEventListener('click', () => {
        if (currentMenPage > 1) {
            currentMenPage--;
            renderMenClients();
        }
    });

    nextMenBtn.addEventListener('click', () => {
        if (currentMenPage < Math.ceil(filteredMenClients.length / itemsPerPage)) {
            currentMenPage++;
            renderMenClients();
        }
    });

    window.editMenClient = (index) => {
        const client = menClients[index];
        const newCharge = prompt('Editează sumă:', client.charge);
        if (newCharge !== null && !isNaN(newCharge)) {
            menClients[index].charge = parseFloat(newCharge);
            localStorage.setItem('menClients', JSON.stringify(menClients));
            filteredMenClients = [...menClients];
            renderMenClients();
        }
    };

    // Initial render
    filteredMenClients = [...menClients];
    renderMenClients();
}