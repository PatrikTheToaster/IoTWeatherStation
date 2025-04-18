document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('main-nav-links');
    const body = document.body;

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            // Toggle the 'is-open' class on the navigation links container
            navLinks.classList.toggle('is-open');

            // Toggle the 'is-active' class on the button (for hamburger animation)
            mobileMenuToggle.classList.toggle('is-active');

            // Toggle the 'no-scroll' class on the body to prevent scrolling
            body.classList.toggle('no-scroll');

            // Update aria-expanded attribute for accessibility
            const isExpanded = navLinks.classList.contains('is-open');
            mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
        });

        // Optional: Close menu when a link is clicked (useful for single-page apps or jumping to sections)
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('is-open')) {
                    navLinks.classList.remove('is-open');
                    mobileMenuToggle.classList.remove('is-active');
                    body.classList.remove('no-scroll');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        });
    } else {
        console.error("Mobile menu toggle button or nav links container not found.");
    }
});