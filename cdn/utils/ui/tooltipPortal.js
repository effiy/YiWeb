/**
 * Portal tooltip — renders at document.body level to bypass CSS stacking contexts.
 * Automatically activates for any element with [data-tooltip] attribute.
 */
(function () {
    if (typeof document === 'undefined') return;

    let el = null;
    let timer = null;

    function ensure() {
        if (!el) {
            el = document.createElement('div');
            el.style.cssText =
                'position:fixed;z-index:2147483647;pointer-events:none;opacity:0;' +
                'transition:opacity 0.12s ease;padding:6px 10px;' +
                'background:var(--yi-bg-tertiary,#1f2937);color:var(--yi-text-primary,#f9fafb);' +
                'font-size:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
                'border-radius:6px;white-space:nowrap;' +
                'border:1px solid var(--yi-border-primary,#374151);' +
                'box-shadow:0 4px 16px rgba(0,0,0,0.28);';
            document.body.appendChild(el);
        }
        return el;
    }

    function show(btn) {
        clearTimeout(timer);
        const text = btn.getAttribute('data-tooltip');
        if (!text) return;
        const tip = ensure();
        tip.textContent = text;
        const r = btn.getBoundingClientRect();
        tip.style.left = (r.left + r.width / 2) + 'px';
        tip.style.top = (r.bottom + 8) + 'px';
        tip.style.transform = 'translateX(-50%)';
        tip.style.opacity = '1';
    }

    function hide() {
        timer = setTimeout(function () {
            if (el) el.style.opacity = '0';
        }, 80);
    }

    document.addEventListener('mouseover', function (e) {
        var btn = e.target.closest('[data-tooltip]');
        if (btn) show(btn);
    }, true);

    document.addEventListener('mouseout', function (e) {
        var btn = e.target.closest('[data-tooltip]');
        if (btn) hide();
    }, true);
})();
