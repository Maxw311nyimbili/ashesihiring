// Global variables
let availableDates = [];
let selectedDateObj = null;
let calendar = null;
let confirmationModal = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap modal
    confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));

    // Initialize event listeners
    initEventListeners();

    // Initialize calendar and load data
    initializeAdminCalendar();
    loadAvailableDates();
    loadFacultyScheduleStatus();
    updateStats();
});

// Initialize event listeners
function initEventListeners() {
    // Refresh data button
    document.getElementById('refresh-data').addEventListener('click', function() {
        loadAvailableDates();
        loadFacultyScheduleStatus();
        updateStats();
        showToast('Data refreshed successfully', 'success');
    });

    // Add date button
    document.getElementById('add-date-btn').addEventListener('click', function() {
        if (selectedDateObj) {
            addAvailableDate(selectedDateObj.dateStr);
        } else {
            showToast('Please select a date first', 'warning');
        }
    });

    // Clear selection button
    document.getElementById('clear-selection-btn').addEventListener('click', function() {
        clearDateSelection();
    });

    // Remove all dates button
    document.getElementById('remove-all-dates-btn').addEventListener('click', function() {
        if (availableDates.length === 0) {
            showToast('No dates to remove', 'info');
            return;
        }

        // Show confirmation modal
        document.getElementById('modal-title').textContent = 'Remove All Dates';
        document.getElementById('modal-message').textContent = 'Are you sure you want to remove all available dates? This action cannot be undone.';

        // Set up the confirm action
        document.getElementById('confirm-action-btn').onclick = function() {
            removeAllDates();
            confirmationModal.hide();
        };

        confirmationModal.show();
    });

    // Save dates button
    document.getElementById('save-dates-btn').addEventListener('click', function() {
        saveAvailableDates();
    });

    // Export report button
    document.getElementById('export-report-btn').addEventListener('click', function() {
        exportSchedulingReport();
    });
}

// Initialize the calendar
function initializeAdminCalendar() {
    // Show loading
    document.getElementById('loading-calendar').classList.remove('d-none');
    document.getElementById('admin-calendar-container').classList.add('d-none');

    // Get current date for min date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Initialize Flatpickr calendar
    calendar = flatpickr("#admin-date-calendar", {
        inline: true,
        minDate: todayStr,
        maxDate: new Date().fp_incr(180), // Next 180 days
        dateFormat: "Y-m-d",
        disableMobile: true,
        altInput: true,
        altFormat: "F j, Y",
        static: true,
        onChange: function(selectedDates, dateStr) {
            if (selectedDates.length > 0) {
                selectedDateObj = {
                    date: selectedDates[0],
                    dateStr: dateStr
                };
            }
        }
    });

    // Hide loading, show calendar
    document.getElementById('loading-calendar').classList.add('d-none');
    document.getElementById('admin-calendar-container').classList.remove('d-none');
}

// Load available dates from API
function loadAvailableDates() {
    // Show loading
    document.getElementById('loading-dates-list').classList.remove('d-none');
    document.getElementById('available-dates-container').classList.add('d-none');
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
            document.getElementById('loading-dates-list').classList.add('d-none');

            if (availableDates.length === 0) {
                // Show no dates message
                document.getElementById('no-dates-message').classList.remove('d-none');
            } else {
                // Display dates
                displayAvailableDates(availableDates);
                document.getElementById('available-dates-container').classList.remove('d-none');
            }

            // Update calendar to highlight available dates
            updateCalendarWithAvailableDates();

            // Update stats
            updateStats();
        })
        .catch(error => {
            console.error('Error loading available dates:', error);
            showToast('Error loading available dates', 'error');

            // Hide loading, show error message
            document.getElementById('loading-dates-list').classList.add('d-none');
            document.getElementById('no-dates-message').innerHTML = `
                <i class="fas fa-exclamation-circle me-2"></i> Error loading available dates. Please try again later.
            `;
            document.getElementById('no-dates-message').classList.remove('d-none');
        });
}

// Display available dates
function displayAvailableDates(dates) {
    const datesContainer = document.getElementById('dates-container');
    datesContainer.innerHTML = '';

    if (dates.length === 0) {
        document.getElementById('no-dates-message').classList.remove('d-none');
        document.getElementById('available-dates-container').classList.add('d-none');
        return;
    }

    // Sort dates chronologically
    dates.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Display the dates
    dates.forEach(dateObj => {
        const formattedDate = formatDateForDisplay(dateObj.date);
        const dateElement = document.createElement('div');
        dateElement.className = 'date-badge';
        dateElement.dataset.date = dateObj.date;
        dateElement.innerHTML = `
            <i class="fas fa-calendar-day me-1"></i> ${formattedDate}
            <span class="badge-remove" data-date="${dateObj.date}">
                <i class="fas fa-times"></i>
            </span>
        `;
        datesContainer.appendChild(dateElement);

        // Add click event to remove button
        dateElement.querySelector('.badge-remove').addEventListener('click', function(e) {
            e.stopPropagation();
            const dateToRemove = this.dataset.date;
            removeDateFromList(dateToRemove);
        });
    });

    document.getElementById('available-dates-container').classList.remove('d-none');
    document.getElementById('no-dates-message').classList.add('d-none');

    // Update stats
    document.getElementById('available-dates-count').textContent = dates.length;
}

// Update calendar to highlight available dates
function updateCalendarWithAvailableDates() {
    if (!calendar) return;

    // Get dates in array format
    const enabledDates = availableDates.map(dateObj => dateObj.date);

    // Update calendar
    calendar.clear();
    calendar.set('enable', enabledDates);

    // Create custom date class for styling
    const customDateClass = function(date) {
        const dateStr = date.toISOString().split('T')[0];
        if (enabledDates.includes(dateStr)) {
            return 'selected-date';
        }
        return '';
    };

    calendar.set('onDayCreate', function(dObj, dStr, fp, dayElem) {
        const dateStr = dayElem.dateObj.toISOString().split('T')[0];
        if (enabledDates.includes(dateStr)) {
            dayElem.classList.add('selected-date');
        }
    });
}

// Add a date to the available dates list
function addAvailableDate(dateStr) {
    // Check if date already exists
    const exists = availableDates.some(dateObj => dateObj.date === dateStr);
    if (exists) {
        showToast('This date is already available', 'info');
        return;
    }

    // Add date to local array
    availableDates.push({ date: dateStr });

    // Update UI
    displayAvailableDates(availableDates);
    updateCalendarWithAvailableDates();

    // Clear selection
    clearDateSelection();

    showToast('Date added to available list', 'success');
}

// Remove a date from the available list
function removeDateFromList(dateStr) {
    // Remove from local array
    availableDates = availableDates.filter(dateObj => dateObj.date !== dateStr);

    // Update UI
    displayAvailableDates(availableDates);
    updateCalendarWithAvailableDates();

    showToast('Date removed from available list', 'success');
}

// Remove all dates
function removeAllDates() {
    // Clear local array
    availableDates = [];

    // Update UI
    document.getElementById('dates-container').innerHTML = '';
    document.getElementById('available-dates-container').classList.add('d-none');
    document.getElementById('no-dates-message').classList.remove('d-none');
    updateCalendarWithAvailableDates();

    // Update stats
    document.getElementById('available-dates-count').textContent = '0';

    showToast('All dates have been removed', 'success');
}

// Clear date selection
function clearDateSelection() {
    selectedDateObj = null;
    calendar.clear();
}

// Save available dates to API
function saveAvailableDates() {
    // Show loading toast
    showToast('Saving available dates...', 'info');

    // Prepare data
    const datesToSave = availableDates.map(dateObj => dateObj.date);

    // Call API to save dates
    fetch('/api/admin/save_available_dates', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dates: datesToSave }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        showToast('Available dates saved successfully', 'success');

        // Refresh data
        loadFacultyScheduleStatus();
    })
    .catch(error => {
        console.error('Error saving available dates:', error);
        showToast('Error saving available dates', 'error');
    });
}

// Load faculty schedule status
function loadFacultyScheduleStatus() {
    const tableBody = document.getElementById('faculty-schedule-table');
    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4">
                <div class="spinner-border text-secondary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-2 mb-0">Loading faculty data...</p>
            </td>
        </tr>
    `;

    // Fetch faculty interview data
    fetch('/api/faculty_interviews')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displayFacultyScheduleTable(data);
        })
        .catch(error => {
            console.error('Error loading faculty schedule status:', error);
            showToast('Error loading faculty data', 'error');

            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <p class="text-danger mb-0">
                            <i class="fas fa-exclamation-circle me-2"></i> Error loading faculty data
                        </p>
                    </td>
                </tr>
            `;
        });
}

// Display faculty schedule table
function displayFacultyScheduleTable(interviews) {
    const tableBody = document.getElementById('faculty-schedule-table');

    if (!interviews || interviews.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <p class="text-muted mb-0">No faculty scheduling data available</p>
                </td>
            </tr>
        `;
        document.getElementById('faculty-count').textContent = '0';
        return;
    }

    // Group by faculty
    const facultyMap = {};
    interviews.forEach(interview => {
        if (!facultyMap[interview.faculty_id]) {
            facultyMap[interview.faculty_id] = {
                id: interview.faculty_id,
                name: interview.faculty_name,
                email: interview.email,
                interview_date: interview.interview_date,
                count: 1
            };
        } else {
            facultyMap[interview.faculty_id].count++;
        }
    });

    // Convert to array
    const facultyArray = Object.values(facultyMap);

    // Get all faculty (including those without schedules)
    fetch('/api/admin/all_faculty')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(allFaculty => {
            // Merge with existing data
            allFaculty.forEach(faculty => {
                if (!facultyMap[faculty.id]) {
                    facultyArray.push({
                        id: faculty.id,
                        name: faculty.username,
                        email: faculty.email,
                        interview_date: null,
                        count: 0
                    });
                }
            });

            // Sort by name
            facultyArray.sort((a, b) => a.name.localeCompare(b.name));

            // Update table
            tableBody.innerHTML = '';
            facultyArray.forEach(faculty => {
                // Format date
                const dateFormatted = faculty.interview_date ? formatDateForDisplay(faculty.interview_date) : 'Not scheduled';

                // Determine status
                let status = '';
                let statusClass = '';

                if (faculty.interview_date) {
                    status = 'Scheduled';
                    statusClass = 'text-success';
                } else {
                    status = 'Not Scheduled';
                    statusClass = 'text-danger';
                }

                // Create table row
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="me-3">
                                <div class="avatar bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center"
                                    style="width:40px; height:40px; font-weight:500">
                                    ${getInitials(faculty.name)}
                                </div>
                            </div>
                            <div>
                                <h6 class="mb-0">${faculty.name}</h6>
                            </div>
                        </div>
                    </td>
                    <td>${faculty.email}</td>
                    <td>${dateFormatted}</td>
                    <td><span class="${statusClass} fw-medium">${status}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-secondary me-1 email-faculty-btn" data-id="${faculty.id}" data-email="${faculty.email}" data-name="${faculty.name}">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary view-schedule-btn" data-id="${faculty.id}" data-name="${faculty.name}">
                            <i class="fas fa-calendar-alt"></i>
                        </button>
                    </td>
                `;

                tableBody.appendChild(row);
            });

            // Update faculty count
            document.getElementById('faculty-count').textContent = facultyArray.length;

            // Add event listeners to buttons
            document.querySelectorAll('.email-faculty-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const facultyId = this.dataset.id;
                    const facultyEmail = this.dataset.email;
                    const facultyName = this.dataset.name;
                    sendEmailToFaculty(facultyId, facultyEmail, facultyName);
                });
            });

            document.querySelectorAll('.view-schedule-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const facultyId = this.dataset.id;
                    const facultyName = this.dataset.name;
                    viewFacultySchedule(facultyId, facultyName);
                });
            });
        })
        .catch(error => {
            console.error('Error loading all faculty:', error);

            // Still display the data we have
            tableBody.innerHTML = '';
            facultyArray.forEach(faculty => {
                // Format date
                const dateFormatted = faculty.interview_date ? formatDateForDisplay(faculty.interview_date) : 'Not scheduled';

                // Create table row
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${faculty.name}</td>
                    <td>${faculty.email}</td>
                    <td>${dateFormatted}</td>
                    <td>${faculty.interview_date ? 'Scheduled' : 'Not Scheduled'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-secondary email-faculty-btn" data-id="${faculty.id}">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </td>
                `;

                tableBody.appendChild(row);
            });

            // Update faculty count
            document.getElementById('faculty-count').textContent = facultyArray.length;
        });
}

// Update statistics counters
function updateStats() {
    // Update available dates count
    document.getElementById('available-dates-count').textContent = availableDates.length;

    // Fetch faculty stats
    fetch('/api/admin/dashboard_stats')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update faculty scheduled count
            document.getElementById('faculty-scheduled-count').textContent = data.faculty.scheduled;

            // Update total interviews count
            let totalInterviews = 0;
            if (data.interviews && data.interviews.upcoming) {
                data.interviews.upcoming.forEach(interview => {
                    totalInterviews += interview.candidates;
                });
            }
            document.getElementById('total-interviews-count').textContent = totalInterviews;
        })
        .catch(error => {
            console.error('Error loading dashboard stats:', error);
        });
}

// View faculty schedule details
function viewFacultySchedule(facultyId, facultyName) {
    // In a real implementation, this would open a modal with detailed schedule
    showToast(`Viewing schedule for ${facultyName}`, 'info');

    // This could be replaced with a proper modal showing detailed schedule
    setTimeout(() => {
        window.location.href = `/faculty_scheduling_detail?faculty_id=${facultyId}`;
    }, 1000);
}

// Send email to faculty
function sendEmailToFaculty(facultyId, facultyEmail, facultyName) {
    // Show email compose modal or redirect to email client
    const subject = encodeURIComponent('Faculty Interview Schedule');
    const body = encodeURIComponent(`Dear ${facultyName},\n\nPlease remember to select your available interview dates from the faculty scheduling portal.\n\nBest regards,\nAdmin Team`);

    window.open(`mailto:${facultyEmail}?subject=${subject}&body=${body}`);
}

// Export scheduling report
function exportSchedulingReport() {
    showToast('Generating scheduling report...', 'info');

    // In a real implementation, this would call an API to generate a PDF report
    // For now, let's simulate a download
    setTimeout(() => {
        showToast('Report generated successfully!', 'success');
    }, 1500);
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

// Get user initials from name
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase();
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