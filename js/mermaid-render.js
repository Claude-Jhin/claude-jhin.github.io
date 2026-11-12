document.addEventListener("DOMContentLoaded", async () => {
    const mermaidKeywordPattern = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|requirementDiagram|quadrantChart|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/;
    const mermaidBlocks = [];
    const codeBlocks = document.querySelectorAll(".post-content figure.highlight");

    const extractCode = (block) => {
        const codeRoot = block.querySelector(".code");
        if (!codeRoot) return "";

        const lines = codeRoot.querySelectorAll(".line");
        if (!lines.length) {
            return codeRoot.textContent.trim();
        }

        return Array.from(lines)
            .map((line) => line.textContent)
            .join("\n")
            .trim();
    };

    const getFirstMeaningfulLine = (source) => {
        return source
            .split("\n")
            .map((line) => line.trim())
            .find((line) => line && !line.startsWith("%%")) || "";
    };

    codeBlocks.forEach((block, index) => {
        const source = extractCode(block);
        if (!source) return;

        const firstMeaningfulLine = getFirstMeaningfulLine(source);
        if (!mermaidKeywordPattern.test(firstMeaningfulLine)) return;

        const shell = document.createElement("div");
        shell.className = "mermaid-render-shell is-pending";
        shell.dataset.mermaidSource = source;
        shell.dataset.mermaidId = `mermaid-diagram-${index}`;
        block.replaceWith(shell);

        mermaidBlocks.push({
            id: shell.dataset.mermaidId,
            shell,
            source
        });
    });

    if (!mermaidBlocks.length) return;

    const getThemeVariables = () => document.documentElement.getAttribute("data-theme") === "dark" ? {
        background: "#121925",
        primaryColor: "#182130",
        primaryTextColor: "#edf4ff",
        primaryBorderColor: "#5a7aa5",
        lineColor: "#88a7d0",
        secondaryColor: "#101722",
        tertiaryColor: "#1b2535",
        clusterBkg: "#141d2a",
        clusterBorder: "#4d678c",
        mainBkg: "#182130",
        nodeBorder: "#5a7aa5",
        fontFamily: getComputedStyle(document.body).fontFamily,
        fontSize: "15px"
    } : {
        background: "#f6f8fc",
        primaryColor: "#edf3fb",
        primaryTextColor: "#182130",
        primaryBorderColor: "#6b88af",
        lineColor: "#6e8eb5",
        secondaryColor: "#f7f9fd",
        tertiaryColor: "#e8eef7",
        clusterBkg: "#eef3fa",
        clusterBorder: "#90a8c7",
        mainBkg: "#edf3fb",
        nodeBorder: "#6b88af",
        fontFamily: getComputedStyle(document.body).fontFamily,
        fontSize: "15px"
    };

    // A native dialog handles focus trapping and Escape without changing the page scroll.
    const dialog = document.createElement('dialog');
    dialog.className = 'diagram-dialog';
    dialog.setAttribute('aria-label', '放大查看流程图');
    dialog.setAttribute('aria-modal', 'true');
    const controls = document.createElement('div');
    controls.className = 'diagram-dialog-controls';
    const makeButton = (label, action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', action);
        return button;
    };
    const zoomLabel = document.createElement('output');
    zoomLabel.setAttribute('aria-live', 'polite');
    const dialogViewport = document.createElement('div');
    dialogViewport.className = 'diagram-viewport diagram-dialog-viewport';
    dialogViewport.tabIndex = 0;
    dialogViewport.setAttribute('role', 'region');
    dialogViewport.setAttribute('aria-label', '流程图，可横向和纵向滚动');
    let activeBlock = null;
    let opener = null;
    let zoom = 1;
    const resizeSvg = (block, scale = 1) => {
        if (!block.svg) return;
        block.svg.style.width = `${block.width * scale}px`;
        block.svg.style.maxWidth = 'none';
        block.svg.style.height = 'auto';
    };
    const applyZoom = (value) => {
        zoom = Math.max(0.5, Math.min(2, value));
        zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
        if (activeBlock) resizeSvg(activeBlock, zoom);
        zoomOut.disabled = zoom <= 0.5;
        zoomIn.disabled = zoom >= 2;
    };
    const zoomOut = makeButton('缩小', () => applyZoom(zoom - 0.25));
    const zoomIn = makeButton('放大', () => applyZoom(zoom + 0.25));
    const close = makeButton('关闭', () => dialog.close());
    controls.append(zoomOut, zoomLabel, zoomIn, makeButton('原始大小', () => applyZoom(1)), close);
    dialog.append(controls, dialogViewport);
    document.body.append(dialog);
    dialog.addEventListener('close', () => {
        if (activeBlock?.svg) {
            resizeSvg(activeBlock);
            activeBlock.viewport.replaceChildren(activeBlock.svg);
        }
        activeBlock = null;
        opener?.focus({ preventScroll: true });
        document.body.classList.remove('diagram-is-open');
    });

    mermaidBlocks.forEach((block, index) => {
        const toolbar = document.createElement('div');
        toolbar.className = 'diagram-toolbar';
        const hint = document.createElement('span');
        hint.textContent = '原始大小 · 可滚动查看';
        const open = makeButton('放大查看', () => {
            if (!block.svg) return;
            activeBlock = block;
            opener = open;
            dialogViewport.replaceChildren(block.svg);
            applyZoom(1);
            dialog.showModal();
            dialogViewport.scrollTo(0, 0);
            document.body.classList.add('diagram-is-open');
            close.focus();
        });
        open.disabled = true;
        const viewport = document.createElement('div');
        viewport.className = 'diagram-viewport';
        viewport.tabIndex = 0;
        viewport.setAttribute('role', 'region');
        viewport.setAttribute('aria-label', `流程图 ${index + 1}，可横向滚动`);
        toolbar.append(hint, open);
        block.shell.append(toolbar, viewport);
        Object.assign(block, { viewport, open, toolbar });
    });

    const renderFallback = (shell, source) => {
        shell.classList.remove("is-pending");
        shell.classList.add("is-failed");

        const note = document.createElement("p");
        note.className = "mermaid-render-note";
        note.textContent = "图表渲染失败，下面显示原始内容。";

        const fallback = document.createElement("pre");
        fallback.className = "mermaid-render-fallback";
        fallback.textContent = source;

        const block = mermaidBlocks.find(item => item.shell === shell);
        block.viewport.replaceChildren(note, fallback);
        block.open.disabled = true;
    };

    try {
        const mermaidModule = await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
        const mermaid = mermaidModule.default;

        let rendering = false;
        let pending = false;
        let revision = 0;
        const renderAll = async () => {
            pending = true;
            if (rendering) return;
            rendering = true;
            while (pending) {
                pending = false;
                revision++;
                mermaid.initialize({
                    startOnLoad: false, securityLevel: 'loose', theme: 'base',
                    themeVariables: getThemeVariables(),
                    flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: false }
                });
                for (const block of mermaidBlocks) {
                    try {
                        const { svg, bindFunctions } = await mermaid.render(`${block.id}-${revision}`, block.source);
                        const target = activeBlock === block ? dialogViewport : block.viewport;
                        target.innerHTML = svg;
                        block.svg = target.querySelector('svg');
                        block.width = block.svg.viewBox.baseVal.width || block.svg.getBoundingClientRect().width;
                        resizeSvg(block, activeBlock === block ? zoom : 1);
                        block.shell.classList.remove('is-pending', 'is-failed');
                        block.open.disabled = false;
                        if (typeof bindFunctions === 'function') bindFunctions(target);
                    } catch (error) {
                        if (activeBlock === block) dialog.close();
                        renderFallback(block.shell, block.source);
                    }
                }
            }
            rendering = false;
        };
        new MutationObserver(renderAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-font'] });
        await renderAll();
    } catch (error) {
        mermaidBlocks.forEach((block) => {
            renderFallback(block.shell, block.source);
        });
    }
});
