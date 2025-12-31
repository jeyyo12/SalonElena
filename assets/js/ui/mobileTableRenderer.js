/**
 * Mobile Table Renderer
 * Transforms tables to card-based layout on mobile devices
 * Auto-applies responsive behavior via CSS media queries
 */

import DOM from '../core/dom.js';

const MobileTableRenderer = {
    /**
     * Initialize mobile table rendering
     * Watches for tables and applies responsive classes
     */
    init() {
        // Apply classes to tables for CSS media queries to handle
        const tables = document.querySelectorAll('.data-table');
        tables.forEach(table => {
            table.setAttribute('data-mobile-responsive', 'true');
        });
    },

    /**
     * Wrap table in mobile-responsive container
     * @param {HTMLElement} table - The table element
     */
    wrapTable(table) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrap';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    },

    /**
     * Convert table data to card rows for mobile display
     * @param {Array} data - Array of row objects
     * @param {Array} columns - Array of column config {key, label}
     * @param {Function} actionsHtml - Function to generate action buttons
     * @returns {HTMLElement} - Container with card rows
     */
    createCardRows(data, columns, actionsHtml = null) {
        const container = document.createElement('div');
        container.className = 'row-cards-container';

        if (data.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>Nu sunt date disponibile</p></div>`;
            return container;
        }

        // Add header row (visible only on desktop)
        const headerRow = document.createElement('div');
        headerRow.className = 'row-card header';
        columns.forEach(col => {
            const cellLabel = document.createElement('div');
            cellLabel.className = 'row-cell';
            cellLabel.textContent = col.label;
            headerRow.appendChild(cellLabel);
        });
        container.appendChild(headerRow);

        // Add data rows as cards
        data.forEach((row, index) => {
            const cardRow = document.createElement('div');
            cardRow.className = 'row-card';
            cardRow.setAttribute('data-row-index', index);

            // Add cells
            columns.forEach(col => {
                const cell = document.createElement('div');
                cell.className = 'row-cell';

                const label = document.createElement('div');
                label.className = 'row-cell-label';
                label.textContent = col.label;

                const value = document.createElement('div');
                value.className = 'row-cell-value';
                value.innerHTML = typeof col.render === 'function' 
                    ? col.render(row[col.key], row) 
                    : (row[col.key] || '—');

                cell.appendChild(label);
                cell.appendChild(value);
                cardRow.appendChild(cell);
            });

            // Add actions if provided
            if (actionsHtml) {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'row-actions';
                actionsDiv.innerHTML = typeof actionsHtml === 'function'
                    ? actionsHtml(row, index)
                    : actionsHtml;
                cardRow.appendChild(actionsDiv);
            }

            container.appendChild(cardRow);
        });

        return container;
    },

    /**
     * Create a responsive table that shows as card layout on mobile
     * @param {Array} data - Data to display
     * @param {Array} columns - Column definitions
     * @param {Array|Function} actions - Action buttons config
     * @returns {HTMLElement}
     */
    createResponsiveTable(data, columns, actions = null) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrap';

        // For mobile, we'll use CSS to hide table and show cards
        // Add data-attributes for CSS to hook into
        wrapper.setAttribute('data-mobile-table', 'true');

        // Create traditional table (hidden on mobile via CSS)
        const table = document.createElement('table');
        table.className = 'data-table';
        table.setAttribute('data-responsive', 'true');

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.label;
            headerRow.appendChild(th);
        });
        if (actions) {
            const th = document.createElement('th');
            th.textContent = 'Acțiuni';
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        if (data.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = columns.length + (actions ? 1 : 0);
            td.className = 'text-center text-muted';
            td.textContent = 'Nu sunt date disponibile';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            data.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');

                columns.forEach(col => {
                    const td = document.createElement('td');
                    td.innerHTML = typeof col.render === 'function'
                        ? col.render(row[col.key], row)
                        : (row[col.key] || '—');
                    tr.appendChild(td);
                });

                if (actions) {
                    const td = document.createElement('td');
                    td.className = 'text-center';
                    if (typeof actions === 'function') {
                        td.innerHTML = actions(row, rowIndex);
                    } else {
                        td.innerHTML = actions;
                    }
                    tr.appendChild(td);
                }

                tbody.appendChild(tr);
            });
        }
        table.appendChild(tbody);

        wrapper.appendChild(table);

        // Also add card layout version (shown on mobile)
        // This is created via CSS media query display toggling
        // The card layout is generated by JavaScript in feature modules

        return wrapper;
    }
};

export default MobileTableRenderer;
