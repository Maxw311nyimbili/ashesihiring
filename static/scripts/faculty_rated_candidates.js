// Global variables
let ratedCandidates = [];
let availableDates = [];
let modalObjects = {};
let calendar = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap modals
    modalObjects.candidateDetails = new bootstrap.Modal(document.getElementById('candidateDetailsModal'));

    // Initialize event listeners
    initEventListeners();

    // Load rated candidates
    loadRatedCandidates();

    // Load available dates
    loadAvailableDates();
});

// Initialize event listeners
function initEventListeners() {
    // Search functionality
    document.getElementById('candidate-search').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterCandidateList(searchTerm);
    });
}

// Load rated candidates from API
function loadRatedCandidates() {
    return fetch('/api/faculty_rated_applicants')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            ratedCandidates = data;
            displayCandidateList(ratedCandidates);
            updateStatCounts();
        })
        .catch(error => {
            console.error('Error loading rated candidates:', error);
            document.getElementById('candidate-list').innerHTML = `
                <li class="list-group-item text-center py-4 text-danger">
                    <i class="fas fa-exclamation-circle me-2"></i> Error loading candidates
                </li>
            `;
        });
}

// Load available dates from API
function loadAvailableDates() {
    // Show loading
    document.getElementById('loading-calendar').classList.remove('d-none');
    document.getElementById('calendar-container').classList.add('d-none');
    document.getElementById('available-dates-list').classList.add('d-none');
    document.getElementById('no-dates-message').classList.add('d-none');

    fetch('/api/available_dates')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            availableDates = data;

            // Hide loading
            document.getElementById('loading-calendar').classList.add('d-none');

            if (availableDates.length === 0) {
                // Show no dates message
                document.getElementById('no-dates-message').classList.remove('d-none');
            } else {
                // Initialize calendar
                initializeCalendar(availableDates);

                // Show calendar and dates list
                document.getElementById('calendar-container').classList.remove('d-none');
                document.getElementById('available-dates-list').classList.remove('d-none');

                // Display dates list
                displayDatesList(availableDates);
            }
        })
        .catch(error => {
            console.error('Error loading available dates:', error);
            document.getElementById('loading-calendar').classList.add('d-none');
            document.getElementById('no-dates-message').innerHTML = `
                <i class="fas fa-exclamation-circle me-2"></i> Error loading available dates. Please try again later.
            `;
            document.getElementById('no-dates-message').classList.remove('d-none');
        });
}

// Initialize the calendar with available dates
function initializeCalendar(availableDates) {
    // Convert dates to proper format
    const enabledDates = availableDates.map(dateObj => dateObj.date);

    // Initialize Flatpickr calendar
    calendar = flatpickr("#date-calendar", {
        inline: true,
        enable: enabledDates,
        minDate: "today",
        maxDate: new Date().fp_incr(120), // Next 120 days
        dateFormat: "Y-m-d",
        disableMobile: true,
        altInput: true,
        altFormat: "F j, Y",
        static: true,
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            // Add class to available dates
            if (enabledDates.includes(dayElem.dateObj.toISOString().split('T')[0])) {
                dayElem.classList.add('available-date');
            }
        }
    });
}

// Display the list of available dates
function displayDatesList(dates) {
    const datesContainer = document.getElementById('dates-container');
    datesContainer.innerHTML = '';

    if (dates.length === 0) {
        datesContainer.innerHTML = '<p class="text-muted">No available dates.</p>';
        return;
    }

    // Sort dates chronologically
    dates.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Display the dates
    dates.forEach(dateObj => {
        const formattedDate = formatDateForDisplay(dateObj.date);
        const dateElement = document.createElement('span');
        dateElement.className = 'date-badge';
        dateElement.innerHTML = `<i class="fas fa-calendar-day me-1"></i> ${formattedDate}`;
        datesContainer.appendChild(dateElement);
    });
}

// Display the list of rated candidates
function displayCandidateList(candidates) {
    const candidateList = document.getElementById('candidate-list');

    if (candidates.length === 0) {
        candidateList.innerHTML = `
            <li class="list-group-item text-center py-4 text-muted">
                <i class="fas fa-user-slash me-2"></i> No rated candidates found
            </li>
        `;
        document.getElementById('candidate-count').textContent = '0';
        return;
    }

    // Update count badge
    document.getElementById('candidate-count').textContent = candidates.length;

    // Clear and build the list
    candidateList.innerHTML = '';
    candidates.forEach(candidate => {
        // Create rating stars
        const ratingStars = generateRatingStars(candidate.rating);

        // Determine rating badge class
        let ratingBadgeClass = 'low-rating';
        if (candidate.rating >= 4) {
            ratingBadgeClass = 'high-rating';
        } else if (candidate.rating >= 3) {
            ratingBadgeClass = 'medium-rating';
        }

        const listItem = document.createElement('li');
        listItem.className = 'list-group-item candidate-item py-3 px-3';
        listItem.dataset.candidateId = candidate.id;

        listItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="candidate-info">
                    <h6 class="mb-1 fw-bold">${candidate.name}</h6>
                    <div class="d-flex align-items-center mb-1">
                        <div class="rating-stars me-2">${ratingStars}</div>
                    </div>
                    <div class="status-badge">
                        <span class="candidate-badge ${ratingBadgeClass}">
                            <i class="fas fa-star me-1"></i> Rating: ${candidate.rating}
                        </span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-secondary view-btn rounded-pill" data-id="${candidate.id}">
                    <i class="fas fa-eye me-1"></i> View
                </button>
            </div>
        `;

        candidateList.appendChild(listItem);

        // Add click event for the view button
        listItem.querySelector('.view-btn').addEventListener('click', function() {
            const candidateId = this.dataset.id;
            openCandidateModal(candidateId);
        });
    });
}

// Filter the candidate list by search term
function filterCandidateList(searchTerm) {
    const candidateItems = document.querySelectorAll('.candidate-item');
    let visibleCount = 0;

    candidateItems.forEach(item => {
        const candidateName = item.querySelector('h6').textContent.toLowerCase();
        if (candidateName.includes(searchTerm)) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    // Update visible count
    document.getElementById('candidate-count').textContent = visibleCount;

    // Show no results message if needed
    if (visibleCount === 0 && searchTerm) {
        const candidateList = document.getElementById('candidate-list');
        if (!document.getElementById('no-search-results')) {
            const noResults = document.createElement('li');
            noResults.id = 'no-search-results';
            noResults.className = 'list-group-item text-center py-3 text-muted';
            noResults.innerHTML = `
                <i class="fas fa-search me-2"></i> No candidates match "${searchTerm}"
            `;
            candidateList.appendChild(noResults);
        }
    } else {
        const noResults = document.getElementById('no-search-results');
        if (noResults) {
            noResults.remove();
        }
    }
}

// Open candidate details modal
function openCandidateModal(candidateId) {
    // Find the candidate
    const candidate = ratedCandidates.find(c => c.id == candidateId);
    if (!candidate) {
        showToast('Candidate not found', 'error');
        return;
    }

    // Update the modal content
    document.getElementById('candidate-modal-name').textContent = candidate.name;
    document.getElementById('modal-display-rating').innerHTML = generateRatingStars(candidate.rating);

    // Interests display
    let interestsHtml = 'No interests specified';
    if (candidate.interests && candidate.interests.length > 0) {
        interestsHtml = candidate.interests
            .map(interest => `<span class="tag-pill">${interest}</span>`)
            .join(' ');
    }
    document.getElementById('modal-display-interests').innerHTML = interestsHtml;

    // Interest prompt display
    const interestPromptContainer = document.getElementById('modal-interest-prompt-container');
    const displayInterestPrompt = document.getElementById('modal-display-interest-prompt');

    if (candidate.interest_prompt) {
        interestPromptContainer.classList.remove('d-none');
        displayInterestPrompt.textContent = candidate.interest_prompt === 'Yes' ?
            'Yes, this candidate has qualities that make them a desirable FI despite the low rating.' :
            'No, this candidate does not have qualities that make them a desirable FI.';
    } else {
        interestPromptContainer.classList.add('d-none');
    }

    // Comment display
    const commentContainer = document.getElementById('modal-comment-container');
    const displayComment = document.getElementById('modal-display-comment');

    if (candidate.comment) {
        commentContainer.classList.remove('d-none');
        displayComment.textContent = candidate.comment;
    } else {
        commentContainer.classList.add('d-none');
    }

    // Document links (if available)
    const documentLinks = document.getElementById('modal-document-links');
    if (candidate.details) {
        documentLinks.innerHTML = candidate.details;
    } else {
        documentLinks.innerHTML = '<p class="text-muted mb-0">No documents available</p>';
    }

    // Show the modal
    modalObjects.candidateDetails.show();
}

// Update stat counters in the header
function updateStatCounts() {
    // Update total rated count
    document.getElementById('total-rated-count').textContent = ratedCandidates.length;

    // Update high rated count
    const highRatedCount = ratedCandidates.filter(c => c.rating >= 4).length;
    document.getElementById('high-rated-count').textContent = highRatedCount;
}

// Generate HTML for rating stars
function generateRatingStars(rating) {
    rating = parseInt(rating) || 0;
    let starsHtml = '';

    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHtml += '<i class="fas fa-star text-warning"></i>';
        } else {
            starsHtml += '<i class="far fa-star text-muted"></i>';
        }
    }

    return starsHtml;
}

// Format date for display
function formatDateForDisplay(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Show toast notification
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-white border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    // Set appropriate background class
    switch(type) {
        case 'success':
            toast.classList.add('bg-success');
            break;
        case 'error':
            toast.classList.add('bg-danger');
            break;
        case 'warning':
            toast.classList.add('bg-warning');
            break;
        case 'info':
            toast.classList.add('bg-info');
            break;
        default:
            toast.classList.add('bg-dark');
    }

    // Icon based on type
    let icon;
    switch(type) {
        case 'success':
            icon = 'check-circle';
            break;
        case 'error':
            icon = 'times-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
        case 'info':
            icon = 'info-circle';
            break;
        default:
            icon = 'bell';
    }

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${icon} me-2"></i> ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();

    // Remove the toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        if (toastContainer.contains(toast)) {
            toastContainer.removeChild(toast);
        }
    });
}