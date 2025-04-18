// Global variables
let ratedCandidates = [];
let scheduledCandidates = [];
let facultySchedule = null;
let selectedCandidate = null;
let modalObjects = {};
let datePicker = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap modals
    modalObjects.candidateDetails = new bootstrap.Modal(document.getElementById('candidateDetailsModal'));
    modalObjects.batchSchedule = new bootstrap.Modal(document.getElementById('batchScheduleModal'));
    modalObjects.deleteSchedule = new bootstrap.Modal(document.getElementById('deleteScheduleModal'));
    modalObjects.confirmDate = new bootstrap.Modal(document.getElementById('confirmDateModal'));

    // Initialize date picker using Flatpickr instead of Tempus Dominus
    initializeDatePicker();

    // Initialize event listeners
    initEventListeners();

    // Load faculty schedule first, then rated candidates
    // This ensures we know scheduled status before rendering the candidate list
    loadFacultySchedule().then(() => {
        loadRatedCandidates();
    });
});

// Initialize the date picker using Flatpickr
function initializeDatePicker() {
    // Get tomorrow's date as the minimum selectable date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Initialize Flatpickr date picker
    datePicker = flatpickr("#interview-date", {
        dateFormat: "F j, Y", // Format like "April 20, 2025"
        minDate: tomorrow,
        disableMobile: true,
        altInput: true,
        altFormat: "F j, Y",
        appendTo: document.querySelector('.datepicker-container'),
        onChange: function(selectedDates, dateStr) {
            // This happens when the date is changed
            console.log("Selected date:", dateStr);
        }
    });
}

// Initialize all event listeners
function initEventListeners() {
    // Save availability button
    document.getElementById('save-availability').addEventListener('click', function() {
        const interviewDate = document.getElementById('interview-date').value;
        if (!interviewDate) {
            showToast('Please select an interview date', 'error');
            return;
        }

        // Show confirmation modal
        document.getElementById('confirm-date-display').textContent = interviewDate;
        modalObjects.confirmDate.show();
    });

    // Confirm date button
    document.getElementById('confirm-date-btn').addEventListener('click', function() {
        saveSchedule();
        modalObjects.confirmDate.hide();
    });

    // Edit schedule button
    document.getElementById('edit-schedule-btn').addEventListener('click', function() {
        document.getElementById('current-schedule-section').classList.add('d-none');
        document.getElementById('availability-section').classList.remove('d-none');

        // Pre-fill the date input with current schedule date if available
        if (facultySchedule && facultySchedule.interview_date) {
            // Convert ISO date to Date object for the date picker
            const scheduleDate = new Date(facultySchedule.interview_date);
            datePicker.setDate(scheduleDate, true);
        }
    });

    // Delete schedule button
    document.getElementById('delete-schedule-btn').addEventListener('click', function() {
        if (facultySchedule && facultySchedule.interview_date) {
            document.getElementById('delete-modal-date').textContent = formatDateForDisplay(facultySchedule.interview_date);
            modalObjects.deleteSchedule.show();
        }
    });

    // Confirm delete button
    document.getElementById('confirm-delete-btn').addEventListener('click', function() {
        deleteSchedule();
        modalObjects.deleteSchedule.hide();
    });

    // Batch schedule button
    document.getElementById('batch-schedule-btn').addEventListener('click', function() {
        if (facultySchedule && facultySchedule.interview_date) {
            document.getElementById('batch-modal-date').textContent = formatDateForDisplay(facultySchedule.interview_date);
            modalObjects.batchSchedule.show();
        }
    });

    // Confirm batch schedule button
    document.getElementById('confirm-batch-schedule').addEventListener('click', function() {
        batchScheduleInterviews();
        modalObjects.batchSchedule.hide();
    });

    // Modal schedule button
    document.getElementById('modal-schedule-btn').addEventListener('click', function() {
        if (selectedCandidate) {
            scheduleInterview(selectedCandidate);
            modalObjects.candidateDetails.hide();
        }
    });

    // Modal remove button
    document.getElementById('modal-remove-btn').addEventListener('click', function() {
        if (selectedCandidate) {
            removeFromSchedule(selectedCandidate);
            modalObjects.candidateDetails.hide();
        }
    });

    // Select all checkbox
    document.getElementById('select-all-candidates').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.candidate-checkbox:not(:disabled)');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });

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
            if (facultySchedule && facultySchedule.interview_date) {
                updateCandidateTable();
            }
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

// Load faculty schedule from API
function loadFacultySchedule() {
    return fetch('/api/faculty_interviews')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            processScheduleData(data);
            updateStatCounts();
            return data; // Return the data so we can use it in chained promises
        })
        .catch(error => {
            console.error('Error loading faculty schedule:', error);
            showToast('Error loading schedule data', 'error');
        });
}

// Process schedule data
function processScheduleData(scheduleData) {
    if (!scheduleData || scheduleData.length === 0) {
        // No schedule exists
        showEmptySchedule();
        return;
    }

    // Get current faculty name
    const currentFacultyName = document.getElementById('faculty-name')?.value || '';
    console.log("Current faculty name:", currentFacultyName);

    // Debug: Log all interviews
    console.log("All interviews:", scheduleData);

    // Find interviews for the current faculty
    const facultyInterviews = scheduleData.filter(interview =>
        interview.faculty_name === currentFacultyName
    );

    console.log("Faculty interviews:", facultyInterviews);

    if (facultyInterviews.length > 0) {
        // Group by date to find the most recent date
        const groupedByDate = {};
        facultyInterviews.forEach(interview => {
            if (!groupedByDate[interview.interview_date]) {
                groupedByDate[interview.interview_date] = [];
            }
            groupedByDate[interview.interview_date].push(interview);
        });

        console.log("Grouped by date:", groupedByDate);

        // Find the date with the most interviews (probably the faculty's chosen date)
        let mostInterviews = 0;
        let chosenDate = null;

        for (const date in groupedByDate) {
            if (groupedByDate[date].length > mostInterviews) {
                mostInterviews = groupedByDate[date].length;
                chosenDate = date;
            }
        }

        // If we found a date, use it
        if (chosenDate) {
            facultySchedule = {
                interview_date: chosenDate,
                interviews: groupedByDate[chosenDate]
            };

            // Build scheduled candidates list
            scheduledCandidates = facultySchedule.interviews.map(interview => ({
                id: interview.applicant_id,
                name: interview.applicant_name,
                course_name: interview.course_name,
                preference: interview.preference
            }));

            // Remove duplicates (a candidate might be scheduled for multiple courses)
            scheduledCandidates = Array.from(new Map(
                scheduledCandidates.map(item => [item.id, item])
            ).values());

            console.log("Scheduled candidates:", scheduledCandidates);

            // Display the schedule
            displaySchedule(facultySchedule);
        } else {
            showEmptySchedule();
        }
    } else {
        showEmptySchedule();
    }
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

        // Determine if this candidate is already scheduled
        const isScheduled = scheduledCandidates.some(c => c.id == candidate.id);
        const candidateStatus = isScheduled ?
            `<span class="candidate-badge scheduled"><i class="fas fa-check-circle me-1"></i> Scheduled</span>` :
            `<span class="candidate-badge not-scheduled"><i class="fas fa-clock me-1"></i> Not Scheduled</span>`;

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
                        ${candidateStatus}
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

// Update the candidate table in the schedule section
function updateCandidateTable() {
    const tableBody = document.getElementById('candidate-schedule-list');
    tableBody.innerHTML = '';

    // Sort candidates: scheduled first, then by rating
    const sortedCandidates = [...ratedCandidates].sort((a, b) => {
        const aScheduled = scheduledCandidates.some(c => c.id == a.id);
        const bScheduled = scheduledCandidates.some(c => c.id == b.id);

        if (aScheduled && !bScheduled) return -1;
        if (!aScheduled && bScheduled) return 1;

        // If scheduling status is the same, sort by rating
        return b.rating - a.rating;
    });

    sortedCandidates.forEach(candidate => {
        const ratingStars = generateRatingStars(candidate.rating);
        const isScheduled = scheduledCandidates.some(c => c.id == candidate.id);

        const candidateStatus = isScheduled ?
            `<span class="candidate-badge scheduled"><i class="fas fa-check-circle me-1"></i> Scheduled</span>` :
            `<span class="candidate-badge not-scheduled"><i class="fas fa-clock me-1"></i> Not Scheduled</span>`;

        const row = document.createElement('tr');
        row.dataset.candidateId = candidate.id;
        row.className = isScheduled ? 'bg-light' : '';

        row.innerHTML = `
            <td>
                <div class="form-check">
                    <input class="form-check-input candidate-checkbox" type="checkbox" value="${candidate.id}"
                           ${isScheduled ? 'checked disabled' : ''}>
                </div>
            </td>
            <td>${candidate.name}</td>
            <td>
                <div class="rating-stars">${ratingStars}</div>
            </td>
            <td>${candidateStatus}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-secondary view-candidate-btn" data-id="${candidate.id}">
                    <i class="fas fa-eye me-1"></i> View
                </button>
                ${isScheduled ?
                    `<button class="btn btn-sm btn-outline-danger ms-2 remove-candidate-btn" data-id="${candidate.id}">
                        <i class="fas fa-times me-1"></i> Remove
                    </button>` :
                    `<button class="btn btn-sm btn-outline-success ms-2 schedule-candidate-btn" data-id="${candidate.id}">
                        <i class="fas fa-plus me-1"></i> Add
                    </button>`
                }
            </td>
        `;

        tableBody.appendChild(row);

        // Add event listeners
        row.querySelector('.view-candidate-btn').addEventListener('click', function() {
            openCandidateModal(candidate.id);
        });

        if (isScheduled) {
            row.querySelector('.remove-candidate-btn').addEventListener('click', function() {
                removeFromSchedule(candidate);
            });
        } else {
            row.querySelector('.schedule-candidate-btn').addEventListener('click', function() {
                scheduleInterview(candidate);
            });
        }
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

    selectedCandidate = candidate;

    // Check if candidate is already scheduled
    const isScheduled = scheduledCandidates.some(c => c.id == candidateId);

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

    // Schedule status section
    const scheduleStatusSection = document.getElementById('modal-schedule-status');

    if (isScheduled) {
        scheduleStatusSection.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="icon me-3 bg-success bg-opacity-10 p-2 rounded-circle">
                    <i class="fas fa-calendar-check text-success fs-5"></i>
                </div>
                <div>
                    <h6 class="mb-1 fw-bold text-success">Scheduled for Interview</h6>
                    <p class="mb-0">${formatDateForDisplay(facultySchedule.interview_date)}</p>
                </div>
            </div>
        `;
        scheduleStatusSection.className = "schedule-status p-3 rounded-3 mb-3 bg-success bg-opacity-10";
    } else if (facultySchedule && facultySchedule.interview_date) {
        scheduleStatusSection.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="icon me-3 bg-warning bg-opacity-10 p-2 rounded-circle">
                    <i class="fas fa-calendar-plus text-warning fs-5"></i>
                </div>
                <div>
                    <h6 class="mb-1 fw-bold text-warning">Not Scheduled</h6>
                    <p class="mb-0">Available date: ${formatDateForDisplay(facultySchedule.interview_date)}</p>
                </div>
            </div>
        `;
        scheduleStatusSection.className = "schedule-status p-3 rounded-3 mb-3 bg-warning bg-opacity-10";
    } else {
        scheduleStatusSection.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="icon me-3 bg-secondary bg-opacity-10 p-2 rounded-circle">
                    <i class="fas fa-calendar-xmark text-secondary fs-5"></i>
                </div>
                <div>
                    <h6 class="mb-1 fw-bold text-secondary">No Schedule</h6>
                    <p class="mb-0">Set your availability first</p>
                </div>
            </div>
        `;
        scheduleStatusSection.className = "schedule-status p-3 rounded-3 mb-3 bg-secondary bg-opacity-10";
    }

    // Update the action buttons
    const scheduleBtn = document.getElementById('modal-schedule-btn');
    const removeBtn = document.getElementById('modal-remove-btn');

    if (isScheduled) {
        scheduleBtn.classList.add('d-none');
        removeBtn.classList.remove('d-none');
    } else {
        scheduleBtn.classList.remove('d-none');
        removeBtn.classList.add('d-none');

        // Disable schedule button if no faculty schedule exists
        if (!facultySchedule || !facultySchedule.interview_date) {
            scheduleBtn.disabled = true;
            scheduleBtn.title = "Set your availability first";
        } else {
            scheduleBtn.disabled = false;
            scheduleBtn.title = "";
        }
    }

    // Show the modal
    modalObjects.candidateDetails.show();
}

// Display the faculty's schedule
function displaySchedule(schedule) {
    if (!schedule || !schedule.interview_date) {
        showEmptySchedule();
        return;
    }

    // Format and display the date
    const formattedDate = formatDateForDisplay(schedule.interview_date);
    document.getElementById('display-interview-date').textContent = formattedDate;

    // Show the current schedule section
    document.getElementById('availability-section').classList.add('d-none');
    document.getElementById('current-schedule-section').classList.remove('d-none');
}

// Show empty schedule state
function showEmptySchedule() {
    document.getElementById('availability-section').classList.remove('d-none');
    document.getElementById('current-schedule-section').classList.add('d-none');
}

// Save the faculty schedule
function saveSchedule() {
    const interviewDateInput = document.getElementById('interview-date');
    const interviewDate = interviewDateInput.value;

    if (!interviewDate) {
        showToast('Please select an interview date', 'error');
        return;
    }

    // Parse the formatted date back to YYYY-MM-DD
    // Flatpickr lets us get the selected date as a Date object
    const selectedDates = datePicker.selectedDates;
    if (!selectedDates || selectedDates.length === 0) {
        showToast('Please select a valid date', 'error');
        return;
    }

    const dateObj = selectedDates[0];
    const isoDate = dateObj.toISOString().split('T')[0];

    // If we already have a schedule, update it
    if (facultySchedule && facultySchedule.interview_date) {
        fetch('/api/update_faculty_schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                new_date: isoDate,
                old_date: facultySchedule.interview_date
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Update the local schedule
                facultySchedule.interview_date = isoDate;

                // Update the UI
                displaySchedule(facultySchedule);
                updateCandidateTable();

                showToast('Schedule updated successfully', 'success');
            } else {
                showToast('Error: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error updating schedule:', error);
            showToast('Error updating schedule', 'error');
        });
    } else {
        // Create a new schedule
        facultySchedule = {
            interview_date: isoDate,
            interviews: []
        };

        // Update the UI
        displaySchedule(facultySchedule);
        updateCandidateTable();

        showToast('Interview date saved successfully', 'success');
    }
}

// Delete the faculty schedule
function deleteSchedule() {
    if (!facultySchedule || !facultySchedule.interview_date) {
        showToast('No schedule to delete', 'error');
        return;
    }

    fetch('/api/delete_faculty_schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            date: facultySchedule.interview_date
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Clear the local schedule
            facultySchedule = null;
            scheduledCandidates = [];

            // Reset the UI to empty state
            showEmptySchedule();

            // Clear the date input
            datePicker.clear();

            // Update the display
            displayCandidateList(ratedCandidates);

            showToast('Schedule deleted successfully', 'success');
            updateStatCounts();
        } else {
            showToast('Error: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting schedule:', error);
        showToast('Error deleting schedule', 'error');
    });
}

// Schedule an interview with a candidate
function scheduleInterview(candidate) {
    if (!candidate || !candidate.id) {
        showToast('Invalid candidate selection', 'error');
        return;
    }

    if (!facultySchedule || !facultySchedule.interview_date) {
        showToast('Please set your available date first', 'error');
        return;
    }

    fetch('/api/create_interview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            applicant_id: candidate.id,
            date: facultySchedule.interview_date
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.message) {
            // Add to local scheduled candidates if not already there
            if (!scheduledCandidates.some(c => c.id == candidate.id)) {
                scheduledCandidates.push({
                    id: candidate.id,
                    name: candidate.name
                });
            }

            // Update the UI
            displayCandidateList(ratedCandidates);
            updateCandidateTable();
            updateStatCounts();

            showToast(`${candidate.name} scheduled successfully`, 'success');
        } else {
            showToast('Error: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error scheduling interview:', error);
        showToast('Error scheduling interview', 'error');
    });
}

// Remove a candidate from the schedule
function removeFromSchedule(candidate) {
    if (!candidate || !candidate.id) {
        showToast('Invalid candidate selection', 'error');
        return;
    }

    fetch('/api/remove_from_schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            applicant_id: candidate.id
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Remove from local scheduled candidates
            scheduledCandidates = scheduledCandidates.filter(c => c.id != candidate.id);

            // Update the UI
            displayCandidateList(ratedCandidates);
            updateCandidateTable();
            updateStatCounts();

            showToast(`${candidate.name} removed from schedule`, 'success');
        } else {
            showToast('Error: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error removing from schedule:', error);
        showToast('Error removing candidate from schedule', 'error');
    });
}

// Batch schedule interviews for multiple candidates
function batchScheduleInterviews() {
    // Get all selected but unscheduled candidates
    const checkboxes = document.querySelectorAll('.candidate-checkbox:checked:not(:disabled)');
    if (checkboxes.length === 0) {
        showToast('No candidates selected for scheduling', 'error');
        return;
    }

    if (!facultySchedule || !facultySchedule.interview_date) {
        showToast('Please set your available date first', 'error');
        return;
    }

    // Create array of candidate IDs to schedule
    const candidateIds = Array.from(checkboxes).map(checkbox => checkbox.value);

    // Create a progress counter
    let processedCount = 0;
    let successCount = 0;

    // Process each candidate in sequence
    candidateIds.forEach(id => {
        // Find the candidate
        const candidate = ratedCandidates.find(c => c.id == id);
        if (!candidate) {
            processedCount++;
            return;
        }

        // Schedule the interview
        fetch('/api/create_interview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                applicant_id: candidate.id,
                date: facultySchedule.interview_date
            })
        })
        .then(response => response.json())
        .then(data => {
            processedCount++;

            if (data.message) {
                successCount++;

                // Add to local scheduled candidates if not already there
                if (!scheduledCandidates.some(c => c.id == candidate.id)) {
                    scheduledCandidates.push({
                        id: candidate.id,
                        name: candidate.name
                    });
                }

                // When all are processed, update UI
                if (processedCount === candidateIds.length) {
                    displayCandidateList(ratedCandidates);
                    updateCandidateTable();
                    updateStatCounts();
                    showToast(`${successCount} candidates scheduled successfully`, 'success');
                }
            }
        })
        .catch(error => {
            processedCount++;
            console.error(`Error scheduling interview for candidate ${id}:`, error);

            // When all are processed, update UI
            if (processedCount === candidateIds.length) {
                displayCandidateList(ratedCandidates);
                updateCandidateTable();
                updateStatCounts();
                showToast(`${successCount} of ${candidateIds.length} candidates scheduled successfully`, 'info');
            }
        });
    });
}

// Update stat counters in the header
function updateStatCounts() {
    // Update total rated count
    document.getElementById('total-rated-count').textContent = ratedCandidates.length;

    // Update total scheduled count
    document.getElementById('total-scheduled-count').textContent = scheduledCandidates.length;
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