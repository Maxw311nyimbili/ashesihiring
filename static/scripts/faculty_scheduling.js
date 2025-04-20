// Global variables
let availableDates = [];
let selectedDate = null;
let facultyId = null;
let facultyName = null;
let calendar = null;
let confirmationModal = null;
let scheduledCandidates = [];
let currentSchedule = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get faculty information from hidden fields
    facultyId = document.getElementById('faculty-id').value;
    facultyName = document.getElementById('faculty-name').value;

    // Initialize Bootstrap modal
    confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));

    // Initialize event listeners
    initEventListeners();

    // Load data
    loadAvailableDates();
    loadScheduleStatus();
    loadScheduledCandidates();
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
    const statusContainer = document.getElementById('schedule-status-container');

    // Show loading
    statusContainer.innerHTML = `
        <div class="text-center py-2">
            <div class="spinner-border text-secondary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="text-muted mt-2 mb-0">Loading your schedule status...</p>
        </div>
    `;

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

                // Display scheduled status
                statusContainer.innerHTML = `
                    <div class="status-badge scheduled">
                        <i class="fas fa-check-circle me-2"></i>
                        <div>
                            <strong>You are scheduled for interviews on ${formatDateForDisplay(currentSchedule.date)}</strong><br>
                            <span class="small">${currentSchedule.candidateCount} candidate${currentSchedule.candidateCount !== 1 ? 's' : ''} scheduled for interviews</span>
                        </div>
                    </div>
                `;

                // Update calendar to highlight current date
                if (calendar) {
                    calendar.setDate(currentSchedule.date);
                }
            } else {
                // Display not scheduled status
                statusContainer.innerHTML = `
                    <div class="status-badge not-scheduled">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        <div>
                            <strong>You have not scheduled an interview date</strong><br>
                            <span class="small">Please select a date from the available options below</span>
                        </div>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading schedule status:', error);

            // Display error status
            statusContainer.innerHTML = `
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading your schedule status. Please try refreshing the page.
                </div>
            `;
        });
}

// Load scheduled candidates
function loadScheduledCandidates() {
    const candidatesContainer = document.getElementById('candidates-list');

    // Show loading
    document.getElementById('loading-candidates').classList.remove('d-none');
    document.getElementById('scheduled-candidates-container').classList.add('d-none');
    document.getElementById('no-candidates-message').classList.add('d-none');

    // Fetch scheduled candidates
    fetch(`/api/faculty_interviews?faculty_id=${facultyId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading
            document.getElementById('loading-candidates').classList.add('d-none');

            // Filter interviews for this faculty
            scheduledCandidates = data.filter(interview => interview.faculty_id == facultyId);

            if (scheduledCandidates.length === 0) {
                // Show no candidates message
                document.getElementById('no-candidates-message').classList.remove('d-none');
                return;
            }

            // Show candidates container
            document.getElementById('scheduled-candidates-container').classList.remove('d-none');

            // Update candidate count
            document.getElementById('candidate-count').textContent = scheduledCandidates.length;

            // Display candidates
            candidatesContainer.innerHTML = '';

            scheduledCandidates.forEach(candidate => {
                // Determine rating class for badge
                let ratingClass = 'low-rating';
                if (candidate.rating >= 4) {
                    ratingClass = 'high-rating';
                } else if (candidate.rating >= 3) {
                    ratingClass = 'medium-rating';
                }

                // Create candidate item
                const candidateItem = document.createElement('div');
                candidateItem.className = 'candidate-item';
                candidateItem.innerHTML = `
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

                candidatesContainer.appendChild(candidateItem);
            });
        })
        .catch(error => {
            console.error('Error loading scheduled candidates:', error);

            // Hide loading, show error
            document.getElementById('loading-candidates').classList.add('d-none');
            document.getElementById('no-candidates-message').classList.remove('d-none');
            document.getElementById('no-candidates-message').innerHTML = `
                <i class="fas fa-exclamation-circle me-2"></i> Error loading scheduled candidates. Please try again later.
            `;
        });
}

// Save faculty schedule
function saveSchedule() {
    if (!selectedDate) {
        showToast('Please select a date first', 'warning');
        return;
    }

    // Show loading toast
    showToast('Saving your schedule...', 'info');

    // Call API to save schedule
    fetch('/api/update_faculty_schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            new_date: selectedDate,
            old_date: currentSchedule ? currentSchedule.date : null
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast('Schedule saved successfully!', 'success');

            // Refresh data
            loadScheduleStatus();
            loadScheduledCandidates();

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
        showToast('Error saving schedule. Please try again.', 'error');
    });
}

// Print interview schedule
function printInterviewSchedule() {
    if (!currentSchedule) {
        showToast('You need to schedule an interview date first', 'warning');
        return;
    }

    if (scheduledCandidates.length === 0) {
        showToast('No candidates are scheduled for interviews', 'info');
        return;
    }

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
                <h3>Candidate ${index + 1}: ${candidate.applicant_name}</h3>
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
        loadScheduledCandidates();
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

    // Print schedule button
    document.getElementById('print-schedule-btn').addEventListener('click', function() {
        printInterviewSchedule();
    });
}