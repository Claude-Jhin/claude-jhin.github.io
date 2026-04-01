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
        copyButton.setAttribute("aria-label", "Copy code");
        copyButton.textContent = "Copy";

        copyButton.addEventListener("click", async () => {
            const lines = codeRoot.querySelectorAll(".line");
            const codeText = Array.from(lines).map((line) => line.textContent).join("\n");

            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(codeText);
                } else {
                    fallbackCopy(codeText);
                }
                copyButton.textContent = "Copied";
                copyButton.classList.add("is-copied");
                window.setTimeout(() => {
                    copyButton.textContent = "Copy";
                    copyButton.classList.remove("is-copied");
                }, 1800);
            } catch (error) {
                copyButton.textContent = "Failed";
                window.setTimeout(() => {
                    copyButton.textContent = "Copy";
                }, 1800);
            }
        });

        block.appendChild(copyButton);
    });
});
