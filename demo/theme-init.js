// Runs synchronously at the start of <head>, before styles and meaningful paint.
(function () {
    let dark = true;
    try {
        const saved = localStorage.getItem('dark-mode');
        dark = saved === null || saved === 'true';
    } catch (_) { /* Storage denied: retain the existing dark-by-default policy. */ }
    document.documentElement.classList.toggle('dark-mode', dark);
}());
