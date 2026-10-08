document.addEventListener('DOMContentLoaded', function () {
    const root = document.documentElement;
    const button = document.getElementById('dark-mode-toggle');
    if (!button) return;
    function updateButton() {
        const dark = root.classList.contains('dark-mode');
        button.textContent = dark ? 'Light' : 'Dark';
        button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        button.classList.toggle('light-button', dark);
        button.classList.toggle('dark-button', !dark);
    }
    updateButton();
    root.classList.add('tebla-theme-ready');
    button.addEventListener('click', function () {
        root.classList.toggle('dark-mode');
        try { localStorage.setItem('dark-mode', root.classList.contains('dark-mode')); }
        catch (_) { /* The current-page toggle still works without persistence. */ }
        updateButton();
    });
});
