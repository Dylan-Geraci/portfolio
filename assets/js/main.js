/**
 * Portfolio Main JavaScript
 * Handles scroll animations, navbar effects, theme toggle, and interactions
 */

// =====================================
// INTERSECTION OBSERVER - Scroll Animations
// =====================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.15, // Trigger when 15% of element is visible
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe all elements with fade-on-scroll class
    const fadeElements = document.querySelectorAll('.fade-on-scroll');
    fadeElements.forEach(el => observer.observe(el));
}

// =====================================
// NAVBAR - Border on Scroll
// =====================================

function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    const heroHeight = document.querySelector('.hero')?.offsetHeight || 800;
    const scrollThreshold = heroHeight * 0.3; // Activate after 30% of hero

    function updateNavbar() {
        if (window.scrollY > scrollThreshold) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    // Initial check
    updateNavbar();

    // Listen for scroll events (debounced for performance)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(updateNavbar);
    }, { passive: true });
}

// =====================================
// THEME TOGGLE - Enhanced Dark Mode
// =====================================

// Function to save theme preference
function setThemeColors() {
    const currentTheme = document.body.dataset.bsTheme;

    // Save theme preference
    try {
        localStorage.setItem('theme', currentTheme);
    } catch (e) {
        console.warn('LocalStorage not available:', e);
    }
}

function toggleTheme() {
    const currentTheme = document.body.dataset.bsTheme;
    const newTheme = (currentTheme === "dark") ? "light" : "dark";
    document.body.dataset.bsTheme = newTheme;
    setThemeColors();
}

function initTheme() {
    // Try to load saved theme, default to light
    let savedTheme = 'light';
    try {
        savedTheme = localStorage.getItem('theme') || 'light';
    } catch (e) {
        console.warn('LocalStorage not available:', e);
    }

    document.body.dataset.bsTheme = savedTheme;
    setThemeColors();
}

// =====================================
// SMOOTH SCROLL - For anchor links
// =====================================

function initSmoothScroll() {
    const navLinks = document.querySelectorAll('a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            // Skip if it's just "#"
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();

                // Offset for fixed navbar
                const navbarHeight = document.getElementById('navbar')?.offsetHeight || 70;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                const navbarCollapse = document.querySelector('.navbar-collapse');
                if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                    if (bsCollapse) {
                        bsCollapse.hide();
                    }
                }
            }
        });
    });
}


// =====================================
// DYNAMIC YEAR - Footer
// =====================================

function setFooterYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}


// =====================================
// PRELOAD IMAGES - Improve performance
// =====================================

function preloadCriticalImages() {
    const images = [
        'images/headshot_first.jpeg',
        'images/parksafe_picture.png',
        'images/carelink_picture.png',
        'images/migration_picture.png'
    ];

    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// =====================================
// INITIALIZE ALL
// =====================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme first
    initTheme();

    // Initialize all features
    initScrollAnimations();
    initNavbarScroll();
    initSmoothScroll();
    setFooterYear();

    // Preload images for better UX
    preloadCriticalImages();

    console.log('Portfolio initialized');
});

// Make toggleTheme available globally for inline onclick
window.toggleTheme = toggleTheme;
