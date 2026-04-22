export function initTabs() {
    const tabs = document.querySelectorAll('[role="tab"]');
    const panels = document.querySelectorAll('[role="tabpanel"]');

    function activateTab(tab) {
        tabs.forEach(t => {
            const selected = t === tab;
            t.setAttribute('aria-selected', selected);
            t.setAttribute('tabindex', selected ? '0' : '-1');
        });
        panels.forEach(p => {
            p.hidden = (p.id !== tab.getAttribute('aria-controls'));
        });
        tab.focus();
    }

    tabs.forEach(t => {
        t.addEventListener('click', () => activateTab(t));
        t.addEventListener('keydown', (e) => {
            const currentIndex = Array.prototype.indexOf.call(tabs, document.activeElement);
            if (e.key === 'ArrowRight') { e.preventDefault(); activateTab(tabs[(currentIndex + 1) % tabs.length]); }
            if (e.key === 'ArrowLeft')  { e.preventDefault(); activateTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length]); }
        });
    });
}
