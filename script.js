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

    function renderClients() {
        clientsList.innerHTML = '';
        clients.forEach((client, index) => {
            const clientDiv = document.createElement('div');
            clientDiv.style.cssText = 'background: rgba(42, 42, 42, 0.9); padding: 1.5rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); margin-bottom: 1rem; transform: rotateX(0.5deg); transition: transform 0.3s;';
            clientDiv.innerHTML = `
                <h3 style="margin-top: 0;">${client.name}</h3>
                <img src="${client.image || 'https://via.placeholder.com/100?text=Fără+Imagine'}" alt="${client.name}" style="width:100px; height:100px; border-radius:10px; margin-bottom:1rem;">
                <label for="work${index}">Lucrări efectuate:</label>
                <textarea id="work${index}" rows="4" style="width: 100%; padding: 0.5rem; border: 2px solid #7b1fa2; border-radius: 10px; background-color: #2a2a2a; color: #e0e0e0; font-family: 'Georgia', serif; font-size: 1rem; resize: vertical;">${client.work || ''}</textarea>
                <button onclick="saveWork(${index})" style="margin-top: 0.5rem;">Salvează Lucrări</button>
                <button onclick="removeClient(${index})" style="margin-top: 0.5rem;">Șterge Client</button>
            `;
            clientDiv.onmouseover = () => clientDiv.style.transform = 'rotateX(0deg) translateZ(5px)';
            clientDiv.onmouseout = () => clientDiv.style.transform = 'rotateX(0.5deg)';
            clientsList.appendChild(clientDiv);
        });
    }

    clientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('clientName').value;
        const image = document.getElementById('clientImage').value;
        clients.push({ name, work: '', image });
        localStorage.setItem('clients', JSON.stringify(clients));
        renderClients();
        clientForm.reset();
    });

    window.saveWork = (index) => {
        const work = document.getElementById(`work${index}`).value;
        clients[index].work = work;
        localStorage.setItem('clients', JSON.stringify(clients));
        alert('Lucrări salvate!');
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