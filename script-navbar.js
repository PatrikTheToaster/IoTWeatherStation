// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get references to the mobile menu toggle button and the links container
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    // *** TÄRKEÄÄ: Varmista, että HTML:ssä navigaatiolinkkien ympärillä olevalla
    // *** elementillä (div tai ul) on id="main-nav-links"
    const navLinksContainer = document.getElementById('main-nav-links');
    const body = document.body;

    // Check if both elements exist before adding the listener
    if (mobileMenuToggle && navLinksContainer) {
        mobileMenuToggle.addEventListener('click', () => {
            // Toggle the 'is-open' class on the navigation links container to show/hide it
            navLinksContainer.classList.toggle('is-open');

            // Toggle the 'is-active' class on the button itself (for hamburger animation)
            mobileMenuToggle.classList.toggle('is-active');

            // Toggle the 'no-scroll' class on the body to prevent scrolling when menu is open
            body.classList.toggle('no-scroll');

            // Update aria-expanded attribute for accessibility
            const isExpanded = navLinksContainer.classList.contains('is-open');
            mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
        });

        // Optional: Close mobile menu when a link/button inside it is clicked
        // This targets clicks inside the container
        navLinksContainer.addEventListener('click', (event) => {
            // Check if the click was on a button or a link inside the menu
            if (event.target.matches('a') || event.target.matches('button')) {
                 if (navLinksContainer.classList.contains('is-open')) {
                    navLinksContainer.classList.remove('is-open');
                    mobileMenuToggle.classList.remove('is-active');
                    body.classList.remove('no-scroll');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });

    } else {
        // Log an error if the necessary elements aren't found
        if (!mobileMenuToggle) console.error("Mobile menu toggle button ('mobile-menu-toggle') not found.");
        if (!navLinksContainer) console.error("Navigation links container ('main-nav-links') not found.");
    }
});