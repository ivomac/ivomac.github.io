async function loadPublications() {
    const response = await fetch('/assets/data/publications.json');
    const publications = await response.json();
    const container = document.getElementById('publications-container');

    for (const [id, pub] of Object.entries(publications)) {
        const article = document.createElement('article');
        article.classList.add('publication');
        
        article.innerHTML = `
            <img src="${pub.image}" alt="Figure from ${pub.title}">
            <h2>${pub.title}</h2>
            <p class="authors">${pub.authors.join(', ')}</p>
            <p class="abstract">${pub.abstract}</p>
            <div class="links">
                <a href="https://doi.org/${pub.doi}">DOI</a>
                <a href="https://arxiv.org/abs/${pub.arxiv}">arXiv</a>
            </div>
        `;
        
        container.appendChild(article);
    }
}

async function loadProjects() {
    const response = await fetch('/assets/data/projects.json');
    const projects = await response.json();
    const container = document.getElementById('projects-container');

    for (const [id, project] of Object.entries(projects)) {
        const article = document.createElement('article');
        article.classList.add('project');
        
        article.innerHTML = `
            <img src="${project.image}" alt="Screenshot of ${project.title}">
            <h2>${project.title}</h2>
            <p class="description">${project.description}</p>
            <div class="tags">
                ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <a href="${project.link}" class="project-link">View Project</a>
        `;
        
        container.appendChild(article);
    }
}
