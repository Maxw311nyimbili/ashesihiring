// Global variables
let availableDates = [];
let selectedDate = null;
let facultyId = null;
let facultyName = null;
let calendar = null;
let confirmationModal = null;
let scheduledCandidates = [];
let currentSchedule = null;
let ratedCandidates = [];


document.addEventListener('DOMContentLoaded', function() {
    // Get faculty information from hidden fields
    facultyId = document.getElementById('faculty-id').value;
    facultyName = document.getElementById('faculty-name').value;

    // Initialize Bootstrap modals
    confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    candidateDetailsModal = new bootstrap.Modal(document.getElementById('candidateDetailsModal'));
    scheduledCandidatesModal = new bootstrap.Modal(document.getElementById('scheduledCandidatesModal'));

    // Initialize event listeners
    initEventListeners();

    // Load data
    loadAvailableDates();
    loadScheduleStatus();
    loadRatedCandidates();
});

// Load available dates from API
function loadAvailableDates() {
    // Show loading
    document.getElementById('loading-calendar').classList.remove('d-none');
    document.getElementById('calendar-container').classList.add('d-none');
    document.getElementById('available-dates-list').classList.add('d-none');
    document.getElementById('no-dates-message').classList.add('d-none');

    // Fetch available dates from API
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
function initializeCalendar(dates) {
    // Convert dates to proper format
    const enabledDates = dates.map(dateObj => dateObj.date);

    // Initialize Flatpickr calendar
    calendar = flatpickr("#date-calendar", {
        inline: true,
        enable: enabledDates,
        minDate: "today",
        maxDate: new Date().fp_incr(180), // Next 180 days
        dateFormat: "Y-m-d",
        disableMobile: true,
        altInput: true,
        altFormat: "F j, Y",
        static: true,
        onChange: function(selectedDates, dateStr) {
            if (selectedDates.length > 0) {
                selectedDate = dateStr;
                highlightSelectedDate(dateStr);
            }
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            // Add class to available dates
            if (enabledDates.includes(dayElem.dateObj.toISOString().split('T')[0])) {
                dayElem.classList.add('available-date');
            }

            // If this faculty already has a schedule, highlight that date
            if (currentSchedule && currentSchedule.date === dayElem.dateObj.toISOString().split('T')[0]) {
                dayElem.classList.add('selected-date');
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
        dateElement.dataset.date = dateObj.date;
        dateElement.innerHTML = `<i class="fas fa-calendar-day me-1"></i> ${formattedDate}`;

        // If this is the faculty's current scheduled date, highlight it
        if (currentSchedule && dateObj.date === currentSchedule.date) {
            dateElement.style.backgroundColor = 'rgba(173, 66, 69, 0.1)';
            dateElement.style.color = 'var(--primary)';
            dateElement.style.borderColor = 'rgba(173, 66, 69, 0.2)';
        }

        datesContainer.appendChild(dateElement);

        // Add click event to select this date
        dateElement.addEventListener('click', function() {
            selectedDate = dateObj.date;
            calendar.setDate(selectedDate);
            highlightSelectedDate(selectedDate);
        });
    });
}

// Highlight selected date in the dates list
function highlightSelectedDate(dateStr) {
    // Remove highlight from all dates
    document.querySelectorAll('.date-badge').forEach(badge => {
        badge.style.backgroundColor = '';
        badge.style.color = '';
        badge.style.borderColor = '';
    });

    // Add highlight to selected date
    const selectedBadge = document.querySelector(`.date-badge[data-date="${dateStr}"]`);
    if (selectedBadge) {
        selectedBadge.style.backgroundColor = 'rgba(173, 66, 69, 0.1)';
        selectedBadge.style.color = 'var(--primary)';
        selectedBadge.style.borderColor = 'rgba(173, 66, 69, 0.2)';
    }
}

// Load faculty schedule status
function loadScheduleStatus() {
    // Fetch faculty schedule status
    fetch(`/api/faculty_interviews?faculty_id=${facultyId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Filter interviews for this faculty
            const facultyInterviews = data.filter(interview => interview.faculty_id == facultyId);

            if (facultyInterviews.length > 0) {
                // Get the latest interview date (in case there are multiple)
                currentSchedule = {
                    date: facultyInterviews[0].interview_date,
                    candidateCount: facultyInterviews.length
                };

                // Update calendar to highlight current date if it exists
                if (calendar) {
                    calendar.setDate(currentSchedule.date);
                }
            }
        })
        .catch(error => {
            console.error('Error loading schedule status:', error);
        });
}

// Load rated candidates
function loadRatedCandidates() {
    const candidateList = document.getElementById('candidate-list');

    // Clear the list and show loading placeholders
    candidateList.innerHTML = `
        <li class="list-group-item px-3 py-3">
            <div class="shimmer shimmer-item"></div>
        </li>
        <li class="list-group-item px-3 py-3">
            <div class="shimmer shimmer-item"></div>
        </li>
        <li class="list-group-item px-3 py-3">
            <div class="shimmer shimmer-item"></div>
        </li>
    `;

    // Fetch rated candidates from API
    fetch(`/api/faculty_rated_applicants`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            ratedCandidates = data;
            displayRatedCandidates(ratedCandidates);
            updateCandidateStats(ratedCandidates);
        })
        .catch(error => {
            console.error('Error loading rated candidates:', error);
            candidateList.innerHTML = `
                <li class="list-group-item text-center py-4">
                    <div class="text-danger mb-2">
                        <i class="fas fa-exclamation-circle fa-2x"></i>
                    </div>
                    <p class="mb-0">Error loading your rated candidates. Please try again later.</p>
                </li>
            `;
        });
}

// Display rated candidates
function displayRatedCandidates(candidates) {
    const candidateList = document.getElementById('candidate-list');
    const candidateCount = document.getElementById('candidate-count');

    // Update candidate count
    candidateCount.textContent = candidates.length;

    // Clear the list
    candidateList.innerHTML = '';

    if (candidates.length === 0) {
        candidateList.innerHTML = `
            <li class="list-group-item text-center py-4">
                <div class="text-muted mb-2">
                    <i class="fas fa-user-slash fa-2x"></i>
                </div>
                <p class="mb-0">You haven't rated any candidates yet.</p>
            </li>
        `;
        return;
    }

    // Sort candidates by rating (highest first)
    candidates.sort((a, b) => b.rating - a.rating);

    // Add candidates to the list
    candidates.forEach(candidate => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item px-3 py-3';
        listItem.dataset.id = candidate.id;

        // Determine rating class
        let ratingClass = 'low-rating';
        if (candidate.rating >= 4) {
            ratingClass = 'high-rating';
        } else if (candidate.rating >= 3) {
            ratingClass = 'medium-rating';
        }

        // Create interest tags
        const interestTags = candidate.interests ?
            candidate.interests.map(interest => `<span class="tag-pill">${interest}</span>`).join(' ') : '';

        listItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${candidate.name}</h6>
                    <div class="mt-1 mb-2">
                        ${interestTags}
                    </div>
                </div>
                <span class="candidate-badge ${ratingClass}">
                    <i class="fas fa-star me-1"></i> ${candidate.rating}
                </span>
            </div>
            <div class="d-flex justify-content-end">
                <button class="btn btn-sm btn-outline-secondary view-candidate-btn" data-id="${candidate.id}">
                    <i class="fas fa-eye me-1"></i> View Details
                </button>
            </div>
        `;

        candidateList.appendChild(listItem);

        // Add click event for the view details button
        listItem.querySelector('.view-candidate-btn').addEventListener('click', function() {
            showCandidateDetails(candidate);
        });
    });

    // Add search functionality
    document.getElementById('candidate-search').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        filterCandidates(searchTerm);
    });
}

// Filter candidates based on search term
function filterCandidates(searchTerm) {
    const candidates = document.querySelectorAll('#candidate-list li[data-id]');

    candidates.forEach(candidate => {
        const candidateName = candidate.querySelector('h6').textContent.toLowerCase();
        const interests = Array.from(candidate.querySelectorAll('.tag-pill'))
            .map(tag => tag.textContent.toLowerCase());

        // Check if search term is in name or interests
        const matchesName = candidateName.includes(searchTerm);
        const matchesInterest = interests.some(interest => interest.includes(searchTerm));

        if (matchesName || matchesInterest || searchTerm === '') {
            candidate.classList.remove('d-none');
        } else {
            candidate.classList.add('d-none');
        }
    });
}

// Update candidate statistics
function updateCandidateStats(candidates) {
    const totalRatedCount = document.getElementById('candidate-count');

    // Count total candidates
    const total = candidates.length;

    totalRatedCount.textContent = total;
}

// Show candidate details in modal
function showCandidateDetails(candidate) {
    // Set candidate name in modal title
    document.getElementById('candidate-modal-name').textContent = candidate.name;

    // Display rating with stars
    const modalRating = document.getElementById('modal-display-rating');
    let ratingHtml = '';

    for (let i = 1; i <= 5; i++) {
        if (i <= candidate.rating) {
            ratingHtml += '<i class="fas fa-star text-warning me-1"></i>';
        } else {
            ratingHtml += '<i class="far fa-star text-warning me-1"></i>';
        }
    }
    ratingHtml += ` <span class="ms-2">${candidate.rating}/5</span>`;
    modalRating.innerHTML = ratingHtml;

    // Display interests
    const interestsContainer = document.getElementById('modal-display-interests');
    if (candidate.interests && candidate.interests.length > 0) {
        interestsContainer.innerHTML = candidate.interests.map(
            interest => `<span class="tag-pill">${interest}</span>`
        ).join(' ');
    } else {
        interestsContainer.innerHTML = '<span class="text-muted">No interests specified</span>';
    }

    // Display interest prompt
    const promptContainer = document.getElementById('modal-interest-prompt-container');
    const promptDisplay = document.getElementById('modal-display-interest-prompt');

    if (candidate.interest_prompt) {
        promptDisplay.textContent = candidate.interest_prompt;
        promptContainer.classList.remove('d-none');
    } else {
        promptContainer.classList.add('d-none');
    }

    // Display comment
    const commentContainer = document.getElementById('modal-comment-container');
    const commentDisplay = document.getElementById('modal-display-comment');

    if (candidate.comment) {
        commentDisplay.textContent = candidate.comment;
        commentContainer.classList.remove('d-none');
    } else {
        commentContainer.classList.add('d-none');
    }

    // Display document links
    const documentLinks = document.getElementById('modal-document-links');
    if (candidate.details) {
        documentLinks.innerHTML = candidate.details;
    } else {
        documentLinks.innerHTML = '<span class="text-muted">No documents available</span>';
    }

    // Show the modal
    candidateDetailsModal.show();
}

// Save faculty schedule
function saveSchedule() {
    if (!selectedDate) {
        showToast('Please select a date first', 'warning');
        return;
    }

    // Show loading toast
    showToast('Saving your schedule...', 'info');

    // Ensure dates are in YYYY-MM-DD format for MySQL
    const formattedNewDate = formatDateForServer(selectedDate);
    const formattedOldDate = currentSchedule ? formatDateForServer(currentSchedule.date) : null;

    console.log('Saving schedule with new date:', formattedNewDate, 'old date:', formattedOldDate);

    // Call API to save schedule
    fetch('/api/update_faculty_schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            faculty_id: facultyId,  // Add faculty_id explicitly
            new_date: formattedNewDate,
            old_date: formattedOldDate
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || 'Network response was not ok');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast('Schedule saved successfully!', 'success');

            // Refresh data
            loadScheduleStatus();

            // Update current schedule
            currentSchedule = {
                date: selectedDate,
                candidateCount: 0
            };
        } else {
            throw new Error(data.message || 'Error saving schedule');
        }
    })
    .catch(error => {
        console.error('Error saving schedule:', error);
        showToast('Error saving schedule: ' + error.message, 'error');
    });
}

// Load scheduled candidates
function loadScheduledCandidates() {
    if (!currentSchedule) {
        showToast('You need to schedule an interview date first', 'warning');
        return;
    }

    // Show loading
    document.getElementById('scheduled-loading').classList.remove('d-none');
    document.getElementById('scheduled-candidate-list').classList.add('d-none');

    // Display the interview date
    document.getElementById('scheduled-date-display').textContent = formatDateForDisplay(currentSchedule.date);

    // Fetch scheduled candidates
    fetch(`/api/faculty_interviews?faculty_id=${facultyId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Filter interviews for this faculty and date
            scheduledCandidates = data.filter(interview =>
                interview.faculty_id == facultyId &&
                interview.interview_date === currentSchedule.date
            );

            // Hide loading, show content
            document.getElementById('scheduled-loading').classList.add('d-none');
            document.getElementById('scheduled-candidate-list').classList.remove('d-none');

            const container = document.getElementById('scheduled-candidates-container');
            const noScheduledMessage = document.getElementById('no-scheduled-message');

            if (scheduledCandidates.length === 0) {
                noScheduledMessage.classList.remove('d-none');
                container.innerHTML = '';
                return;
            }

            noScheduledMessage.classList.add('d-none');
            container.innerHTML = '';

            // Display each scheduled candidate
            scheduledCandidates.forEach((candidate, index) => {
                const candidateEl = document.createElement('div');
                candidateEl.className = 'candidate-item fade-in';

                // Determine rating class
                let ratingClass = 'low-rating';
                if (candidate.rating >= 4) {
                    ratingClass = 'high-rating';
                } else if (candidate.rating >= 3) {
                    ratingClass = 'medium-rating';
                }

                candidateEl.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${candidate.applicant_name}</h6>
                            <div class="text-muted small">
                                <span class="me-2"><i class="fas fa-book me-1"></i> ${candidate.course_name || 'No course preference'}</span>
                                <span><i class="fas fa-award me-1"></i> Preference: ${candidate.preference || 'None'}</span>
                            </div>
                        </div>
                        <span class="rating-badge ${ratingClass}">
                            <i class="fas fa-star me-1"></i> Rating: ${candidate.rating || 'N/A'}
                        </span>
                    </div>
                `;

                container.appendChild(candidateEl);
            });

            // Show the modal
            scheduledCandidatesModal.show();
        })
        .catch(error => {
            console.error('Error loading scheduled candidates:', error);

            // Hide loading, show error
            document.getElementById('scheduled-loading').classList.add('d-none');
            document.getElementById('scheduled-candidate-list').classList.remove('d-none');

            document.getElementById('scheduled-candidates-container').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i> Error loading scheduled candidates. Please try again later.
                </div>
            `;

            // Show the modal despite the error
            scheduledCandidatesModal.show();
        });
}

// Print interview schedule
function printInterviewSchedule() {
    if (!currentSchedule) {
        showToast('You need to schedule an interview date first', 'warning');
        return;
    }

    if (scheduledCandidates.length === 0) {
        // Load scheduled candidates first
        fetch(`/api/faculty_interviews?faculty_id=${facultyId}`)
            .then(response => response.json())
            .then(data => {
                scheduledCandidates = data.filter(interview =>
                    interview.faculty_id == facultyId &&
                    interview.interview_date === currentSchedule.date
                );

                if (scheduledCandidates.length === 0) {
                    showToast('No candidates are scheduled for interviews', 'info');
                    return;
                }

                generatePrintableSchedule();
            })
            .catch(error => {
                console.error('Error loading scheduled candidates for print:', error);
                showToast('Error loading candidates. Please try again.', 'error');
            });
    } else {
        generatePrintableSchedule();
    }
}

// Generate printable schedule
function generatePrintableSchedule() {
    // Create printable content
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Interview Schedule - ${formatDateForDisplay(currentSchedule.date)}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #ddd;
                }
                .date {
                    color: #ad4245;
                    font-weight: bold;
                }
                .candidate {
                    margin-bottom: 15px;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                .candidate h3 {
                    margin-top: 0;
                    color: #236465;
                }
                .candidate-info {
                    margin-bottom: 5px;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 0.8em;
                    color: #999;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 15px;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Faculty Interview Schedule</h1>
                <h2>Date: <span class="date">${formatDateForDisplay(currentSchedule.date)}</span></h2>
                <h3>Faculty: ${facultyName}</h3>
            </div>

            <p>Total candidates: ${scheduledCandidates.length}</p>

            <div class="candidates">
    `);

    // Add each candidate
    scheduledCandidates.forEach((candidate, index) => {
        printWindow.document.write(`
            <div class="candidate">
                <h3>Candidate ${index + 1}: ${candidate.applicant_name || 'Unnamed Candidate'}</h3>
                <div class="candidate-info"><strong>Course:</strong> ${candidate.course_name || 'No course preference'}</div>
                <div class="candidate-info"><strong>Preference:</strong> ${candidate.preference || 'None'}</div>
                <div class="candidate-info"><strong>Rating:</strong> ${candidate.rating || 'Not rated'}</div>
            </div>
        `);
    });

    // Close HTML
    printWindow.document.write(`
            </div>

            <div class="footer">
                <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>

            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()">Print Schedule</button>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
}

// Format date for display
function formatDateForDisplay(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format date for server (YYYY-MM-DD)
function formatDateForServer(dateString) {
    if (!dateString) return null;

    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }

    try {
        // Handle various date formats
        const date = new Date(dateString);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateString);

            // Try to parse European format (DD/MM/YYYY)
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
                const parts = dateString.split('/');
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                const europeanDate = new Date(year, month, day);

                if (!isNaN(europeanDate.getTime())) {
                    const y = europeanDate.getFullYear();
                    const m = String(europeanDate.getMonth() + 1).padStart(2, '0');
                    const d = String(europeanDate.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                }
            }

            return dateString; // Return original if cannot parse
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString; // Return original in case of error
    }
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

// Initialize event listeners
function initEventListeners() {
    // Refresh data button
    document.getElementById('refresh-data').addEventListener('click', function() {
        loadAvailableDates();
        loadScheduleStatus();
        loadRatedCandidates();
        showToast('Data refreshed', 'success');
    });

    // Save schedule button
    document.getElementById('save-schedule-btn').addEventListener('click', function() {
        if (!selectedDate) {
            showToast('Please select a date first', 'warning');
            return;
        }

        // Show confirmation modal
        document.getElementById('modal-selected-date').textContent = formatDateForDisplay(selectedDate);
        confirmationModal.show();
    });

    // Confirm schedule button (in modal)
    document.getElementById('confirm-schedule-btn').addEventListener('click', function() {
        saveSchedule();
        confirmationModal.hide();
    });

    // Print modal button
    document.getElementById('print-modal-btn').addEventListener('click', function() {
        printInterviewSchedule();
    });

    // Candidate search functionality
    document.getElementById('candidate-search').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        filterCandidates(searchTerm);
    });
}