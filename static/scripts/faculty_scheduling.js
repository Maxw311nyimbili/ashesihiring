// Global variables
let ratedCandidates = [];
let selectedCandidate = null;
let scheduledCandidates = [];
let facultySchedule = null;
let modalObjects = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap modals
    modalObjects.confirmSchedule = new bootstrap.Modal(document.getElementById('confirmScheduleModal'));
    modalObjects.deleteSchedule = new bootstrap.Modal(document.getElementById('deleteScheduleModal'));
    
    // Set minimum date to today
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    document.getElementById('interview-date').min = formattedToday;
    
    // Initialize event listeners
    initEventListeners();
    
    // Load data
    loadRatedCandidates();
    loadFacultySchedule();
});

// Initialize all event listeners
function initEventListeners() {
    // Save availability button
    document.getElementById('save-availability').addEventListener('click', function() {
        const interviewDate = document.getElementById('interview-date').value;
        if (!interviewDate) {
            showToast('Please select an interview date', 'error');
            return;
        }
        
        // Format date for display
        const formattedDate = formatDateForDisplay(interviewDate);
        document.getElementById('modal-date').textContent = formattedDate;
        
        // Show confirmation modal
        modalObjects.confirmSchedule.show();
    });
    
    // Confirm save button in modal
    document.getElementById('confirm-save-btn').addEventListener('click', function() {
        saveSchedule();
        modalObjects.confirmSchedule.hide();
    });
    
    // Edit schedule button
    document.getElementById('edit-schedule-btn').addEventListener('click', function() {
        // Show the availability selector
        document.getElementById('availability-selector').classList.remove('d-none');
        document.getElementById('save-availability').textContent = 'Update My Availability';
        
        // Pre-fill the date input with current schedule date
        if (facultySchedule && facultySchedule.interview_date) {
            document.getElementById('interview-date').value = facultySchedule.interview_date;
        }
    });
    
    // Delete schedule button
    document.getElementById('delete-schedule-btn').addEventListener('click', function() {
        if (facultySchedule && facultySchedule.interview_date) {
            const formattedDate = formatDateForDisplay(facultySchedule.interview_date);
            document.getElementById('delete-modal-date').textContent = formattedDate;
            modalObjects.deleteSchedule.show();
        }
    });
    
    // Confirm delete button in modal
    document.getElementById('confirm-delete-btn').addEventListener('click', function() {
        deleteSchedule();
        modalObjects.deleteSchedule.hide();
    });
    
    // Close candidate details button
    document.getElementById('close-candidate-details').addEventListener('click', function() {
        document.getElementById('candidate-details-card').classList.add('d-none');
        selectedCandidate = null;
    });
    
    // Schedule interview button
    document.getElementById('schedule-interview-btn').addEventListener('click', function() {
        if (!selectedCandidate) {
            showToast('No candidate selected', 'error');
            return;
        }
        
        if (!facultySchedule || !facultySchedule.interview_date) {
            showToast('Please set your available date first', 'error');
            return;
        }
        
        scheduleInterview(selectedCandidate);
    });
    
    // Remove interview button
    document.getElementById('remove-interview-btn').addEventListener('click', function() {
        if (!selectedCandidate) {
            showToast('No candidate selected', 'error');
            return;
        }
        
        removeFromSchedule(selectedCandidate);
    });
    
    // Search functionality
    document.getElementById('candidate-search').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterCandidateList(searchTerm);
    });
}

// Load rated candidates from API
function loadRatedCandidates() {
    // UPDATED URL - using the new endpoint
    fetch('/api/faculty_rated_applicants')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            ratedCandidates = data;
            displayCandidateList(ratedCandidates);
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
    // UPDATED URL - using the new endpoint
    fetch('/api/faculty_interviews')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            processScheduleData(data);
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

    // Group by date to find current faculty schedule
    const groupedByDate = {};
    scheduleData.forEach(interview => {
        if (!groupedByDate[interview.interview_date]) {
            groupedByDate[interview.interview_date] = [];
        }
        groupedByDate[interview.interview_date].push(interview);
    });

    // Get current faculty email from session
    const currentFacultyEmail = document.getElementById('faculty-email')?.value || '';

    // Find interviews for the current faculty
    let facultyInterviews = [];
    for (const date in groupedByDate) {
        const interviews = groupedByDate[date].filter(interview =>
            interview.email === currentFacultyEmail ||
            interview.faculty_name === document.getElementById('faculty-name')?.value
        );

        if (interviews.length > 0) {
            facultySchedule = {
                interview_date: date,
                interviews: interviews
            };
            facultyInterviews = interviews;
            break;
        }
    }

    if (facultyInterviews.length > 0) {
        // Faculty has a schedule
        scheduledCandidates = facultyInterviews.map(interview => ({
            id: interview.applicant_id,
            name: interview.applicant_name,
            course_name: interview.course_name,
            preference: interview.preference
        }));

        displayFacultySchedule(facultySchedule);

        // Hide the availability selector since schedule exists
        document.getElementById('availability-selector').classList.add('d-none');
        document.getElementById('empty-selection-message').classList.add('d-none');
    } else {
        // No schedule for current faculty
        showEmptySchedule();
    }

    // Update the candidate list to reflect scheduled status
    updateCandidateListScheduleStatus();
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
        const isScheduled = scheduledCandidates.some(c => c.id === candidate.id);
        const scheduleBadge = isScheduled ?
            `<span class="badge bg-success">Scheduled</span>` :
            `<span class="badge bg-light text-dark">Not Scheduled</span>`;

        const listItem = document.createElement('li');
        listItem.className = 'list-group-item candidate-item';
        listItem.dataset.candidateId = candidate.id;

        listItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="candidate-info">
                    <h6 class="mb-1">${candidate.name}</h6>
                    <div class="d-flex align-items-center">
                        <div class="rating-stars me-2">${ratingStars}</div>
                        <div class="schedule-badge">${scheduleBadge}</div>
                    </div>
                </div>
                <button class="btn btn-sm view-btn" data-id="${candidate.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;

        candidateList.appendChild(listItem);

        // Add click event for the view button
        listItem.querySelector('.view-btn').addEventListener('click', function() {
            const candidateId = this.dataset.id;
            viewCandidateDetails(candidateId);
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

    // Show message if no results
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

// View details for a specific candidate
function viewCandidateDetails(candidateId) {
    // Find the candidate in the rated candidates array
    const candidate = ratedCandidates.find(c => c.id == candidateId);
    if (!candidate) {
        showToast('Candidate not found', 'error');
        return;
    }

    selectedCandidate = candidate;

    // Check if candidate is already scheduled
    const isScheduled = scheduledCandidates.some(c => c.id == candidateId);

    // Update the candidate details card
    document.getElementById('selected-candidate-name').textContent = candidate.name;
    document.getElementById('display-rating').innerHTML = generateRatingStars(candidate.rating);

    // Interests display
    let interestsHtml = 'No interests specified';
    if (candidate.interests) {
        interestsHtml = candidate.interests
            .map(interest => `<span class="tag-pill">${interest}</span>`)
            .join('');
    }
    document.getElementById('display-interests').innerHTML = interestsHtml;

    // Interest prompt display
    const interestPromptContainer = document.getElementById('interest-prompt-container');
    const displayInterestPrompt = document.getElementById('display-interest-prompt');

    if (candidate.interest_prompt) {
        interestPromptContainer.classList.remove('d-none');
        displayInterestPrompt.textContent = candidate.interest_prompt === 'Yes' ?
            'Yes, this candidate has qualities that make them a desirable FI despite the low rating.' :
            'No, this candidate does not have qualities that make them a desirable FI.';
    } else {
        interestPromptContainer.classList.add('d-none');
    }

    // Comment display
    const commentContainer = document.getElementById('comment-container');
    const displayComment = document.getElementById('display-comment');

    if (candidate.comment) {
        commentContainer.classList.remove('d-none');
        displayComment.textContent = candidate.comment;
    } else {
        commentContainer.classList.add('d-none');
    }

    // Update the action buttons
    const scheduleBtn = document.getElementById('schedule-interview-btn');
    const removeBtn = document.getElementById('remove-interview-btn');

    if (isScheduled) {
        scheduleBtn.classList.add('d-none');
        removeBtn.classList.remove('d-none');
    } else {
        scheduleBtn.classList.remove('d-none');
        removeBtn.classList.add('d-none');
    }

    // Show the details card
    document.getElementById('candidate-details-card').classList.remove('d-none');
}

// Display the faculty's current schedule
function displayFacultySchedule(schedule) {
    if (!schedule || !schedule.interview_date || !schedule.interviews || schedule.interviews.length === 0) {
        showEmptySchedule();
        return;
    }

    // Hide empty message, show schedule details
    document.getElementById('no-schedule-message').classList.add('d-none');
    document.getElementById('schedule-details').classList.remove('d-none');

    // Format and display the date
    const formattedDate = formatDateForDisplay(schedule.interview_date);
    document.getElementById('display-interview-date').textContent = formattedDate;

    // Update candidate count
    document.getElementById('display-candidate-count').textContent = schedule.interviews.length;

    // Build the schedule table
    const scheduledCandidatesTable = document.getElementById('scheduled-candidates');
    scheduledCandidatesTable.innerHTML = '';

    // Group candidates by ID to remove duplicates (same candidate might be interested in multiple courses)
    const uniqueCandidates = {};
    schedule.interviews.forEach(interview => {
        if (!uniqueCandidates[interview.applicant_id]) {
            uniqueCandidates[interview.applicant_id] = interview;
        }
    });

    // Find additional details for each candidate from rated candidates list
    Object.values(uniqueCandidates).forEach(interview => {
        const candidate = ratedCandidates.find(c => c.id == interview.applicant_id);
        const rating = candidate ? candidate.rating : '-';

        const row = document.createElement('tr');
        row.dataset.candidateId = interview.applicant_id;

        row.innerHTML = `
            <td>${interview.applicant_name}</td>
            <td>
                <div class="rating-stars">${generateRatingStars(rating)}</div>
            </td>
            <td>${interview.course_name || 'Not specified'}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary view-scheduled-btn" data-id="${interview.applicant_id}">
                    <i class="fas fa-eye me-1"></i> View
                </button>
                <button class="btn btn-sm btn-outline-danger remove-scheduled-btn" data-id="${interview.applicant_id}">
                    <i class="fas fa-times me-1"></i> Remove
                </button>
            </td>
        `;

        scheduledCandidatesTable.appendChild(row);
    });

    // Add event listeners to the new buttons
    document.querySelectorAll('.view-scheduled-btn').forEach(button => {
        button.addEventListener('click', function() {
            const candidateId = this.dataset.id;
            viewCandidateDetails(candidateId);
        });
    });

    document.querySelectorAll('.remove-scheduled-btn').forEach(button => {
        button.addEventListener('click', function() {
            const candidateId = this.dataset.id;
            const candidate = ratedCandidates.find(c => c.id == candidateId);
            if (candidate) {
                removeFromSchedule(candidate);
            }
        });
    });
}

// Show empty schedule state
function showEmptySchedule() {
    document.getElementById('no-schedule-message').classList.remove('d-none');
    document.getElementById('schedule-details').classList.add('d-none');
    document.getElementById('empty-selection-message').classList.remove('d-none');
    document.getElementById('availability-selector').classList.remove('d-none');
}

// Save the faculty schedule
function saveSchedule() {
    const interviewDate = document.getElementById('interview-date').value;

    if (!interviewDate) {
        showToast('Please select an interview date', 'error');
        return;
    }

    // If no candidates are scheduled yet, we're just setting the date
    if (scheduledCandidates.length === 0) {
        // Create a placeholder schedule
        facultySchedule = {
            interview_date: interviewDate,
            interviews: []
        };

        showToast('Interview date saved successfully', 'success');

        // Update the UI
        const formattedDate = formatDateForDisplay(interviewDate);
        document.getElementById('display-interview-date').textContent = formattedDate;
        document.getElementById('display-candidate-count').textContent = '0';

        document.getElementById('no-schedule-message').classList.add('d-none');
        document.getElementById('schedule-details').classList.remove('d-none');
        document.getElementById('availability-selector').classList.add('d-none');
        document.getElementById('empty-selection-message').classList.add('d-none');

        // Also update scheduled candidates table
        document.getElementById('scheduled-candidates').innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">
                    <i class="fas fa-info-circle me-2"></i> No candidates scheduled yet
                </td>
            </tr>
        `;

        return;
    }

    // We have an existing schedule with candidates, update the date
    // UPDATED URL - using the new endpoint
    fetch('/api/update_faculty_schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            new_date: interviewDate,
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
            facultySchedule.interview_date = interviewDate;

            // Update the UI
            const formattedDate = formatDateForDisplay(interviewDate);
            document.getElementById('display-interview-date').textContent = formattedDate;

            showToast('Schedule updated successfully', 'success');

            // Hide the availability selector
            document.getElementById('availability-selector').classList.add('d-none');
            document.getElementById('empty-selection-message').classList.add('d-none');
        } else {
            showToast('Error: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error updating schedule:', error);
        showToast('Error updating schedule', 'error');
    });
}

// Delete the faculty schedule
function deleteSchedule() {
    if (!facultySchedule || !facultySchedule.interview_date) {
        showToast('No schedule to delete', 'error');
        return;
    }

    // UPDATED URL - using the new endpoint
    fetch('/api/delete_faculty_schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            date: facultySchedul