(() => {
    const content = document.querySelector('.post-content');
    if (!content) return;

    const headingSelector = 'h2[id], h3[id], h4[id]';
    const headings = Array.from(content.querySelectorAll(headingSelector));
    if (!headings.length) return;

    const allTocLinks = Array.from(document.querySelectorAll('.post-toc-nav .post-toc-list-link'));
    if (!allTocLinks.length) return;

    const sidebar = document.querySelector('.post-toc-sidebar');
    const sidebarLinks = sidebar
        ? Array.from(sidebar.querySelectorAll('.post-toc-list-link'))
        : [];

    const linksByHash = new Map();
    allTocLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        const decodedHash = decodeURIComponent(href);
        const list = linksByHash.get(decodedHash) || [];
        list.push(link);
        linksByHash.set(decodedHash, list);
    });

    let activeHash = '';
    let ticking = false;

    const updateActiveLinks = (hash) => {
        if (!hash || hash === activeHash) return;
        activeHash = hash;

        allTocLinks.forEach((link) => {
            const isMatch = decodeURIComponent(link.getAttribute('href') || '') === hash;
            link.classList.toggle('is-active', isMatch);
        });

        if (!sidebar || !sidebarLinks.length) return;
        const activeSidebarLink = sidebarLinks.find(
            (link) => decodeURIComponent(link.getAttribute('href') || '') === hash
        );
        if (!activeSidebarLink) return;

        const containerTop = sidebar.scrollTop;
        const containerBottom = containerTop + sidebar.clientHeight;
        const linkTop = activeSidebarLink.offsetTop - 10;
        const linkBottom = activeSidebarLink.offsetTop + activeSidebarLink.offsetHeight + 10;

        if (linkTop < containerTop) {
            sidebar.scrollTo({ top: linkTop, behavior: 'smooth' });
        } else if (linkBottom > containerBottom) {
            sidebar.scrollTo({ top: linkBottom - sidebar.clientHeight, behavior: 'smooth' });
        }
    };

    const findActiveHeading = () => {
        const offset = 132;
        let current = headings[0];

        for (const heading of headings) {
            if (heading.getBoundingClientRect().top <= offset) {
                current = heading;
            } else {
                break;
            }
        }

        return current;
    };

    const syncToc = () => {
        ticking = false;
        const currentHeading = findActiveHeading();
        if (!currentHeading) return;
        updateActiveLinks(`#${currentHeading.id}`);
    };

    const requestSync = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(syncToc);
    };

    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync);
    window.addEventListener('hashchange', () => {
        const currentHash = decodeURIComponent(window.location.hash || '');
        if (currentHash) updateActiveLinks(currentHash);
        requestSync();
    });

    requestSync();
})();
