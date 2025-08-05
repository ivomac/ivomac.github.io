
const SITE_STRUCTURE = {
    // Root level sections
    'intro': { name: 'Intro', path: '/index.html' },
    'publications': { name: 'Publications', path: '/pages/publications/index.html' },
    'projects': { name: 'Projects', path: '/pages/projects/index.html' },
    'fun': { name: 'Fun', path: '/pages/fun/index.html' },

    // Publications
    'publications/maceira2024': { name: 'Maceira2024', path: '/pages/publications/maceira2024/index.html' },
    'publications/maceira2022': { name: 'Maceira2022', path: '/pages/publications/maceira2022/index.html' },
    'publications/maceira2020': { name: 'Maceira2020', path: '/pages/publications/maceira2020/index.html' },
    'publications/maceira2018': { name: 'Maceira2018', path: '/pages/publications/maceira2018/index.html' },
    'publications/gouveia2016': { name: 'Gouveia2016', path: '/pages/publications/gouveia2016/index.html' },

    // Projects
    'projects/ETL': { name: '🔧 ETL Pipeline', path: '/pages/projects/ETL/index.html' },
    'projects/git_guide': { name: '🪣 Git Guide', path: '/pages/projects/git_guide/index.html' },
    'projects/blackjack': { name: '🃏 Blackjack Solver', path: '/pages/projects/blackjack/index.html' },
    'projects/TODO': { name: '🚧 TODO', path: '/pages/projects/index.html' },

    // Fun
    'fun/yes_no': { name: '🧩 Yes/No Game', path: '/pages/fun/yes_no/index.html' },

    'fun/yes_no/Easy': { name: 'Easy', path: '/pages/fun/yes_no/Easy.html' },
    'fun/yes_no/Medium': { name: 'Medium', path: '/pages/fun/yes_no/Medium.html' },
    'fun/yes_no/Hard': { name: 'Hard', path: '/pages/fun/yes_no/Hard.html' },
    'fun/yes_no/Unsorted': { name: 'Unsorted', path: '/pages/fun/yes_no/Unsorted.html' },

    'fun/plants': { name: '🪴 Plants', path: '/pages/fun/plants/index.html' },
};

/**
 * Get the current page path normalized for comparison.
 */
function getCurrentPath() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') {
        return 'intro';
    }

    // Remove /pages/ prefix and .html suffix, convert index.html to parent dir
    let normalized = path.replace(/^\/pages\//, '').replace(/\.html$/, '');
    if (normalized.endsWith('/index')) {
        normalized = normalized.replace('/index', '');
    }

    return normalized;
}

/**
 * Get all sections at a specific level that are children of the given parent path.
 */
function getSectionsAtLevel(parentPath, level) {
    const sections = [];

    for (const [key, config] of Object.entries(SITE_STRUCTURE)) {
        const parts = key.split('/');

        // Check if this section belongs to the parent path
        if (parentPath === '' || key.startsWith(parentPath + '/') || (parentPath === 'intro' && parts.length === 1 && key !== 'intro')) {
            // For root level (parentPath === 'intro'), include all top-level sections
            if (parentPath === 'intro' && parts.length === 1) {
                sections.push({ key, config, parts });
            }
            // For other levels, check exact level match
            else if (parentPath !== 'intro' && parts.length === level + 1) {
                sections.push({ key, config, parts });
            }
        }
    }

    return sections;
}

/**
 * Create a navigation bar for the given sections.
 */
function createNavBar(sections, currentPath) {
    const nav = document.createElement('nav');
    nav.className = 'navbar';

    for (const { key, config } of sections) {
        const link = document.createElement('a');
        link.href = config.path;
        link.textContent = config.name;

        // Mark as active if this is the current page or current section
        if (key === currentPath || currentPath.startsWith(key + '/')) {
            link.className = 'active';
        }

        nav.appendChild(link);
    }

    return nav;
}

/**
 * Generate and insert all navigation bars for the current page.
 */
function generateNavigation() {
    const currentPath = getCurrentPath();
    const pathParts = currentPath === 'intro' ? [] : currentPath.split('/');

    // Always show the root level navigation
    const rootSections = [
        { key: 'intro', config: SITE_STRUCTURE.intro, parts: ['intro'] },
        { key: 'publications', config: SITE_STRUCTURE.publications, parts: ['publications'] },
        { key: 'projects', config: SITE_STRUCTURE.projects, parts: ['projects'] },
        { key: 'fun', config: SITE_STRUCTURE.fun, parts: ['fun'] }
    ];

    const navBars = [];
    navBars.push(createNavBar(rootSections, currentPath));

    // Generate navigation bars for each level
    let parentPath = '';
    for (let level = 0; level < pathParts.length; level++) {
        if (level === 0) {
            parentPath = pathParts[0];
        } else {
            parentPath += '/' + pathParts[level];
        }

        const sections = getSectionsAtLevel(pathParts.slice(0, level + 1).join('/'), level + 1);
        if (sections.length > 0) {
            navBars.push(createNavBar(sections, currentPath));
        }
    }

    // Insert navigation bars at the beginning of the body
    const body = document.body;
    const firstChild = body.firstChild;

    for (const navBar of navBars) {
        body.insertBefore(navBar, firstChild);
    }
}

/**
 * Initialize navigation when the DOM is loaded.
 */
document.addEventListener('DOMContentLoaded', generateNavigation);
