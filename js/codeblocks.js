document.addEventListener("DOMContentLoaded", () => {
    const codeBlocks = document.querySelectorAll(".post-content figure.highlight");

    const fallbackCopy = (text) => {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        document.body.removeChild(helper);
    };

    codeBlocks.forEach((block) => {
        const codeRoot = block.querySelector(".code");
        if (!codeRoot) return;

        block.classList.add("codeblock-ready");

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "code-copy-btn";
        copyButton.setAttribute("aria-label", "复制代码");
        copyButton.textContent = "复制";

        copyButton.addEventListener("click", async () => {
            const lines = codeRoot.querySelectorAll(".line");
            const codeText = Array.from(lines).map((line) => line.textContent).join("\n");

            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(codeText);
                } else {
                    fallbackCopy(codeText);
                }
                copyButton.textContent = "已复制";
                copyButton.classList.add("is-copied");
                window.setTimeout(() => {
                    copyButton.textContent = "复制";
                    copyButton.classList.remove("is-copied");
                }, 1800);
            } catch (error) {
                copyButton.textContent = "失败";
                window.setTimeout(() => {
                    copyButton.textContent = "复制";
                }, 1800);
            }
        });

        block.appendChild(copyButton);
    });
});
