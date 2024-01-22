document.addEventListener("DOMContentLoaded", function() {
    // Function to recursively create links for subpages based on the current page's branch
    function createLinks(pages, parentContainer, topContainer, currentBranch) {
        pages.forEach(page => {
            const link = document.createElement('a');
            link.href = `/${page.page}`; 
            link.textContent = page.text;

            const linkElement = document.createElement('div');
            linkElement.appendChild(link);

            parentContainer.appendChild(linkElement);

            // Check if the current page's branch matches the current subpage's branch
            if (currentBranch === page.page || currentBranch.startsWith(`${page.page}/`)) {
                // Check if there are subpages, and recursively create links for them
                if (page.subpages && page.subpages.length > 0) {
                    const subpagesContainer = document.createElement('div');
                    subpagesContainer.classList.add('left-links'); // Adjust class as needed
                    topContainer.appendChild(subpagesContainer);
                    createLinks(page.subpages, subpagesContainer, topContainer, currentBranch);
                }
            }
        });
    }

    // Get the current page's branch
    const currentPageBranch = window.location.pathname.replace('/', '');

    // Get the list of pages in the "/notes" folder
    fetch('/index.json') 
        .then(response => response.json())
        .then(pages => {
            const linksContainer = document.getElementById('links-container');

            const pagesContainer = document.createElement('div');
            pagesContainer.classList.add('left-links'); // Adjust class as needed
            linksContainer.appendChild(pagesContainer);
            createLinks(pages, pagesContainer, linksContainer, currentPageBranch);
        })
        .catch(error => console.error('Error fetching pages:', error));
});
