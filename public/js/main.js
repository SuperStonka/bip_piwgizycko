// Main JavaScript for the website

document.addEventListener('DOMContentLoaded', function() {
    // Sidebar submenu toggle
    const sidebarToggles = document.querySelectorAll('[data-toggle="submenu"]');
    
    // Klucze i persystencja stanu akordeonu
    const OPEN_PARENT_KEY = 'sidebar-open-parent-key';
    function getParentKeyFromToggle(toggle) {
        return toggle && toggle.getAttribute('data-menu-key');
    }
    function getParentKeyFromSubmenu(submenu) {
        return submenu && submenu.getAttribute('data-parent-key');
    }
    function saveOpenParentKey(parentKey) {
        if (parentKey) localStorage.setItem(OPEN_PARENT_KEY, parentKey);
        else localStorage.removeItem(OPEN_PARENT_KEY);
    }
    function restoreAccordionState() {
        const storedKey = localStorage.getItem(OPEN_PARENT_KEY);
        const allSubmenus = document.querySelectorAll('.sidebar-submenu');
        const allToggles = document.querySelectorAll('[data-toggle="submenu"]');
        
        // Zamknij wszystko
        allSubmenus.forEach(function(sm){ sm.classList.remove('expanded'); });
        allToggles.forEach(function(tg){ tg.classList.add('collapsed'); });
        
        // Jeśli jest zapamiętany klucz, otwórz odpowiadający
        if (storedKey) {
            const submenuToOpen = document.querySelector('.sidebar-submenu[data-parent-key="' + storedKey + '"]');
            const toggleToOpen = document.querySelector('[data-toggle="submenu"][data-menu-key="' + storedKey + '"]');
            if (submenuToOpen && toggleToOpen) {
                submenuToOpen.classList.add('expanded');
                toggleToOpen.classList.remove('collapsed');
            }
        }
    }
    
    // Przywróć stan akordeonu przy ładowaniu strony
    restoreAccordionState();
    
    // Dynamiczne ustawianie aktywnej pozycji menu
    function setActiveMenuItem() {
        const currentPath = window.location.pathname;
        const currentUrl = window.location.href;
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        const sidebarSublinks = document.querySelectorAll('.sidebar-sublink');
        
        // Usuń klasę active ze wszystkich linków
        sidebarLinks.forEach(function(link) {
            link.classList.remove('active');
            link.classList.remove('parent-active');
        });
        sidebarSublinks.forEach(function(link) {
            link.classList.remove('active');
        });
        
        // Najpierw sprawdź sublinki - bardziej uniwersalnie
        let submenuItemActive = false;
        
        sidebarSublinks.forEach(function(link) {
            const linkHref = link.getAttribute('href');
            
            // Sprawdź dokładne dopasowanie URL
            if (linkHref === currentUrl || linkHref === currentPath) {
                link.classList.add('active');
                submenuItemActive = true;
                
                // Znajdź parent element (główną pozycję menu dla tego submenu)
                const parentSubmenu = link.closest('.sidebar-submenu');
                if (parentSubmenu) {
                    const parentLink = parentSubmenu.previousElementSibling;
                    if (parentLink && parentLink.classList.contains('sidebar-link')) {
                        parentLink.classList.add('active');
                    }
                }
            }
            // Sprawdź także parametry URL (np. dla kategorii)
            else {
                try {
                    const linkUrl = new URL(linkHref, window.location.origin);
                    const currentUrlObj = new URL(currentUrl);
                    
                    // Porównaj ścieżki i parametry
                    if (linkUrl.pathname === currentUrlObj.pathname) {
                        const linkParams = linkUrl.searchParams;
                        const currentParams = currentUrlObj.searchParams;
                        
                        // Sprawdź czy wszystkie parametry z linka są w aktualnym URL
                        let paramsMatch = true;
                        for (const [key, value] of linkParams) {
                            if (currentParams.get(key) !== value) {
                                paramsMatch = false;
                                break;
                            }
                        }
                        
                        if (paramsMatch && linkParams.toString() !== '') {
                            link.classList.add('active');
                            submenuItemActive = true;
                            
                            // Znajdź parent element
                            const parentSubmenu = link.closest('.sidebar-submenu');
                            if (parentSubmenu) {
                                const parentLink = parentSubmenu.previousElementSibling;
                                if (parentLink && parentLink.classList.contains('sidebar-link')) {
                                    parentLink.classList.add('active');
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Ignoruj błędy URL parsing
                }
            }
        });
        
        // Jeśli nie znaleziono aktywnego sublinka, sprawdź główne linki
        if (!submenuItemActive) {
            sidebarLinks.forEach(function(link) {
                const linkPath = link.getAttribute('href');
                console.log('DEBUG: Checking menu link:', linkPath);
                
                // Sprawdź dokładne dopasowanie
                if (linkPath === currentPath || linkPath === currentUrl) {
                    link.classList.add('active');
                    console.log('DEBUG: Exact match activated:', linkPath);
                }
                // Dynamiczne zaznaczanie strony głównej
                else if (currentPath === '/') {
                    console.log('DEBUG: Homepage detection - window.homepageData:', window.homepageData);
                    if (window.homepageData && window.homepageData.isHomepage && window.homepageData.slug) {
                        console.log('DEBUG: Looking for menu link:', '/' + window.homepageData.slug);
                        // Sprawdź czy link prowadzi do artykułu używanego jako homepage
                        // Sprawdź slug-based URL (np. /adresy-telefony-kontaktowe)
                        if (linkPath === '/' + window.homepageData.slug) {
                            link.classList.add('active');
                            console.log('DEBUG: Homepage menu item activated (slug):', linkPath);
                        }
                        // Sprawdź także /menu/ID format jeśli używa tego formatu
                        const menuMatch = linkPath.match(/^\/menu\/(\d+)$/);
                        if (menuMatch) {
                            // Można dodać dodatkowe sprawdzanie w przyszłości
                        }
                    } 
                }
                // Sprawdź czy ścieżka pasuje do początku aktualnego URL (dla sekcji)
                else if (linkPath !== '/' && currentPath.startsWith(linkPath)) {
                    link.classList.add('active');
                }
            });
        }
    }
    
    // Ustaw aktywną pozycję przy ładowaniu strony
    setActiveMenuItem();
    
    sidebarToggles.forEach(function(toggle) {
        toggle.addEventListener('click', function(e) {
            // Akordeon sterujemy tylko kliknięciem w strzałkę
            if (e.target.classList.contains('sidebar-arrow')) {
                e.preventDefault();
                const submenu = this.nextElementSibling;
                if (!submenu) return;
                const isExpanded = submenu.classList.contains('expanded');
                const currentKey = getParentKeyFromToggle(this);
                
                if (isExpanded) {
                    // Użytkownik ręcznie zamyka aktualnie otwarte
                    submenu.classList.remove('expanded');
                    this.classList.add('collapsed');
                    // Jeśli zamykamy bieżący zapamiętany, usuń z localStorage
                    const storedKey = localStorage.getItem(OPEN_PARENT_KEY);
                    if (storedKey === currentKey) {
                        saveOpenParentKey(null);
                    }
                } else {
                    // Otwórz bieżący i zamknij wszystkie inne (akordeon)
                    const allSubmenus = document.querySelectorAll('.sidebar-submenu');
                    const allToggles = document.querySelectorAll('[data-toggle="submenu"]');
                    allSubmenus.forEach(function(sm){ sm.classList.remove('expanded'); });
                    allToggles.forEach(function(tg){ tg.classList.add('collapsed'); });
                    
                    submenu.classList.add('expanded');
                    this.classList.remove('collapsed');
                    saveOpenParentKey(currentKey);
                }
            }
            // Klik na tekst linku pozostawiamy default (nawigacja)
        });
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainMenu = document.querySelector('.main-menu');
    
    if (mobileMenuToggle && mainMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            const nowExpanded = !isExpanded;
            this.setAttribute('aria-expanded', nowExpanded.toString());
            mainMenu.classList.toggle('active');
            
            // Update button label
            const buttonText = nowExpanded ? 'Zamknij menu główne' : 'Otwórz menu główne';
            this.setAttribute('aria-label', buttonText);
            
            // Focus management: focus first link when opening
            if (nowExpanded) {
                const firstLink = mainMenu.querySelector('a');
                if (firstLink) firstLink.focus();
            } else {
                mobileMenuToggle.focus();
            }
        });
    }
    
    // Submenu keyboard navigation
    const menuItemsWithChildren = document.querySelectorAll('.menu-item-has-children');
    
    menuItemsWithChildren.forEach(function(menuItem) {
        const link = menuItem.querySelector('a');
        const submenu = menuItem.querySelector('.submenu');
        
        if (link && submenu) {
            link.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const isExpanded = this.getAttribute('aria-expanded') === 'true';
                    this.setAttribute('aria-expanded', !isExpanded);
                    
                    if (!isExpanded) {
                        // Focus first submenu item
                        const firstSubmenuLink = submenu.querySelector('a');
                        if (firstSubmenuLink) {
                            firstSubmenuLink.focus();
                        }
                    }
                }
            });
        }
    });
    
    // Close submenu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.menu-item-has-children')) {
            const openSubmenus = document.querySelectorAll('.menu-item-has-children a[aria-expanded="true"]');
            openSubmenus.forEach(function(link) {
                link.setAttribute('aria-expanded', 'false');
            });
        }
    });
    
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Focus the target element for screen readers
                targetElement.focus();
            }
        });
    });
    
    // Lazy loading for images
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(function(img) {
            imageObserver.observe(img);
        });
    }
    
    // Form validation enhancement
    const forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
        form.addEventListener('submit', function(e) {
            const requiredFields = form.querySelectorAll('[required]');
            let hasErrors = false;
            
            requiredFields.forEach(function(field) {
                if (!field.value.trim()) {
                    hasErrors = true;
                    field.classList.add('error');
                    
                    // Create or update error message
                    let errorMessage = field.parentNode.querySelector('.error-message');
                    if (!errorMessage) {
                        errorMessage = document.createElement('span');
                        errorMessage.className = 'error-message';
                        errorMessage.textContent = 'To pole jest wymagane';
                        field.parentNode.appendChild(errorMessage);
                    }
                } else {
                    field.classList.remove('error');
                    const errorMessage = field.parentNode.querySelector('.error-message');
                    if (errorMessage) {
                        errorMessage.remove();
                    }
                }
            });
            
            if (hasErrors) {
                e.preventDefault();
                // Focus first error field
                const firstError = form.querySelector('.error');
                if (firstError) {
                    firstError.focus();
                }
            }
        });
    });
    
    // Announce page changes to screen readers
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Announce content change
                    const announcement = document.createElement('div');
                    announcement.setAttribute('aria-live', 'polite');
                    announcement.setAttribute('aria-atomic', 'true');
                    announcement.className = 'visually-hidden';
                    announcement.textContent = 'Treść strony została zaktualizowana';
                    document.body.appendChild(announcement);
                    
                    setTimeout(function() {
                        document.body.removeChild(announcement);
                    }, 1000);
                }
            });
        });
        
        observer.observe(mainContent, {
            childList: true,
            subtree: true
        });
    }
    
    // Keyboard navigation for news cards
    const newsCards = document.querySelectorAll('.news-card, .news-item');
    newsCards.forEach(function(card) {
        card.setAttribute('tabindex', '0');
        
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const link = card.querySelector('a');
                if (link) {
                    link.click();
                }
            }
        });
    });
    
    // Ensure all interactive elements are keyboard accessible
    const interactiveElements = document.querySelectorAll('button, a, input, textarea, select, [tabindex]');
    interactiveElements.forEach(function(element) {
        element.addEventListener('focus', function() {
            this.classList.add('focused');
        });
        
        element.addEventListener('blur', function() {
            this.classList.remove('focused');
        });
    });
    
    // Print functionality - improved
    function setupPrintButtons() {
        // Handle action-btn print buttons (with ⎙ icon)
        const actionPrintButtons = document.querySelectorAll('.action-btn');
        actionPrintButtons.forEach(function(button) {
            const printIcon = button.querySelector('.action-icon');
            if (printIcon && printIcon.textContent.includes('⎙')) {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('Action print button clicked');
                    printPage();
                });
            }
        });
        
        // Handle news-detail print buttons
        const newsPrintButtons = document.querySelectorAll('.print-btn');
        newsPrintButtons.forEach(function(button) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('News print button clicked');
                printPage();
            });
        });
    }
    
    // Print function
    function printPage() {
        try {
            // Method 1: Try window.print() first
            if (typeof window.print === 'function') {
                window.print();
                return;
            }
            
            // Method 2: Try document.execCommand (deprecated but still works in some browsers)
            if (document.execCommand && document.execCommand('print')) {
                return;
            }
            
            // Method 3: Fallback - create print window
            createPrintWindow();
            
        } catch (error) {
            console.error('Print error:', error);
            // Fallback to print window
            createPrintWindow();
        }
    }
    
    // Create print window as fallback
    function createPrintWindow() {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            alert('Nie można otworzyć okna drukowania. Sprawdź czy popup-blocker nie jest włączony.');
            return;
        }
        
        // Get the article content
        const articleContainer = document.querySelector('.article-container');
        const content = articleContainer ? articleContainer.outerHTML : document.body.innerHTML;
        
        // Create print HTML
        const printHTML = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Drukuj - ${document.title}</title>
                    <style>
                        body { 
                            font-family: 'Inter', Arial, sans-serif; 
                            margin: 20px; 
                            line-height: 1.6;
                            color: #000;
                        }
                        .article-container {
                            border: none;
                            box-shadow: none;
                            margin: 0;
                            padding: 0;
                        }
                        .article-header {
                            background: white;
                            color: #000;
                            border-bottom: 2px solid #2b7cb3;
                            margin-bottom: 20px;
                            padding: 10px 0;
                        }
                        .article-content {
                            padding: 0;
                        }
                        .article-content h1,
                        .article-content h2,
                        .article-content h3 {
                            color: #000;
                            page-break-after: avoid;
                        }
                        .article-content p {
                            margin-bottom: 10px;
                            text-align: justify;
                        }
                        a {
                            color: #000;
                            text-decoration: underline;
                        }
                        @media print {
                            body { margin: 0; }
                            .article-container,
                            .article-content,
                            .article-header {
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${content}
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        };
                    </script>
                </body>
            </html>
        `;
        
        printWindow.document.write(printHTML);
        printWindow.document.close();
    }
    
    // Setup print buttons when DOM is ready
    setupPrintButtons();
    
    // Setup back to top button
    setupBackToTopButton();
    
    // Initialize article view tracking
    initializeArticleTracking();
    
    // Setup share buttons
    const shareButtons = document.querySelectorAll('.share-btn');
    shareButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Share button clicked');
            shareNews();
        });
    });
    
    // Setup PDF buttons
    const pdfButtons = document.querySelectorAll('.pdf-btn');
    pdfButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('PDF button clicked');
            generatePDF();
        });
    });
    
    // Setup metryczka buttons
    const metryczkaButtons = document.querySelectorAll('.metryczka-btn');
    metryczkaButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Metryczka button clicked');
            showMetryczka();
        });
    });
});

// Setup back to top button functionality
function setupBackToTopButton() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    
    if (!backToTopBtn) {
        console.log('Back to top button not found');
        return;
    }
    
    // Show/hide button based on scroll position
    function toggleBackToTopButton() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const showThreshold = 300; // Show button after scrolling 300px
        
        if (scrollTop > showThreshold) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    }
    
    // Add scroll event listener with throttling for better performance
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = setTimeout(toggleBackToTopButton, 10);
    });
    
    // Add click event listener for smooth scroll to top
    backToTopBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Smooth scroll to top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Focus on the top of the page for accessibility
        const skipLink = document.querySelector('.skip-links a');
        if (skipLink) {
            skipLink.focus();
        } else {
            // Fallback: focus on the first focusable element
            const firstFocusableElement = document.querySelector('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
            if (firstFocusableElement) {
                firstFocusableElement.focus();
            }
        }
        
        // Announce to screen readers
        announceToScreenReader('Przewinięto do góry strony');
    });
    
    // Keyboard accessibility - handle Enter and Space keys
    backToTopBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });
    
    // Initial check on page load
    toggleBackToTopButton();
}

// Share function (global)
function shareNews() {
    if (navigator.share) {
        // Use native Web Share API if available
        navigator.share({
            title: document.title,
            url: window.location.href
        }).catch(function(error) {
            console.log('Error sharing:', error);
            fallbackShare();
        });
    } else {
        // Fallback to copy to clipboard
        fallbackShare();
    }
}

// Fallback share function
function fallbackShare() {
    const url = window.location.href;
    const title = document.title;
    
    // Try to copy to clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function() {
            alert('Link skopiowany do schowka: ' + url);
        }).catch(function() {
            promptShare(url);
        });
    } else {
        promptShare(url);
    }
}

// Prompt user to copy URL manually
function promptShare(url) {
    const shareText = prompt('Skopiuj ten link, aby udostępnić stronę:', url);
    if (shareText) {
        // Select the text in the prompt
        document.execCommand('selectAll');
    }
}

// PDF generation function
function generatePDF() {
    try {
        // Check if jsPDF is available
        if (typeof window.jsPDF === 'undefined') {
            // Load jsPDF library dynamically
            loadJSPDF().then(function() {
                createPDF();
            }).catch(function(error) {
                console.error('Error loading jsPDF:', error);
                alert('Błąd ładowania biblioteki PDF. Spróbuj ponownie za chwilę.');
            });
        } else {
            createPDF();
        }
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Błąd generowania PDF. Spróbuj ponownie.');
    }
}

// Load jsPDF library - local first, then CDN fallbacks
function loadJSPDF() {
    return new Promise(function(resolve, reject) {
        // Check if already loaded
        if (typeof window.jsPDF !== 'undefined') {
            resolve();
            return;
        }
        
        // Try local file first, then CDN sources
        const sources = [
            '/js/libs/jspdf.umd.min.js',  // Local file
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
            'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
        ];
        
        let currentIndex = 0;
        
        function tryLoadScript() {
            if (currentIndex >= sources.length) {
                reject(new Error('Failed to load jsPDF from all sources'));
                return;
            }
            
            const script = document.createElement('script');
            script.src = sources[currentIndex];
            script.onload = function() {
                console.log('jsPDF loaded from:', sources[currentIndex]);
                resolve();
            };
            script.onerror = function() {
                console.warn('Failed to load jsPDF from:', sources[currentIndex]);
                currentIndex++;
                tryLoadScript();
            };
            document.head.appendChild(script);
        }
        
        tryLoadScript();
    });
}

// Create PDF using jsPDF with Polish characters support
function createPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Get article content
        const articleContainer = document.querySelector('.article-container');
        if (!articleContainer) {
            alert('Nie można znaleźć treści artykułu do zapisania.');
            return;
        }
        
        // Get article title
        const titleElement = articleContainer.querySelector('.article-title h1, .article-header h1, h1');
        const title = titleElement ? titleElement.textContent.trim() : 'Artykuł';
        
        // Get article content
        const contentElement = articleContainer.querySelector('.article-content');
        const content = contentElement ? contentElement.textContent.trim() : articleContainer.textContent.trim();
        
        // Function to properly handle Polish characters for PDF
        function prepareTextForPDF(text) {
            console.log('Original text:', text);
            
            // Convert Polish characters to ASCII equivalents for better compatibility
            // This ensures the PDF displays correctly with basic fonts
            const convertedText = text
                // Lowercase Polish characters
                .replace(/ą/g, 'a')
                .replace(/ć/g, 'c')
                .replace(/ę/g, 'e')
                .replace(/ł/g, 'l')
                .replace(/ń/g, 'n')
                .replace(/ó/g, 'o')
                .replace(/ś/g, 's')
                .replace(/ź/g, 'z')
                .replace(/ż/g, 'z')
                // Uppercase Polish characters
                .replace(/Ą/g, 'A')
                .replace(/Ć/g, 'C')
                .replace(/Ę/g, 'E')
                .replace(/Ł/g, 'L')
                .replace(/Ń/g, 'N')
                .replace(/Ó/g, 'O')
                .replace(/Ś/g, 'S')
                .replace(/Ź/g, 'Z')
                .replace(/Ż/g, 'Z');
            
            console.log('Converted text:', convertedText);
            return convertedText;
        }
        
        // Set font - use default font that supports basic characters
        doc.setFont('helvetica');
        
        // Add title with Polish characters
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const preparedTitle = prepareTextForPDF(title);
        
        // Add title text (already converted to ASCII)
        doc.text(preparedTitle, 20, 30);
        
        // Add separator line
        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);
        
        // Add content with Polish characters
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        // Prepare Polish characters in content
        const preparedContent = prepareTextForPDF(content);
        
        // Split content into lines that fit the page width
        const pageWidth = 170; // A4 width minus margins
        const lines = doc.splitTextToSize(preparedContent, pageWidth);
        
        let yPosition = 50;
        const pageHeight = 280; // A4 height minus margins
        const lineHeight = 7;
        
        lines.forEach(function(line) {
            if (yPosition > pageHeight) {
                doc.addPage();
                yPosition = 20;
            }
            
            // Add text (already converted to ASCII)
            doc.text(line, 20, yPosition);
            
            yPosition += lineHeight;
        });
        
        // Add footer with date and URL
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            
            // Add footer text (converted to ASCII)
            doc.text(`Strona ${i} z ${pageCount}`, 20, 290);
            doc.text(`Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}`, 20, 295);
            doc.text(`Zrodlo: ${window.location.href}`, 20, 300);
        }
        
        // Save the PDF with prepared filename
        const fileName = prepareTextForPDF(title).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') + '.pdf';
        doc.save(fileName);
        
        console.log('PDF generated successfully with Polish characters support');
        
    } catch (error) {
        console.error('Error creating PDF:', error);
        fallbackPDF();
    }
}

// Fallback PDF generation - automatic PDF creation
function fallbackPDF() {
    // Create a simple HTML page for automatic PDF generation
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
        alert('Nie można otworzyć okna do generowania PDF. Sprawdź czy popup-blocker nie jest włączony.');
        return;
    }
    
    const articleContainer = document.querySelector('.article-container');
    const content = articleContainer ? articleContainer.outerHTML : document.body.innerHTML;
    
    // Get article title for filename
    const titleElement = articleContainer ? articleContainer.querySelector('.article-title h1, .article-header h1, h1') : null;
    const title = titleElement ? titleElement.textContent.trim() : 'Artykul';
    const fileName = title.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]/g, '').replace(/\s+/g, '_') + '.pdf';
    
    const pdfHTML = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <title>PDF - ${document.title}</title>
                <style>
                    body { 
                        font-family: 'Inter', Arial, sans-serif; 
                        margin: 20px; 
                        line-height: 1.6;
                        color: #000;
                        font-size: 12pt;
                    }
                    .article-container {
                        border: none;
                        box-shadow: none;
                        margin: 0;
                        padding: 0;
                    }
                    .article-header {
                        background: white;
                        color: #000;
                        border-bottom: 2px solid #2b7cb3;
                        margin-bottom: 20px;
                        padding: 10px 0;
                    }
                    .article-content {
                        padding: 0;
                    }
                    .article-content h1,
                    .article-content h2,
                    .article-content h3 {
                        color: #000;
                        page-break-after: avoid;
                    }
                    .article-content p {
                        margin-bottom: 10px;
                        text-align: justify;
                    }
                    a {
                        color: #000;
                        text-decoration: underline;
                    }
                    @media print {
                        body { margin: 0; }
                        .article-container,
                        .article-content,
                        .article-header {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                ${content}
                <div style="margin-top: 30px; font-size: 10pt; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
                    <p>Wygenerowano: ${new Date().toLocaleString('pl-PL')}</p>
                    <p>Źródło: ${window.location.href}</p>
                </div>
                <script>
                    window.onload = function() {
                        // Auto-print for PDF generation
                        setTimeout(function() {
                            window.print();
                        }, 1000);
                    };
                </script>
            </body>
        </html>
    `;
    
    printWindow.document.write(pdfHTML);
    printWindow.document.close();
    
    // Show instructions for PDF save
    alert('Otworzyło się okno z treścią. Użyj Ctrl+P (Cmd+P na Mac) i wybierz "Zapisz jako PDF" aby zapisać plik jako: ' + fileName);
}



// Utility functions
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'visually-hidden';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(function() {
        document.body.removeChild(announcement);
    }, 1000);
}

// Metryczka function - simplified to just show the modal rendered by EJS
function showMetryczka() {
    console.log('Metryczka button clicked - showing EJS modal');
    
    // Find the modal that was rendered by EJS
    const modal = document.getElementById('metryczkaModal');
    if (!modal) {
        alert('Nie można znaleźć modalu metryczki.');
        return;
    }
    
    // Fill in the URL field (can't be done in EJS)
    const urlField = modal.querySelector('.url-field');
    if (urlField) {
        urlField.textContent = window.location.href;
    }
    
    // Show modal (modal is already rendered by EJS with real data)
    modal.style.display = 'flex';
    
    // Add event listeners for close buttons
    const closeButton = modal.querySelector('.metryczka-close');
    const footerCloseButton = modal.querySelector('.metryczka-footer .btn');
    
    if (closeButton) closeButton.addEventListener('click', closeMetryczka);
    if (footerCloseButton) footerCloseButton.addEventListener('click', closeMetryczka);
    
    // Add escape key listener
    const escapeHandler = function(e) {
        if (e.key === 'Escape') {
            closeMetryczka();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Add click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeMetryczka();
        }
    });
}

// Close metryczka function
function closeMetryczka() {
    const modal = document.getElementById('metryczkaModal');
    if (modal) {
        // Just hide the modal instead of removing it
        modal.style.display = 'none';
        // Reset any animation styles
        modal.style.opacity = '';
        modal.style.transform = '';
    }
}

// Initialize article tracking
function initializeArticleTracking() {
    console.log('Initializing article tracking...');
    
    // Look for article ID in data attributes
    const contentArea = document.querySelector('.content-area[data-article-id]');
    if (contentArea) {
        const articleId = contentArea.getAttribute('data-article-id');
        console.log('Found article ID in content area:', articleId);
        
        if (articleId && articleId !== '' && !isNaN(articleId)) {
            console.log('Valid article ID found, tracking view...');
            trackArticleView(parseInt(articleId));
        } else {
            console.log('No valid article ID found');
        }
    } else {
        console.log('No content area with article ID found');
    }
}

// Track article view with IP rate limiting (1 per hour)
function trackArticleView(articleId) {
    console.log('trackArticleView called with ID:', articleId);
    if (!articleId || isNaN(articleId)) {
        console.log('Invalid article ID for tracking:', articleId);
        return;
    }
    
    // Check localStorage to avoid unnecessary requests
    const storageKey = `article_view_${articleId}`;
    const lastViewTime = localStorage.getItem(storageKey);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // If viewed within last hour from this browser, don't track
    if (lastViewTime && (now - parseInt(lastViewTime)) < oneHour) {
        console.log(`Article ${articleId} already viewed from this browser within the last hour`);
        return;
    }
    
    // Send view tracking request
    console.log(`Sending POST request to: /api/article/${articleId}/view`);
    fetch(`/api/article/${articleId}/view`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        // Check if response is ok and content type is JSON
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Response is not JSON');
        }
        
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log(`View count updated for article ${articleId}: ${data.viewCount}`);
            // Store the view time in localStorage
            localStorage.setItem(storageKey, now.toString());
            
            // Update view count in metryczka if modal is open
            const modal = document.getElementById('metryczkaModal');
            if (modal && modal.style.display === 'flex') {
                console.log('Modal is open, trying to update view count');
                const viewCountCell = modal.querySelector('#viewCountCell');
                console.log('View count cell found:', viewCountCell);
                if (viewCountCell) {
                    console.log('Updating view count from', viewCountCell.textContent, 'to', data.viewCount);
                    viewCountCell.textContent = data.viewCount;
                } else {
                    console.error('Could not find view count cell in modal');
                }
            } else {
                console.log('Modal not open or not found');
            }
        } else {
            console.log(`View tracking: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Error tracking article view:', error);
    });
}

// Test API connection
function testAPI() {
    console.log('Testing API connection...');
    fetch('/api/test')
        .then(response => response.json())
        .then(data => {
            console.log('API test successful:', data);
        })
        .catch(error => {
            console.error('API test failed:', error);
        });
}

// Manual test function for debugging
function testArticleTracking() {
    const contentArea = document.querySelector('.content-area[data-article-id]');
    if (contentArea) {
        const articleId = contentArea.getAttribute('data-article-id');
        console.log('Manual test - Article ID:', articleId);
        if (articleId && articleId !== '') {
            trackArticleView(parseInt(articleId));
        }
    } else {
        console.log('Manual test - No content area found');
    }
}

// Export for use in other scripts
window.WeterynariaPisz = {
    announceToScreenReader: announceToScreenReader,
    trackArticleView: trackArticleView,
    testArticleTracking: testArticleTracking,
    initializeArticleTracking: initializeArticleTracking,
    testAPI: testAPI
};
