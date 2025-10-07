// Accessibility JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Font size controls
    const fontIncrease = document.getElementById('font-increase');
    const fontDecrease = document.getElementById('font-decrease');
    const fontReset = document.getElementById('font-reset');
    
    // Contrast and text-only toggles
    const contrastToggle = document.getElementById('contrast-toggle');
    const textModeToggle = document.getElementById('textmode-toggle');
    
    // Font size levels from -3..+3 (0 = default)
    const FONT_MIN = -3;
    const FONT_MAX = 3;
    const levelToClass = {
        [-3]: 'font-xxsmall',
        [-2]: 'font-xsmall',
        [-1]: 'font-small',
        [0]: null,
        [1]: 'font-large',
        [2]: 'font-xlarge',
        [3]: 'font-xxlarge'
    };
    let currentFontSize = 0;
    
    // Load saved preferences
    loadAccessibilityPreferences();
    
    // Font size controls
    if (fontIncrease) {
        fontIncrease.addEventListener('click', function() {
            if (currentFontSize < FONT_MAX) {
                currentFontSize++;
                applyFontSize();
                saveAccessibilityPreferences();
            }
        });
    }
    
    if (fontDecrease) {
        fontDecrease.addEventListener('click', function() {
            if (currentFontSize > FONT_MIN) {
                currentFontSize--;
                applyFontSize();
                saveAccessibilityPreferences();
            }
        });
    }
    
    if (fontReset) {
        fontReset.addEventListener('click', function() {
            currentFontSize = 0;
            applyFontSize();
            saveAccessibilityPreferences();
        });
    }
    
    // Contrast toggle
    if (contrastToggle) {
        contrastToggle.addEventListener('click', function() {
            document.body.classList.toggle('high-contrast');
            const isHighContrast = document.body.classList.contains('high-contrast');
            this.setAttribute('aria-pressed', isHighContrast);
            saveAccessibilityPreferences();
            
            // Announce change to screen readers
            const message = isHighContrast ? 'Włączono tryb wysokiego kontrastu' : 'Wyłączono tryb wysokiego kontrastu';
            announceToScreenReader(message);
        });
    }

    // Text-only mode toggle
    // Helpers to disable/enable all CSS stylesheets for text-only mode
    function setStylesheetsEnabled(enabled) {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(function(link) {
            if (enabled) {
                if (link.dataset.prevMedia !== undefined) {
                    link.media = link.dataset.prevMedia;
                    delete link.dataset.prevMedia;
                } else {
                    link.media = '';
                }
            } else {
                if (link.dataset.prevMedia === undefined) {
                    link.dataset.prevMedia = link.media || '';
                }
                link.media = 'not all';
            }
        });
        const styles = document.querySelectorAll('style');
        styles.forEach(function(styleEl) {
            if (enabled) {
                if (styleEl.dataset.prevMedia !== undefined) {
                    styleEl.setAttribute('media', styleEl.dataset.prevMedia);
                    delete styleEl.dataset.prevMedia;
                } else {
                    styleEl.removeAttribute('media');
                }
            } else {
                if (styleEl.dataset.prevMedia === undefined) {
                    styleEl.dataset.prevMedia = styleEl.getAttribute('media') || '';
                }
                styleEl.setAttribute('media', 'not all');
            }
        });
    }

    if (textModeToggle) {
        textModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('text-only');
            const isTextOnly = document.body.classList.contains('text-only');
            this.setAttribute('aria-pressed', isTextOnly);
            // Disable or re-enable CSS
            setStylesheetsEnabled(!isTextOnly);
            saveAccessibilityPreferences();
            const message = isTextOnly ? 'Włączono tryb tekstowy' : 'Wyłączono tryb tekstowy';
            announceToScreenReader(message);
        });
    }

    // Text-only toolbar "back to graphical" link
    const textOnlyReturn = document.getElementById('textOnlyReturn');
    if (textOnlyReturn) {
        textOnlyReturn.addEventListener('click', function(e) {
            e.preventDefault();
            document.body.classList.remove('text-only');
            if (textModeToggle) {
                textModeToggle.setAttribute('aria-pressed', 'false');
            }
            // Re-enable all stylesheets when leaving text-only mode
            setStylesheetsEnabled(true);
            saveAccessibilityPreferences();
        });
    }
    
    // Apply font size
    function applyFontSize() {
        // Remove all known font size classes
        Object.values(levelToClass).forEach(function(cls) {
            if (cls) document.body.classList.remove(cls);
        });
        
        // Add current font size class if not default
        const cls = levelToClass[currentFontSize];
        if (cls) {
            document.body.classList.add(cls);
        }
        
        // Update button states
        updateFontButtonStates();
        
        // Announce change to screen readers
        const sizeNames = {
            [-3]: 'bardzo mały',
            [-2]: 'mniejszy',
            [-1]: 'mały',
            [0]: 'domyślny',
            [1]: 'duży',
            [2]: 'bardzo duży',
            [3]: 'ekstra duży'
        };
        const message = `Rozmiar czcionki ustawiony na ${sizeNames[currentFontSize]}`;
        announceToScreenReader(message);
    }
    
    // Update font button states
    function updateFontButtonStates() {
        if (fontIncrease) {
            const atMax = currentFontSize >= FONT_MAX;
            fontIncrease.disabled = atMax;
            fontIncrease.setAttribute('aria-pressed', atMax);
        }
        
        if (fontDecrease) {
            const atMin = currentFontSize <= FONT_MIN;
            fontDecrease.disabled = atMin;
            fontDecrease.setAttribute('aria-pressed', atMin);
        }
        
        if (fontReset) {
            fontReset.setAttribute('aria-pressed', currentFontSize === 0);
        }
    }
    
    // Save accessibility preferences to localStorage
    function saveAccessibilityPreferences() {
        const preferences = {
            fontSize: currentFontSize,
            highContrast: document.body.classList.contains('high-contrast'),
            textOnly: document.body.classList.contains('text-only')
        };
        
        try {
            localStorage.setItem('accessibilityPreferences', JSON.stringify(preferences));
        } catch (e) {
            console.warn('Could not save accessibility preferences:', e);
        }
    }
    
    // Load accessibility preferences from localStorage
    function loadAccessibilityPreferences() {
        try {
            const saved = localStorage.getItem('accessibilityPreferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                
                // Apply font size
                if (preferences.fontSize !== undefined) {
                    currentFontSize = preferences.fontSize;
                    applyFontSize();
                }
                
                // Apply high contrast
                if (preferences.highContrast) {
                    document.body.classList.add('high-contrast');
                    if (contrastToggle) {
                        contrastToggle.setAttribute('aria-pressed', 'true');
                    }
                }

                // Apply text-only
                if (preferences.textOnly) {
                    document.body.classList.add('text-only');
                    if (textModeToggle) {
                        textModeToggle.setAttribute('aria-pressed', 'true');
                    }
                    // Disable CSS on load for text-only
                    setStylesheetsEnabled(false);
                }
            }
        } catch (e) {
            console.warn('Could not load accessibility preferences:', e);
        }
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt + 1: Skip to main content
        if (e.altKey && e.key === '1') {
            e.preventDefault();
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.focus();
                mainContent.scrollIntoView();
            }
        }
        
        // Alt + 2: Skip to navigation
        if (e.altKey && e.key === '2') {
            e.preventDefault();
            const navigation = document.getElementById('main-navigation');
            if (navigation) {
                const firstLink = navigation.querySelector('a');
                if (firstLink) {
                    firstLink.focus();
                    firstLink.scrollIntoView();
                }
            }
        }
        
        // Alt + 3: Skip to contact info
        if (e.altKey && e.key === '3') {
            e.preventDefault();
            const contactInfo = document.getElementById('contact-info');
            if (contactInfo) {
                contactInfo.focus();
                contactInfo.scrollIntoView();
            }
        }
        
        // Alt + C: Toggle contrast
        if (e.altKey && e.key === 'c') {
            e.preventDefault();
            if (contrastToggle) {
                contrastToggle.click();
            }
        }
        
        // Alt + Plus: Increase font size
        if (e.altKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            if (fontIncrease && !fontIncrease.disabled) {
                fontIncrease.click();
            }
        }
        
        // Alt + Minus: Decrease font size
        if (e.altKey && e.key === '-') {
            e.preventDefault();
            if (fontDecrease && !fontDecrease.disabled) {
                fontDecrease.click();
            }
        }
        
        // Alt + 0: Reset font size
        if (e.altKey && e.key === '0') {
            e.preventDefault();
            if (fontReset) {
                fontReset.click();
            }
        }
    });
    
    // Focus management for modals and dropdowns
    function trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        );
        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableElement) {
                        lastFocusableElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusableElement) {
                        firstFocusableElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }
    
    // Apply focus trapping to submenus
    const submenus = document.querySelectorAll('.submenu');
    submenus.forEach(function(submenu) {
        trapFocus(submenu);
    });
    
    // Announce page changes
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if it's a significant content change
                    const addedNodes = Array.from(mutation.addedNodes);
                    const hasSignificantContent = addedNodes.some(function(node) {
                        return node.nodeType === Node.ELEMENT_NODE && 
                               (node.tagName === 'H1' || node.tagName === 'H2' || 
                                node.querySelector('h1, h2'));
                    });
                    
                    if (hasSignificantContent) {
                        announceToScreenReader('Treść strony została zaktualizowana');
                    }
                }
            });
        });
        
        observer.observe(mainContent, {
            childList: true,
            subtree: true
        });
    }
    
    // Ensure all images have alt text
    const images = document.querySelectorAll('img');
    images.forEach(function(img) {
        if (!img.alt && !img.getAttribute('aria-label')) {
            img.alt = 'Obraz';
            console.warn('Image missing alt text:', img.src);
        }
    });
    
    // Ensure all links have descriptive text
    const links = document.querySelectorAll('a');
    links.forEach(function(link) {
        const text = link.textContent.trim();
        const href = link.getAttribute('href');
        
        if (text === '' || text === '#' || text === href) {
            console.warn('Link missing descriptive text:', href);
        }
    });
    
    // Add loading states for better UX
    const forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
        form.addEventListener('submit', function() {
            const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Wysyłanie...';
                
                // Re-enable after 5 seconds as fallback
                setTimeout(function() {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Wyślij';
                }, 5000);
            }
        });
    });
    
    // Initialize button states
    updateFontButtonStates();
    
    // Announce keyboard shortcuts on page load
    setTimeout(function() {
        announceToScreenReader('Dostępne skróty klawiszowe: Alt+1 - treść główna, Alt+2 - menu, Alt+3 - kontakt, Alt+C - kontrast, Alt+Plus - powiększ, Alt+Minus - pomniejsz, Alt+0 - reset');
    }, 2000);
});

// Utility function for screen reader announcements
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'visually-hidden';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(function() {
        if (document.body.contains(announcement)) {
            document.body.removeChild(announcement);
        }
    }, 1000);
}
