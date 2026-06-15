document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allNotes = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedNote = null;

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const lastUpdatedText = document.getElementById('last-updated-text');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterContainer = document.getElementById('filter-container');
    const notesGrid = document.getElementById('notes-grid');
    const skeletonGrid = document.getElementById('skeleton-grid');
    const emptyState = document.getElementById('empty-state');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const tweetPreviewText = document.getElementById('tweet-preview-text');
    const charCount = document.getElementById('char-count');
    const progressRingBar = document.getElementById('progress-ring-bar');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const publishTweetBtn = document.getElementById('publish-tweet-btn');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    /* ==========================================================================
       API FETCH & DATA MANAGEMENT
       ========================================================================== */
    async function fetchReleaseNotes(forceRefresh = false) {
        setLoadingState(true);
        try {
            const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to retrieve release notes.');
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Server error.');
            
            allNotes = data.notes;
            lastUpdatedText.textContent = `Updated: ${data.last_fetched}`;
            
            // Show/hide Export CSV button based on data availability
            if (allNotes && allNotes.length > 0) {
                exportCsvBtn.style.display = 'inline-flex';
            } else {
                exportCsvBtn.style.display = 'none';
            }

            // Success toast if manual refresh
            if (forceRefresh) {
                showToast('Release notes successfully updated!', 'success');
            }
            
            renderNotes();
        } catch (error) {
            console.error('Fetch Error:', error);
            showToast(error.message || 'Error fetching release notes.', 'error');
            lastUpdatedText.textContent = 'Failed to load updates';
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshIcon.classList.add('spin');
            refreshBtn.disabled = true;
            exportCsvBtn.disabled = true;
            const statusDot = document.querySelector('.status-dot');
            statusDot.classList.add('syncing');
            
            notesGrid.style.display = 'none';
            emptyState.style.display = 'none';
            skeletonGrid.style.display = 'grid';
        } else {
            refreshIcon.classList.remove('spin');
            refreshBtn.disabled = false;
            exportCsvBtn.disabled = false;
            const statusDot = document.querySelector('.status-dot');
            statusDot.classList.remove('syncing');
            
            skeletonGrid.style.display = 'none';
        }
    }

    /* ==========================================================================
       RENDERING & FILTERING
       ========================================================================== */
    function getFilteredNotes() {
        return allNotes.filter(note => {
            // Category Filter
            const typeMatch = activeFilter === 'all' || note.type === activeFilter;
            
            // Search Query Filter
            const lowerSearch = searchQuery.toLowerCase();
            const searchMatch = !searchQuery || 
                note.type.toLowerCase().includes(lowerSearch) ||
                note.date.toLowerCase().includes(lowerSearch) ||
                note.text.toLowerCase().includes(lowerSearch);
                
            return typeMatch && searchMatch;
        });
    }

    function renderNotes() {
        // Clear grid
        notesGrid.innerHTML = '';

        const filteredNotes = getFilteredNotes();

        // Toggle empty state or grid display
        if (filteredNotes.length === 0) {
            notesGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        notesGrid.style.display = 'grid';

        // Build Note Cards
        filteredNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.setAttribute('data-type', note.type);
            card.id = `card-${note.id}`;

            // Handle type tag styling
            const safeType = note.type || 'Update';

            card.innerHTML = `
                <div>
                    <div class="note-header">
                        <span class="note-badge">${safeType}</span>
                        <span class="note-date">${note.date}</span>
                    </div>
                    <div class="note-body">
                        ${note.html}
                    </div>
                </div>
                <div class="note-footer">
                    <button class="btn-action btn-copy-action" title="Copy text to clipboard" aria-label="Copy update details">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="btn-action btn-tweet-action" title="Compose post on X" aria-label="Share update on X">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            `;

            // Attach Event Listeners to actions
            card.querySelector('.btn-copy-action').addEventListener('click', () => {
                const formattedText = `[BigQuery Release Note - ${note.date}]\nType: ${safeType}\n\nDescription: ${note.text}\n\nFull details: ${note.link}`;
                copyTextToClipboard(formattedText);
            });

            card.querySelector('.btn-tweet-action').addEventListener('click', () => {
                openTweetModal(note);
            });

            notesGrid.appendChild(card);
        });
    }

    /* ==========================================================================
       TWEET BUILDER & SHARING MODAL
       ========================================================================== */
    function openTweetModal(note) {
        selectedNote = note;
        
        // Clean text description length to avoid overflow in default template
        let tweetSnippet = note.text;
        if (tweetSnippet.length > 180) {
            tweetSnippet = tweetSnippet.substring(0, 177) + '...';
        }

        // Standardized Tweet Template
        const template = `📢 BigQuery Update (${note.date}):\n\n${tweetSnippet}\n\nRead more details here:\n${note.link}`;
        
        tweetTextarea.value = template;
        updateTweetCharCount();

        // Reveal Modal
        tweetModal.style.display = 'flex';
        tweetTextarea.focus();
        document.body.style.overflow = 'hidden'; // Lock scrolling
    }

    function closeTweetModal() {
        tweetModal.style.display = 'none';
        document.body.style.overflow = ''; // Unlock scrolling
        selectedNote = null;
    }

    function updateTweetCharCount() {
        const textLength = tweetTextarea.value.length;
        const limit = 280;
        const remaining = limit - textLength;

        charCount.textContent = remaining;
        tweetPreviewText.textContent = tweetTextarea.value || 'What\'s happening?';

        // Update progress ring
        const radius = 10;
        const circumference = 2 * Math.PI * radius;
        const progress = Math.min(textLength / limit, 1);
        const offset = circumference - (progress * circumference);
        progressRingBar.style.strokeDashoffset = offset;

        // Change color based on text length
        if (remaining < 0) {
            progressRingBar.style.stroke = '#ef4444'; // Red
            charCount.style.color = '#ef4444';
        } else if (remaining <= 20) {
            progressRingBar.style.stroke = '#f59e0b'; // Orange
            charCount.style.color = '#f59e0b';
        } else {
            progressRingBar.style.stroke = '#3b82f6'; // Blue
            charCount.style.color = '';
        }
    }

    /* ==========================================================================
       EVENT LISTENERS & UTILITIES
       ========================================================================== */
    // Export CSV and Refresh buttons
    exportCsvBtn.addEventListener('click', exportToCSV);
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));

    function exportToCSV() {
        const filteredNotes = getFilteredNotes();
        if (filteredNotes.length === 0) {
            showToast('No notes matching current filters to export.', 'error');
            return;
        }

        const headers = ['Date', 'Type', 'Description', 'Link'];
        
        function escapeCSVCell(value) {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }

        const csvRows = [headers.map(escapeCSVCell).join(',')];

        filteredNotes.forEach(note => {
            const row = [note.date, note.type, note.text, note.link];
            csvRows.push(row.map(escapeCSVCell).join(','));
        });

        const csvString = csvRows.join('\r\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        
        const dateStr = new Date().toISOString().slice(0, 10);
        const category = activeFilter === 'all' ? 'all' : activeFilter.toLowerCase();
        link.setAttribute("download", `bigquery_releases_${category}_${dateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Exported ${filteredNotes.length} notes to CSV!`, 'success');
    }
    
    // Search input handlers
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderNotes();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderNotes();
        searchInput.focus();
    });

    // Reset filters button in Empty State
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        activeFilter = 'all';
        
        // Reset filter pill active state
        document.querySelectorAll('.filter-pill').forEach(pill => {
            if (pill.getAttribute('data-type') === 'all') {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
        
        renderNotes();
    });

    // Filter pills click handler
    filterContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            // Remove active class from all pills
            document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
            // Add active class to clicked pill
            e.target.classList.add('active');
            
            activeFilter = e.target.getAttribute('data-type');
            renderNotes();
        }
    });

    // Modal close handlers
    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });

    // Textarea input watcher
    tweetTextarea.addEventListener('input', updateTweetCharCount);

    // Copy tweet button
    copyTweetBtn.addEventListener('click', () => {
        copyTextToClipboard(tweetTextarea.value);
    });

    // Publish tweet button
    publishTweetBtn.addEventListener('click', () => {
        const text = encodeURIComponent(tweetTextarea.value);
        const url = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        closeTweetModal();
        showToast('Shared composer launched!', 'success');
    });

    // Copy to clipboard helper
    function copyTextToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Clipboard copy failed:', err);
            showToast('Failed to copy text.', 'error');
        });
    }

    // Toast notification manager
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '<i class="fa-solid fa-circle-info"></i>';
        if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
        if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';

        toast.innerHTML = `
            ${icon}
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);

        // Slide out after 3.5s, then remove
        setTimeout(() => {
            toast.classList.add('toast-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3500);
    }

    // Initialize application
    fetchReleaseNotes(false);
});
