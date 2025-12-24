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

    // Initial render
    filteredClients = [...clients];
    renderClients();
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