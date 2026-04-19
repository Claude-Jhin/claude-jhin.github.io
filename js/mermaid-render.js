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

    const prefersDark = document.documentElement.getAttribute("data-theme") === "dark";
    const themeVariables = prefersDark ? {
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
        fontFamily: "LXGW Neo XiHei, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif",
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
        fontFamily: "LXGW Neo XiHei, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif",
        fontSize: "15px"
    };

    const renderFallback = (shell, source) => {
        shell.classList.remove("is-pending");
        shell.classList.add("is-failed");

        const note = document.createElement("p");
        note.className = "mermaid-render-note";
        note.textContent = "图表渲染失败，下面显示原始内容。";

        const fallback = document.createElement("pre");
        fallback.className = "mermaid-render-fallback";
        fallback.textContent = source;

        shell.replaceChildren(note, fallback);
    };

    try {
        const mermaidModule = await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
        const mermaid = mermaidModule.default;

        mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            theme: "base",
            themeVariables,
            flowchart: {
                htmlLabels: false,
                curve: "basis"
            }
        });

        for (const block of mermaidBlocks) {
            try {
                const { svg, bindFunctions } = await mermaid.render(block.id, block.source);
                block.shell.classList.remove("is-pending");
                block.shell.innerHTML = svg;
                if (typeof bindFunctions === "function") {
                    bindFunctions(block.shell);
                }
            } catch (error) {
                renderFallback(block.shell, block.source);
            }
        }
    } catch (error) {
        mermaidBlocks.forEach((block) => {
            renderFallback(block.shell, block.source);
        });
    }
});
