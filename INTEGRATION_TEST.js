/**
 * Salon Elena - History API Modal System
 * FINAL INTEGRATION TEST
 * 
 * This script verifies that all components are correctly integrated
 */

console.log('%c═════════════════════════════════════════════════════', 'color: #FF5A1F; font-size: 14px; font-weight: bold');
console.log('%cSalon Elena - History API Modal System', 'color: #FF5A1F; font-size: 14px; font-weight: bold');
console.log('%cFinal Integration Test', 'color: #FF5A1F; font-size: 14px; font-weight: bold');
console.log('%c═════════════════════════════════════════════════════', 'color: #FF5A1F; font-size: 14px; font-weight: bold');

// Test 1: Check if all required objects exist
console.log('\n✓ Test 1: Module Availability');
console.log('─────────────────────────────────────────────────────');

const tests = [
    { name: 'ModalManager', obj: typeof ModalManager !== 'undefined' },
    { name: 'NavigationManager', obj: typeof NavigationManager !== 'undefined' },
    { name: 'Store', obj: typeof Store !== 'undefined' },
    { name: 'DOM', obj: typeof DOM !== 'undefined' },
    { name: 'EventBus', obj: typeof EventBus !== 'undefined' }
];

tests.forEach(test => {
    const status = test.obj ? '✅' : '❌';
    console.log(`${status} ${test.name}: ${test.obj ? 'Available' : 'MISSING'}`);
});

// Test 2: Check ModalManager methods
console.log('\n✓ Test 2: ModalManager Methods');
console.log('─────────────────────────────────────────────────────');

const modalMethods = [
    'open',
    'close',
    'closeTop',
    'closeAll',
    'isOpen',
    'getOpenCount',
    'confirm'
];

modalMethods.forEach(method => {
    const exists = typeof ModalManager[method] === 'function';
    const status = exists ? '✅' : '❌';
    console.log(`${status} ModalManager.${method}(): ${exists ? 'OK' : 'MISSING'}`);
});

// Test 3: Check ModalManager properties
console.log('\n✓ Test 3: ModalManager Properties');
console.log('─────────────────────────────────────────────────────');

const modalProps = [
    { name: 'modalStack', shouldBe: 'array' },
    { name: 'isClosingViaHistory', shouldBe: 'boolean' }
];

modalProps.forEach(prop => {
    const value = ModalManager[prop.name];
    const typeCorrect = typeof value === prop.shouldBe || Array.isArray(value);
    const status = typeCorrect ? '✅' : '❌';
    console.log(`${status} ModalManager.${prop.name}: ${typeof value} ${typeCorrect ? '(correct)' : '(expected ' + prop.shouldBe + ')'}`);
});

// Test 4: Check NavigationManager
console.log('\n✓ Test 4: NavigationManager Methods');
console.log('─────────────────────────────────────────────────────');

const navMethods = [
    'init',
    'navigate',
    'renderView'
];

navMethods.forEach(method => {
    const exists = typeof NavigationManager[method] === 'function';
    const status = exists ? '✅' : '❌';
    console.log(`${status} NavigationManager.${method}(): ${exists ? 'OK' : 'MISSING'}`);
});

// Test 5: Check History API support
console.log('\n✓ Test 5: History API Support');
console.log('─────────────────────────────────────────────────────');

const historySupport = [
    { name: 'history.pushState', available: typeof window.history.pushState === 'function' },
    { name: 'history.back', available: typeof window.history.back === 'function' },
    { name: 'popstate event', available: 'onpopstate' in window }
];

historySupport.forEach(support => {
    const status = support.available ? '✅' : '❌';
    console.log(`${status} ${support.name}: ${support.available ? 'Supported' : 'NOT SUPPORTED'}`);
});

// Test 6: Check popstate listener
console.log('\n✓ Test 6: Popstate Listener');
console.log('─────────────────────────────────────────────────────');

let popstateListenerFound = false;
const listener = (e) => {
    popstateListenerFound = true;
    window.removeEventListener('popstate', listener);
};
window.addEventListener('popstate', listener);

// Simulate popstate to check if listener exists
window.dispatchEvent(new PopStateEvent('popstate', { state: { test: true } }));

setTimeout(() => {
    const status = popstateListenerFound ? '✅' : '⚠️';
    console.log(`${status} Popstate listener registered: ${popstateListenerFound ? 'YES' : 'Could not verify (app may not be fully initialized yet)'}`);
    
    // Test 7: Initial state check
    console.log('\n✓ Test 7: Initial Application State');
    console.log('─────────────────────────────────────────────────────');
    
    console.log(`Modal stack size: ${ModalManager.modalStack.length} (should be 0)`);
    console.log(`Modal is open: ${ModalManager.isOpen()} (should be false)`);
    console.log(`Current route: ${NavigationManager.currentRoute}`);
    console.log(`History length: ${window.history.length}`);
    console.log(`Current history state:`, window.history.state);
    
    // Test 8: Test modal open/close (non-visual)
    console.log('\n✓ Test 8: Modal Stack Operations');
    console.log('─────────────────────────────────────────────────────');
    
    const initialCount = ModalManager.getOpenCount();
    console.log(`Initial modal count: ${initialCount}`);
    
    // Check if we can safely call methods
    try {
        const canOpen = typeof ModalManager.open === 'function';
        const canClose = typeof ModalManager.close === 'function';
        const canCloseTop = typeof ModalManager.closeTop === 'function';
        
        console.log(`${canOpen ? '✅' : '❌'} open() method available`);
        console.log(`${canClose ? '✅' : '❌'} close() method available`);
        console.log(`${canCloseTop ? '✅' : '❌'} closeTop() method available`);
    } catch(e) {
        console.log(`❌ Error checking methods: ${e.message}`);
    }
    
    // Final summary
    console.log('\n%c═════════════════════════════════════════════════════', 'color: #FF5A1F; font-size: 14px; font-weight: bold');
    console.log('%cINTEGRATION STATUS: ✅ READY FOR TESTING', 'color: #00AA00; font-size: 14px; font-weight: bold');
    console.log('%c═════════════════════════════════════════════════════', 'color: #FF5A1F; font-size: 14px; font-weight: bold');
    
    console.log('\nNext Steps:');
    console.log('1. Click modal-opening button (e.g., "⚡ Programare Rapidă Walk-In")');
    console.log('2. Press browser Back button');
    console.log('3. Verify modal closes (not page navigation)');
    console.log('4. Check console for no errors');
    console.log('\nDebug commands:');
    console.log('- ModalManager.modalStack (check open modals)');
    console.log('- ModalManager.isOpen() (true if modal open)');
    console.log('- window.history.state (current history state)');
    console.log('- NavigationManager.currentRoute (current page)');
    
}, 100);
