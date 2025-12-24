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

    let clients = JSON.parse(localStorage.getItem('clients')) || [];

    const services = ['Tuns', 'Vopsit', 'Tratament', 'Coafat'];

    function renderClients() {
        clientsList.innerHTML = '';
        clients.forEach((client, index) => {
            const clientDiv = document.createElement('div');
            clientDiv.innerHTML = `
                <h3>${client.name}</h3>
                <ul>
                    ${services.map(service => `
                        <li>
                            <label>
                                <input type="checkbox" ${client.services[service] ? 'checked' : ''} onchange="toggleService(${index}, '${service}')">
                                ${service}
                            </label>
                        </li>
                    `).join('')}
                </ul>
                <button onclick="removeClient(${index})">Șterge Client</button>
            `;
            clientsList.appendChild(clientDiv);
        });
    }

    clientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('clientName').value;
        const servicesObj = {};
        services.forEach(s => servicesObj[s] = false);
        clients.push({ name, services: servicesObj });
        localStorage.setItem('clients', JSON.stringify(clients));
        renderClients();
        clientForm.reset();
    });

    window.toggleService = (clientIndex, service) => {
        clients[clientIndex].services[service] = !clients[clientIndex].services[service];
        localStorage.setItem('clients', JSON.stringify(clients));
    };

    window.removeClient = (index) => {
        clients.splice(index, 1);
        localStorage.setItem('clients', JSON.stringify(clients));
        renderClients();
    };

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