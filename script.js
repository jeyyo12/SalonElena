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
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageClients = filteredClients.slice(start, end);

        clientsList.innerHTML = '';
        pageClients.forEach((client, index) => {
            const card = document.createElement('div');
            card.className = 'client-card';
            card.innerHTML = `
                <img src="${client.image ? `images/${client.image}.jpg` : 'https://via.placeholder.com/56?text=No+Img'}" alt="${client.name}" class="client-avatar">
                <div class="client-info">
                    <h3>${client.name}</h3>
                    <p>Lucrări: ${client.work || 'N/A'}</p>
                </div>
                <div class="client-actions">
                    <button class="edit-btn" onclick="editClient(${start + index})"><i class="fas fa-edit"></i></button>
                </div>
            `;
            clientsList.appendChild(card);
        });

        updatePagination();
    }

    function updatePagination() {
        const total = filteredClients.length;
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
        const image = document.getElementById('clientImage').value;
        clients.push({ name, work: '', image });
        localStorage.setItem('clients', JSON.stringify(clients));
        filteredClients = [...clients];
        renderClients();
        clientForm.reset();
        clientForm.style.display = 'none';
    });

    searchInput.addEventListener('input', filterClients);

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

// Men haircuts
if (document.getElementById('menClientForm')) {
    const menClientForm = document.getElementById('menClientForm');
    const menTable = document.getElementById('menTable').querySelector('tbody');

    let menClients = JSON.parse(localStorage.getItem('menClients')) || [];

    function renderMenClients() {
        menTable.innerHTML = '';
        menClients.forEach((client, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.name}</td>
                <td>${client.charge} RON</td>
                <td>${client.date}</td>
            `;
            menTable.appendChild(row);
        });
    }

    menClientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('menClientName').value;
        const charge = document.getElementById('charge').value;
        const date = new Date().toLocaleDateString('ro-RO');
        menClients.push({ name, charge: parseFloat(charge), date });
        localStorage.setItem('menClients', JSON.stringify(menClients));
        renderMenClients();
        menClientForm.reset();
    });

    renderMenClients();
}