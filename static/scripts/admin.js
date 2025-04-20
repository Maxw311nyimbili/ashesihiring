// Global variables
let availableDates = [];
let selectedDateObj = null;
let calendar = null;
let confirmationModal = null;
let candidatesData = [];

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
    loadCandidatesWithRatings();
    updateStats();
});

// Initialize event listeners
function initEventListeners() {
    // Refresh data button
    document.getElementById('refresh-data').addEventListener('click', function() {
        loadAvailableDates();
        loadFacultyScheduleStatus();
        loadCandidatesWithRatings();
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

    // Send reminder button for all unscheduled faculty
    document.getElementById('send-all-reminders-btn').addEventListener('click', function() {
        sendRemindersToAllUnscheduled();
    });
}

// Initialize the calendar - Modified to have all days active
function initializeAdminCalendar() {
    // Show loading
    document.getElementById('loading-calendar').classList.remove('d-none');
    document.getElementById('admin-calendar-container').classList.add('d-none');

    // Get current date for min date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Initialize Flatpickr calendar with all days active
    calendar = flatpickr("#admin-date-calendar", {
        inline: true,
        minDate: todayStr,
        maxDate: new Date().fp_incr(180), // Next 180 days
        dateFormat: "Y-m-d",
        disableMobile: true,
        altInput: true,
        altFormat: "F j, Y",
        static: true,
        // No "enable" setting here, which means all days will be active
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
    const availableDateStrings = availableDates.map(dateObj => dateObj.date);

    // Create custom date class for styling
    const customDateClass = function(date) {
        const dateStr = date.toISOString().split('T')[0];
        if (availableDateStrings.includes(dateStr)) {
            return 'selected-date';
        }
        return '';
    };

    // Clear any previous onDayCreate handlers
    calendar.set('onDayCreate', null);

    // Set new onDayCreate handler
    calendar.set('onDayCreate', function(dObj, dStr, fp, dayElem) {
        const dateStr = dayElem.dateObj.toISOString().split('T')[0];
        if (availableDateStrings.includes(dateStr)) {
            dayElem.classList.add('selected-date');
        } else {
            dayElem.classList.remove('selected-date');
        }
    });

    // Trigger redraw
    const currentMonth = calendar.currentMonth;
    const currentYear = calendar.currentYear;
    calendar.changeMonth(currentMonth, false);
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
    updateCalendarWithAvailableDates(); // Re-apply highlighting
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

// NEW: Load candidates with average ratings
function loadCandidatesWithRatings() {
    const tableBody = document.getElementById('candidates-table');

    if (!tableBody) {
        console.error('Candidates table not found');
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4">
                <div class="spinner-border text-secondary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-2 mb-0">Loading candidate data...</p>
            </td>
        </tr>
    `;

    // Fetch candidates data with ratings
    fetch('/api/candidates_with_ratings')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            candidatesData = data;
            displayCandidatesTable(data);
        })
        .catch(error => {
            console.error('Error loading candidates with ratings:', error);
            showToast('Error loading candidate data', 'error');

            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <p class="text-danger mb-0">
                            <i class="fas fa-exclamation-circle me-2"></i> Error loading candidate data
                        </p>
                    </td>
                </tr>
            `;
        });
}

// NEW: Display candidates table with average ratings
function displayCandidatesTable(candidates) {
    const tableBody = document.getElementById('candidates-table');

    if (!candidates || candidates.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <p class="text-muted mb-0">No candidate data available</p>
                </td>
            </tr>
        `;
        document.getElementById('candidates-count').textContent = '0';
        return;
    }

    // Sort by average rating (highest first)
    candidates.sort((a, b) => b.avg_rating - a.avg_rating);

    // Update table
    tableBody.innerHTML = '';
    candidates.forEach(candidate => {
        // Get rating class
        let ratingClass = 'text-warning';
        if (candidate.avg_rating >= 4) {
            ratingClass = 'text-success';
        } else if (candidate.avg_rating < 3) {
            ratingClass = 'text-danger';
        }

        // Create table row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="me-3">
                        <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                            style="width:40px; height:40px; font-weight:500">
                            ${getInitials(candidate.name)}
                        </div>
                    </div>
                    <div>
                        <h6 class="mb-0">${candidate.name}</h6>
                        <small class="text-muted">${candidate.interests.join(', ')}</small>
                    </div>
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="${ratingClass} me-2 fw-bold">${candidate.avg_rating.toFixed(1)}</div>
                    <div class="progress flex-grow-1" style="height: 8px; width: 80px;">
                        <div class="progress-bar bg-${candidate.avg_rating >= 4 ? 'success' : (candidate.avg_rating >= 3 ? 'warning' : 'danger')}"
                             role="progressbar"
                             style="width: ${(candidate.avg_rating/5)*100}%"
                             aria-valuenow="${candidate.avg_rating}"
                             aria-valuemin="0"
                             aria-valuemax="5"></div>
                    </div>
                </div>
            </td>
            <td class="text-center">${candidate.rater_count}</td>
            <td>${candidate.interview_status}</td>
            <td class="text-center">
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="candidateActions${candidate.id}" data-bs-toggle="dropdown" aria-expanded="false">
                        Actions
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="candidateActions${candidate.id}">
                        <li><a class="dropdown-item" href="#" onclick="viewCandidateDetails(${candidate.id})"><i class="fas fa-user me-2"></i>View Details</a></li>
                        <li><a class="dropdown-item" href="#" onclick="viewCandidateDocuments(${candidate.id})"><i class="fas fa-file-alt me-2"></i>View Documents</a></li>
                        <li><a class="dropdown-item" href="#" onclick="viewInterestedFaculty(${candidate.id})"><i class="fas fa-users me-2"></i>View Interested Faculty</a></li>
                    </ul>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Update candidates count
    document.getElementById('candidates-count').textContent = candidates.length;
}

// Load faculty schedule status (modified to remove status column)
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

// Display faculty schedule table (modified to remove status column)
function displayFacultyScheduleTable(interviews) {
    const tableBody = document.getElementById('faculty-schedule-table');

    if (!interviews || interviews.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4">
                    <p class="text-muted mb-0">No faculty scheduling data available</p>
                </td>
            </tr>
        `;
        document.getElementById('faculty-count').textContent = '0';
        return;
    }

    // Group by faculty only
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
                    <td class="text-center">
                        <div class="d-flex justify-content-center">
                            <button class="btn btn-sm btn-outline-secondary me-1 email-faculty-btn"
                                   data-id="${faculty.id}"
                                   data-email="${faculty.email}"
                                   data-name="${faculty.name}"
                                   ${faculty.interview_date ? 'disabled' : ''}>
                                <i class="fas fa-envelope"></i> Send Reminder
                            </button>
                            <button class="btn btn-sm btn-outline-primary view-schedule-btn" data-id="${faculty.id}" data-name="${faculty.name}">
                                <i class="fas fa-calendar-alt"></i> View Schedule
                            </button>
                        </div>
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
                    sendReminderToFaculty(facultyId, facultyEmail, facultyName);
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
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-secondary me-1 email-faculty-btn" data-id="${faculty.id}">
                            <i class="fas fa-envelope"></i> Send Reminder
                        </button>
                    </td>
                `;

                tableBody.appendChild(row);
            });

            // Update faculty count
            document.getElementById('faculty-count').textContent = facultyArray.length;
        });
}

// NEW: Send reminder to unscheduled faculty
function sendReminderToFaculty(facultyId, facultyEmail, facultyName) {
    showToast(`Sending reminder to ${facultyName}...`, 'info');

    // In a real implementation, this would call an API to send an email
    // For simulation purposes, we'll just show a success toast after a delay
    setTimeout(() => {
        showToast(`Reminder sent to ${facultyName}`, 'success');

        // Disable the button to prevent multiple reminders
        document.querySelectorAll(`.email-faculty-btn[data-id="${facultyId}"]`).forEach(btn => {
            btn.setAttribute('disabled', 'disabled');
            btn.innerHTML = '<i class="fas fa-check"></i> Reminder Sent';
        });
    }, 1000);
}

// NEW: Send reminders to all unscheduled faculty
function sendRemindersToAllUnscheduled() {
    // Find all unscheduled faculty
    const unscheduledButtons = document.querySelectorAll('.email-faculty-btn:not([disabled])');

    if (unscheduledButtons.length === 0) {
        showToast('No unscheduled faculty to remind', 'info');
        return;
    }

    // Show confirmation modal
    document.getElementById('modal-title').textContent = 'Send Reminders';
    document.getElementById('modal-message').textContent =
        `Are you sure you want to send reminders to all ${unscheduledButtons.length} unscheduled faculty members?`;

    // Set up the confirm action
    document.getElementById('confirm-action-btn').onclick = function() {
        // Send reminders to all unscheduled faculty
        showToast(`Sending reminders to ${unscheduledButtons.length} faculty members...`, 'info');

        let completed = 0;
        unscheduledButtons.forEach((button, index) => {
            const facultyId = button.dataset.id;
            const facultyName = button.dataset.name;
            const facultyEmail = button.dataset.email;

            // Stagger the reminders for visual effect
            setTimeout(() => {
                button.setAttribute('disabled', 'disabled');
                button.innerHTML = '<i class="fas fa-check"></i> Reminder Sent';
                completed++;

                // When all are done, show final toast
                if (completed === unscheduledButtons.length) {
                    showToast(`Successfully sent ${unscheduledButtons.length} reminders`, 'success');
                }
            }, index * 300);
        });

        confirmationModal.hide();
    };

    confirmationModal.show();
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

// NEW: View candidate details
function viewCandidateDetails(candidateId) {
    const candidate = candidatesData.find(c => c.id === candidateId);
    if (!candidate) {
        showToast('Candidate not found', 'error');
        return;
    }

    // In a real implementation, this would open a modal with detailed info
    // or redirect to a dedicated page
    showToast(`Viewing details for ${candidate.name}`, 'info');

    // This could be replaced with a proper modal or page navigation
    setTimeout(() => {
        window.location.href = `/candidate_details?id=${candidateId}`;
    }, 1000);
}

// NEW: View candidate documents
function viewCandidateDocuments(candidateId) {
    const candidate = candidatesData.find(c => c.id === candidateId);
    if (!candidate) {
        showToast('Candidate not found', 'error');
        return;
    }

    // In a real implementation, this would open a modal with document viewer
    showToast(`Viewing documents for ${candidate.name}`, 'info');
}

// NEW: View interested faculty for a candidate
function viewInterestedFaculty(candidateId) {
    const candidate = candidatesData.find(c => c.id === candidateId);
    if (!candidate) {
        showToast('Candidate not found', 'error');
        return;
    }

    // In a real implementation, this would open a modal with faculty list
    showToast(`Viewing interested faculty for ${candidate.name}`, 'info');
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