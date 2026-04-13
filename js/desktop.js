document.addEventListener("DOMContentLoaded", () => {
    const modules = Array.from(document.querySelectorAll('.module'));
    const scatterBtn = document.getElementById('scatter-btn');
    let zIndexCounter = 10;

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function shuffle(list) {
        const cloned = [...list];

        for (let i = cloned.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
        }

        return cloned;
    }

    function getWorkspace(vw, vh, padding) {
        const desiredWidth = vw < 640
            ? vw - padding * 2
            : vw < 1100
                ? vw * 0.84
                : vw * 0.78;
        const desiredHeight = vh < 760 ? vh * 0.74 : vh * 0.68;
        const width = clamp(desiredWidth, 320, vw - padding * 2);
        const height = clamp(desiredHeight, 320, vh - padding * 2 - 88);
        const left = Math.max(padding, (vw - width) / 2);
        const top = clamp((vh - height) / 2 - 18, padding + 20, vh - height - padding - 44);

        return { left, top, width, height };
    }

    function buildCells(workspace, vw) {
        const cols = vw < 820 ? 2 : 3;
        const rows = cols === 2 ? 3 : 2;
        const innerWidth = Math.max(0, workspace.width);
        const innerHeight = Math.max(0, workspace.height);
        const cellWidth = innerWidth / cols;
        const cellHeight = innerHeight / rows;
        const cells = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                cells.push({
                    left: workspace.left + col * cellWidth,
                    top: workspace.top + row * cellHeight,
                    width: cellWidth,
                    height: cellHeight
                });
            }
        }

        return shuffle(cells);
    }

    function getOverlapArea(a, b) {
        const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return overlapWidth * overlapHeight;
    }

    function getDistance(a, b) {
        return Math.hypot(a.centerX - b.centerX, a.centerY - b.centerY);
    }

    function getRect(x, y, width, height) {
        return {
            left: x,
            top: y,
            right: x + width,
            bottom: y + height,
            centerX: x + width / 2,
            centerY: y + height / 2
        };
    }

    function createCandidate(rect, cell, vw, vh, padding, isCentered = false) {
        const cellInset = vw < 600 ? 12 : 20;
        const minX = padding;
        const minY = padding;
        const maxX = Math.max(minX, vw - rect.width - padding);
        const maxY = Math.max(minY, vh - rect.height - padding);

        const slotMinX = clamp(cell.left + cellInset, minX, maxX);
        const slotMaxX = clamp(cell.left + cell.width - rect.width - cellInset, minX, maxX);
        const slotMinY = clamp(cell.top + cellInset, minY, maxY);
        const slotMaxY = clamp(cell.top + cell.height - rect.height - cellInset, minY, maxY);

        const x = isCentered || slotMaxX <= slotMinX
            ? (slotMinX + slotMaxX) / 2
            : slotMinX + Math.random() * (slotMaxX - slotMinX);
        const y = isCentered || slotMaxY <= slotMinY
            ? (slotMinY + slotMaxY) / 2
            : slotMinY + Math.random() * (slotMaxY - slotMinY);

        return getRect(x, y, rect.width, rect.height);
    }

    function scoreCandidate(candidate, placedRects) {
        if (!placedRects.length) {
            return 0;
        }

        let minDistance = Infinity;
        let overlapPenalty = 0;

        placedRects.forEach(placed => {
            minDistance = Math.min(minDistance, getDistance(candidate, placed));
            overlapPenalty += getOverlapArea(candidate, placed);
        });

        return minDistance - overlapPenalty * 0.35;
    }

    function scatterModules() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const padding = vw < 600 ? 16 : 40;
        const workspace = getWorkspace(vw, vh, padding);
        const cells = buildCells(workspace, vw);
        const placedRects = [];
        const placements = new Map();
        const sortedModules = [...modules].sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            return rectB.width * rectB.height - rectA.width * rectA.height;
        });

        sortedModules.forEach((mod, index) => {
            const rect = mod.getBoundingClientRect();
            const availableCells = cells.length ? cells : buildCells(workspace, vw);
            let bestCandidate = null;
            let bestCellIndex = 0;

            availableCells.forEach((cell, cellIndex) => {
                const variants = [createCandidate(rect, cell, vw, vh, padding, true)];

                for (let i = 0; i < 10; i++) {
                    variants.push(createCandidate(rect, cell, vw, vh, padding, false));
                }

                variants.forEach(candidate => {
                    const score = scoreCandidate(candidate, placedRects) + Math.random() * 12 - index * 2;

                    if (!bestCandidate || score > bestCandidate.score) {
                        bestCandidate = { ...candidate, score };
                        bestCellIndex = cellIndex;
                    }
                });
            });

            if (!bestCandidate) return;

            const randomRot = (Math.random() - 0.5) * 8;
            placements.set(mod, {
                left: bestCandidate.left,
                top: bestCandidate.top,
                rot: randomRot
            });
            placedRects.push(bestCandidate);
            cells.splice(bestCellIndex, 1);
        });

        modules.forEach(mod => {
            const placement = placements.get(mod);
            if (!placement) return;

            mod.style.left = `${placement.left}px`;
            mod.style.top = `${placement.top}px`;
            mod.dataset.rot = placement.rot;
            mod.style.transform = `rotate(${placement.rot}deg)`;
        });
    }

    setTimeout(scatterModules, 50);

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(scatterModules, 200);
    });

    if (scatterBtn) scatterBtn.addEventListener('click', scatterModules);

    modules.forEach(mod => {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const startDrag = (e) => {
            if (e.target.tagName.toLowerCase() === 'a' || e.target.tagName.toLowerCase() === 'button') return;

            isDragging = true;
            zIndexCounter++;
            mod.style.zIndex = zIndexCounter;

            const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

            startX = clientX;
            startY = clientY;
            initialLeft = mod.offsetLeft;
            initialTop = mod.offsetTop;

            mod.classList.add('dragging');
            mod.style.transform = `rotate(0deg) scale(1.02)`;
        };

        const onDrag = (e) => {
            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();

            const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

            mod.style.left = `${initialLeft + (clientX - startX)}px`;
            mod.style.top = `${initialTop + (clientY - startY)}px`;
        };

        const stopDrag = () => {
            if (isDragging) {
                isDragging = false;
                mod.classList.remove('dragging');
                const newRot = (Math.random() - 0.5) * 8;
                mod.dataset.rot = newRot;
                mod.style.transform = `rotate(${newRot}deg) scale(1)`;
            }
        };

        mod.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onDrag, { passive: false });
        document.addEventListener('mouseup', stopDrag);

        mod.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', stopDrag);
    });
});
