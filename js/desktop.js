document.addEventListener('DOMContentLoaded', () => {
    const workspace = document.querySelector('.desktop-workspace');
    if (!workspace) return;
    const cards = Array.from(workspace.querySelectorAll('.module'));
    const desktop = window.matchMedia('(min-width: 1051px) and (pointer: fine)');
    let drag = null;
    const place = (card, x = 0, y = 0) => {
        card.style.setProperty('--desk-x', `${x}px`);
        card.style.setProperty('--desk-y', `${y}px`);
    };
    const reset = () => {
        if (drag) finish(true);
        cards.forEach(card => place(card));
    };
    const overlaps = (a, b) => a.left < b.right + 12 && a.right > b.left - 12 && a.top < b.bottom + 12 && a.bottom > b.top - 12;
    function finish(cancel = false) {
        if (!drag) return;
        const { card, x, y, pointerId } = drag;
        const rect = card.getBoundingClientRect();
        const bounds = workspace.getBoundingClientRect();
        const outside = rect.left < bounds.left - 12 || rect.right > bounds.right + 12 || rect.top < 80 || rect.bottom > bounds.bottom + 12;
        if (cancel || outside || cards.some(other => other !== card && overlaps(rect, other.getBoundingClientRect()))) place(card, x, y);
        card.classList.remove('dragging');
        card.style.removeProperty('z-index');
        if (card.hasPointerCapture(pointerId)) card.releasePointerCapture(pointerId);
        drag = null;
    }
    cards.forEach(card => {
        card.addEventListener('pointerdown', event => {
            if (!desktop.matches || event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a, button, input, summary')) return;
            // Drag from headings or margins; keep article text selectable.
            if (event.target.closest('p, .post-item, .tag-list')) return;
            drag = {
                card, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
                x: parseFloat(card.style.getPropertyValue('--desk-x')) || 0,
                y: parseFloat(card.style.getPropertyValue('--desk-y')) || 0
            };
            card.setPointerCapture(event.pointerId);
            card.classList.add('dragging');
            card.style.zIndex = '10';
            event.preventDefault();
        });
        card.addEventListener('pointermove', event => {
            if (!drag || drag.card !== card) return;
            place(card, drag.x + event.clientX - drag.startX, drag.y + event.clientY - drag.startY);
        });
        card.addEventListener('pointerup', () => finish());
        card.addEventListener('pointercancel', () => finish(true));
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') finish(true); });
    document.getElementById('scatter-btn')?.addEventListener('click', reset);
    window.addEventListener('resize', reset);
    desktop.addEventListener('change', reset);
    new ResizeObserver(reset).observe(workspace);
});
