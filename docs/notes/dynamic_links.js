document.addEventListener("DOMContentLoaded", function() {
    // Get the list of pages in the "/notes" folder
    fetch('/notes/index.json') 
        .then(response => response.json())
        .then(pages => {
            const linksContainer = document.getElementById('dynamic-links');

            // Loop through the pages and create links
            pages.forEach(page => {
                const link = document.createElement('a');
                link.href = `/notes/${page.page}`; 
                link.textContent = page.text;

                const linkElement = document.createElement('div');
                linkElement.appendChild(link);

                linksContainer.appendChild(linkElement);
            });
        })
        .catch(error => console.error('Error fetching pages:', error));
});
