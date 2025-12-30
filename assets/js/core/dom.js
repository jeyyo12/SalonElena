/**
 * DOM Utilities
 */
const DOM = {
    get(selector) {
        return document.querySelector(selector);
    },

    getAll(selector) {
        return document.querySelectorAll(selector);
    },

    create(tag, className = '', html = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (html) el.innerHTML = html;
        return el;
    },

    append(parent, child) {
        if (typeof parent === 'string') {
            parent = this.get(parent);
        }
        if (Array.isArray(child)) {
            child.forEach(c => parent.appendChild(c));
        } else {
            parent.appendChild(child);
        }
    },

    setHTML(selector, html) {
        const el = this.get(selector);
        if (el) el.innerHTML = html;
    },

    addClass(el, className) {
        if (typeof el === 'string') el = this.get(el);
        el?.classList.add(className);
    },

    removeClass(el, className) {
        if (typeof el === 'string') el = this.get(el);
        el?.classList.remove(className);
    },

    hasClass(el, className) {
        if (typeof el === 'string') el = this.get(el);
        return el?.classList.contains(className) ?? false;
    },

    toggleClass(el, className) {
        if (typeof el === 'string') el = this.get(el);
        el?.classList.toggle(className);
    },

    on(selector, event, callback) {
        if (typeof selector === 'string') {
            selector = this.get(selector);
        }
        if (selector) {
            selector.addEventListener(event, callback);
        }
    },

    off(selector, event, callback) {
        if (typeof selector === 'string') {
            selector = this.get(selector);
        }
        if (selector) {
            selector.removeEventListener(event, callback);
        }
    }
};

export default DOM;
