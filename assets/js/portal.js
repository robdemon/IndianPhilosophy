document.addEventListener('DOMContentLoaded', () => {
            const tabBtns = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');

            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    tabBtns.forEach(b => b.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));

                    btn.classList.add('active');
                    const targetId = btn.getAttribute('data-target');
                    document.getElementById(targetId).classList.add('active');
                });
            });
        });

function openDarshana(system) {
    const iframe = document.getElementById('darshana-iframe');
    const iwin   = iframe.contentWindow;
    // If darshana_3.html is already loaded, call showSystem directly
    if (iwin && typeof iwin.showSystem === 'function') {
        iwin.showSystem(system);
    } else {
        // Not yet loaded — set src with hash so it auto-selects on load
        iframe.src = 'Temp/darshana_3.html?v=20260515#' + system;
    }
    document.querySelector('[data-target="darshana-tab"]').click();
}
