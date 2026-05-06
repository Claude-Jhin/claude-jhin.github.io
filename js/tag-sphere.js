(function() {
    const viewports = document.querySelectorAll('[data-tag-sphere]');
    if (!viewports.length) return;

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const lerp = (start, end, amount) => start + (end - start) * amount;

    viewports.forEach(viewport => {
        const tags = Array.from(viewport.querySelectorAll('.tag-sphere-link'));
        if (!tags.length) return;

        let centerX = 0;
        let centerY = 0;
        let radiusX = 0;
        let radiusY = 0;
        let radiusZ = 0;
        let depth = 0;
        let points = [];
        let hoveredPoint = null;
        let dragging = false;
        let lastPointerX = 0;
        let lastPointerY = 0;
        let pointerBiasX = 0;
        let pointerBiasY = 0;
        let spinX = -0.00125;
        let spinY = 0.0021;
        let rafId = 0;

        const rotate = (point, angleX, angleY) => {
            const cosY = Math.cos(angleY);
            const sinY = Math.sin(angleY);
            const rotatedX = point.x * cosY - point.z * sinY;
            const rotatedZ = point.x * sinY + point.z * cosY;

            const cosX = Math.cos(angleX);
            const sinX = Math.sin(angleX);
            const rotatedY = point.y * cosX - rotatedZ * sinX;
            const finalZ = point.y * sinX + rotatedZ * cosX;

            point.x = rotatedX;
            point.y = rotatedY;
            point.z = finalZ;
        };

        const seedPoints = () => {
            const width = viewport.clientWidth;
            const height = viewport.clientHeight;

            centerX = width / 2;
            centerY = height / 2;

            const baseRadius = Math.max(120, Math.min(width, height) * 0.29);
            radiusX = baseRadius * 1.14;
            radiusY = baseRadius * 0.76;
            radiusZ = baseRadius * 0.94;
            depth = baseRadius * 3.4;

            points = tags.map((tag, index) => {
                const t = (index + 0.5) / tags.length;
                const inclination = Math.acos(1 - 2 * t);
                const azimuth = goldenAngle * index;

                const point = {
                    x: radiusX * Math.sin(inclination) * Math.cos(azimuth),
                    y: radiusY * Math.cos(inclination),
                    z: radiusZ * Math.sin(inclination) * Math.sin(azimuth),
                    tag
                };

                rotate(point, -0.42, 0.24);
                return point;
            });
        };

        const updateActiveState = activePoint => {
            tags.forEach(tag => tag.classList.remove('is-active'));
            if (activePoint) activePoint.tag.classList.add('is-active');
        };

        const render = () => {
            points.forEach(point => {
                const perspective = depth / (depth - point.z);
                const scale = clamp(perspective * 0.94, 0.48, 1.76);
                const x = centerX + point.x * perspective;
                const y = centerY + point.y * perspective;
                const alpha = clamp((point.z + radiusZ) / (radiusZ * 2), 0, 1);
                const opacity = 0.16 + alpha * 0.86;
                const blur = Math.pow(1 - alpha, 1.2) * 2.2;
                const brightness = 0.74 + alpha * 0.34;
                const saturation = 0.68 + alpha * 0.48;
                const extraScale = point === hoveredPoint ? 1.12 : 1;

                point.tag.style.left = `${x}px`;
                point.tag.style.top = `${y}px`;
                point.tag.style.opacity = opacity.toFixed(3);
                point.tag.style.zIndex = String(Math.round(alpha * 1000));
                point.tag.style.filter = `blur(${blur.toFixed(2)}px) saturate(${saturation.toFixed(2)}) brightness(${brightness.toFixed(2)})`;
                point.tag.style.transform = `translate(-50%, -50%) scale(${(scale * extraScale).toFixed(3)})`;
            });
        };

        const getFocusVelocity = () => {
            if (!hoveredPoint || dragging) {
                return { x: 0, y: 0 };
            }

            return {
                x: clamp(hoveredPoint.y / radiusY, -1, 1) * 0.00155,
                y: clamp(hoveredPoint.x / radiusX, -1, 1) * 0.0019
            };
        };

        const tick = timestamp => {
            const time = timestamp * 0.001;
            const breathingX = Math.sin(time * 0.86) * 0.00016;
            const breathingY = Math.cos(time * 0.68) * 0.00022;
            const focusVelocity = getFocusVelocity();

            const targetX = -0.00105 + pointerBiasY * -0.00135 + breathingX + focusVelocity.x;
            const targetY = 0.0019 + pointerBiasX * 0.00185 + breathingY + focusVelocity.y;

            spinX = lerp(spinX, targetX, dragging ? 0.22 : 0.052);
            spinY = lerp(spinY, targetY, dragging ? 0.22 : 0.052);

            points.forEach(point => rotate(point, spinX, spinY));
            render();
            rafId = window.requestAnimationFrame(tick);
        };

        const refreshPointerBias = event => {
            const rect = viewport.getBoundingClientRect();
            pointerBiasX = clamp((event.clientX - rect.left - rect.width / 2) / rect.width, -1, 1);
            pointerBiasY = clamp((event.clientY - rect.top - rect.height / 2) / rect.height, -1, 1);
        };

        const onPointerMove = event => {
            refreshPointerBias(event);

            if (!dragging) return;

            const deltaX = event.clientX - lastPointerX;
            const deltaY = event.clientY - lastPointerY;
            const nextSpinY = deltaX * 0.00011;
            const nextSpinX = -deltaY * 0.00011;

            spinX = lerp(spinX, nextSpinX, 0.72);
            spinY = lerp(spinY, nextSpinY, 0.72);

            if (reducedMotionQuery.matches) {
                points.forEach(point => rotate(point, spinX, spinY));
                render();
            }

            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
        };

        const releaseDrag = () => {
            dragging = false;
            viewport.classList.remove('is-dragging');
        };

        tags.forEach((tag, index) => {
            tag.addEventListener('pointerenter', () => {
                hoveredPoint = points[index];
                updateActiveState(hoveredPoint);
            });

            tag.addEventListener('pointerleave', () => {
                if (hoveredPoint !== points[index]) return;
                hoveredPoint = null;
                updateActiveState(null);
            });
        });

        viewport.addEventListener('pointermove', onPointerMove);

        viewport.addEventListener('pointerleave', () => {
            pointerBiasX = 0;
            pointerBiasY = 0;
            releaseDrag();
        });

        viewport.addEventListener('pointerdown', event => {
            dragging = true;
            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
            viewport.classList.add('is-dragging');
        });

        viewport.addEventListener('pointercancel', releaseDrag);
        window.addEventListener('pointerup', releaseDrag);

        window.addEventListener('resize', () => {
            seedPoints();
            render();
        });

        reducedMotionQuery.addEventListener('change', event => {
            if (event.matches) {
                if (rafId) {
                    window.cancelAnimationFrame(rafId);
                    rafId = 0;
                }
                render();
                return;
            }

            if (!rafId) {
                rafId = window.requestAnimationFrame(tick);
            }
        });

        seedPoints();
        render();
        if (!reducedMotionQuery.matches) {
            rafId = window.requestAnimationFrame(tick);
        }

        window.addEventListener('beforeunload', () => {
            if (rafId) {
                window.cancelAnimationFrame(rafId);
            }
        });
    });
})();
