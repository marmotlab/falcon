document.addEventListener('DOMContentLoaded', () => {
    // 示例：当滚动到 Publications 时高亮 navbar
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 80;
            if (pageYOffset >= top) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // Introduction video overlay (big centered play button)
    const introWrapper = document.querySelector('.video-wrapper.intro');
    if (introWrapper) {
        const video = introWrapper.querySelector('video');
        const overlay = introWrapper.querySelector('.video-overlay');

        // Clicking the overlay plays the video and reveals controls
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            if (video.paused) {
                video.play();
                video.controls = true;
                overlay.classList.add('hidden');
            } else {
                video.pause();
                overlay.classList.remove('hidden');
            }
        });

        // Clicking the video toggles pause/play (useful when controls hidden)
        video.addEventListener('click', (e) => {
            // if controls are visible, let native controls handle clicks
            if (video.controls) return;
            if (video.paused) {
                video.play();
                video.controls = true;
                overlay.classList.add('hidden');
            } else {
                video.pause();
                overlay.classList.remove('hidden');
            }
        });

        // Keep overlay synced with playback state
        video.addEventListener('play', () => overlay.classList.add('hidden'));
        video.addEventListener('pause', () => overlay.classList.remove('hidden'));
        video.addEventListener('ended', () => {
            overlay.classList.remove('hidden');
            video.currentTime = 0;
            video.controls = true;
        });
    }
});

// Dropdown toggle for nav (support click-to-open on touch/mobile)
document.addEventListener('click', (e) => {
    const dropdownToggle = e.target.closest('.has-dropdown > a');
    if (dropdownToggle) {
        const parent = dropdownToggle.parentElement;
        // On larger screens allow default link behavior (jump to #result)
        if (window.innerWidth <= 900) {
            e.preventDefault();
            const isOpen = parent.classList.toggle('open');
            dropdownToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        return;
    }

    // Close any open dropdown when clicking outside
    const openDropdown = document.querySelector('.nav-links .has-dropdown.open');
    if (openDropdown && !e.target.closest('.has-dropdown')) {
        openDropdown.classList.remove('open');
        const toggle = openDropdown.querySelector('a');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
});

