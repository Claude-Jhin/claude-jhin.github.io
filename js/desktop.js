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
    let arrangement = 0;
    let frame = 0;
    const arrangements = [
        [['profile', 'nav'], ['posts'], ['tags', 'quote', 'contact']],
        [['quote', 'tags', 'contact'], ['posts'], ['profile', 'nav']],
        [['nav', 'profile'], ['posts'], ['contact', 'tags', 'quote']]
    ];
    const arrange = () => {
        if (drag) finish(true);
        workspace.classList.toggle('is-scattered', desktop.matches);
        if (!desktop.matches) {
            workspace.style.removeProperty('height');
            cards.forEach(card => {
                card.style.removeProperty('width');
                card.style.removeProperty('--desk-angle');
                place(card);
            });
            return;
        }
        // Pack rotated card bounds into separate lanes. Every layout has real
        // breathing room, even after a font change or with longer article titles.
        const gap = 36;
        const available = workspace.clientWidth - 48 - gap * 2;
        const widths = [available * .28, available * .44, available * .28];
        let left = 24;
        let bottom = 0;
        arrangements[arrangement].forEach((lane, column) => {
            let top = [12, 46, 28][(column + arrangement) % 3];
            lane.forEach((name, row) => {
                const card = workspace.querySelector('.mod-' + name);
                if (!card) return;
                const angle = ((column + row + arrangement) % 2 ? 1 : -1) * (name === 'posts' ? .7 : 1.6 + row * .35);
                const width = widths[column] - 18 - (row % 2) * 8;
                card.style.width = `${width}px`;
                card.style.setProperty('--desk-angle', `${angle}deg`);
                const height = card.offsetHeight;
                const radians = Math.abs(angle) * Math.PI / 180;
                const rotatedHeight = height * Math.cos(radians) + width * Math.sin(radians);
                const x = left + (widths[column] - width) / 2;
                const y = top + (rotatedHeight - height) / 2;
                place(card, x, y);
                top += rotatedHeight + gap;
                bottom = Math.max(bottom, top);
            });
            left += widths[column] + gap;
        });
        workspace.style.height = `${bottom}px`;
    };
    const scheduleLayout = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(arrange);
    };
    const overlaps = (a, b) => a.left < b.right + 12 && a.right > b.left - 12 && a.top < b.bottom + 12 && a.bottom > b.top - 12;
    function finish(cancel = false) {
        if (!drag) return;
        const { card, x, y, pointerId } = drag;
        const rect = card.getBoundingClientRect();
        const bounds = workspace.getBoundingClientRect();
        const outside = rect.left < bounds.left - 12 || rect.right > bounds.right + 12 || rect.top < bounds.top - 12 || rect.bottom > bounds.bottom + 12;
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
    document.getElementById('scatter-btn')?.addEventListener('click', () => {
        arrangement = (arrangement + 1) % arrangements.length;
        arrange();
    });
    window.addEventListener('resize', scheduleLayout);
    desktop.addEventListener('change', scheduleLayout);
    const observer = new ResizeObserver(scheduleLayout);
    cards.forEach(card => observer.observe(card));
    document.fonts.ready.then(scheduleLayout);
    arrange();
});
