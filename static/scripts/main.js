// Global variables
let candidates = [];
let currentIndex = 0;
let selectedIndex = null;
let rateModalObj;
let isAnimating = false;
let filteredCandidates = [];
let activeFilters = {
    courses: new Set(),
    ratingStatus: null,
    ratingValue: null,
    searchQuery: ''
};

// DOM elements
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const navDots = document.getElementById("nav-dots");
const candidateCard = document.getElementById("candidateCard");
const cardWrapper = document.querySelector('.card-wrapper');
const searchInput = document.getElementById('searchInput');
const courseFilters = document.getElementById('courseFilters');
const filterCount = document.getElementById('filterCount');
const clearFilters = document.getElementById('clearFilters');
const activeFiltersContainer = document.getElementById('activeFilters');
const noResults = document.getElementById('noResults');
const resetFilters = document.getElementById('resetFilters');
const filterPanel = document.querySelector('.filter-panel');

// Touch swipe variables
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 50; // Minimum distance required for a swipe

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap modals
    rateModalObj = new bootstrap.Modal(document.getElementById("rateModal"));
    
    // Load candidates on page load
    fetchCandidates();
    
    // Initialize swipe functionality
    initSwipeListeners();
    addSwipeStyles();
    
    // Add responsive adjustments
    adjustForMobile();
});

// Adjust layout for mobile devices
function adjustForMobile() {
    const cardContainer = document.querySelector('.card-container');
    
    // Add event listener for window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            // Mobile adjustments
            cardContainer.style.height = '600px';
            cardContainer.style.minHeight = '500px';
            cardContainer.style.maxHeight = '600px';
            
            // Make filter panel more compact
            filterPanel.style.padding = '1rem';
            filterPanel.style.marginBottom = '1rem';
            
            // Adjust filter options for better mobile display
            const filterOptions = document.querySelectorAll('.filter-option');
            filterOptions.forEach(option => {
                option.style.padding = '0.3rem 0.6rem';
                option.style.fontSize = '0.8rem';
            });
            
            // Adjust filter badges
            const filterBadges = document.querySelectorAll('.filter-badge');
            filterBadges.forEach(badge => {
                badge.style.padding = '0.2rem 0.5rem';
                badge.style.fontSize = '0.75rem';
            });
        } else {
            // Desktop adjustments
            cardContainer.style.height = '600px';
            cardContainer.style.minHeight = '500px';
            cardContainer.style.maxHeight = '600px';
            
            // Reset filter panel styles
            filterPanel.style.padding = '1.5rem';
            filterPanel.style.marginBottom = '2rem';
            
            // Reset filter options
            const filterOptions = document.querySelectorAll('.filter-option');
            filterOptions.forEach(option => {
                option.style.padding = '0.4rem 0.8rem';
                option.style.fontSize = '0.85rem';
            });
            
            // Reset filter badges
            const filterBadges = document.querySelectorAll('.filter-badge');
            filterBadges.forEach(badge => {
                badge.style.padding = '0.3rem 0.6rem';
                badge.style.fontSize = '0.8rem';
            });
        }
    });
    
    // Trigger initial adjustment
    window.dispatchEvent(new Event('resize'));
}

// Fetch candidates from backend API
async function fetchCandidates() {
    try {
        let response = await fetch("/api/candidates");
        let data = await response.json();
        candidates = data;
        filteredCandidates = [...candidates];
        updateFilterCount();

        if (candidates.length > 0) {
            // Create navigation dots
            createNavigationDots();
            displayCandidate(currentIndex, "right"); // Initial display
            updateNavigationDots();
            populateCourseFilters();
        }
    } catch (error) {
        console.error("Error fetching candidates:", error);
        candidateCard.innerHTML = "<div class='d-flex justify-content-center align-items-center h-100'><p class='text-danger'><i class='fas fa-exclamation-triangle me-2'></i>Error loading candidates. Please try again later.</p></div>";
    }
}

// Create navigation dots based on candidate count
function createNavigationDots() {
    navDots.innerHTML = '';
    for (let i = 0; i < filteredCandidates.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'nav-dot';
        dot.setAttribute('data-index', i);
        dot.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            const direction = index > currentIndex ? "right" : "left";
            currentIndex = index;
            displayCandidate(currentIndex, direction);
            updateNavigationDots();
        });
        navDots.appendChild(dot);
    }
}

// Update active state of navigation dots
function updateNavigationDots() {
    document.querySelectorAll('.nav-dot').forEach((dot, index) => {
        if (index === currentIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Display candidate
function displayCandidate(index) {
    if (isAnimating || index < 0 || index >= filteredCandidates.length) return;
    
    isAnimating = true;
    const candidate = filteredCandidates[index];
    const direction = index > currentIndex ? 'next' : 'prev';
    
    // Create new card
    const newCard = document.createElement('div');
    newCard.className = 'candidate-card';
    
    // Extract first and last name from the candidate name
    const nameParts = candidate.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Format interests for display
    const interests = candidate.interests && candidate.interests.length > 0 
        ? candidate.interests.map(interest => `<span class="tag-pill">${interest}</span>`).join('')
        : `<span class="tag-pill">${candidate.summary.replace('Interested in ', '').replace('.', '')}</span>`;
    
    newCard.innerHTML = `
        <div class="card-header">
            <h3 class="mb-0">${firstName} ${lastName}</h3>
        </div>
        <div class="card-body">
            <div class="candidate-info-box">
                <p><strong>Summary:</strong> ${candidate.summary}</p>
            </div>
            <h6 class="text-danger fw-medium">Courses of Interest:</h6>
            <div class="mb-3">
                ${interests}
            </div>
            <div class="text-end">
                <button class="btn btn-primary" onclick="openRateModal(${candidate.id || index})">
                    Rate Candidate
                </button>
            </div>
        </div>
    `;

    // Add animation classes
    newCard.classList.add(direction === 'next' ? 'slide-in-from-right' : 'slide-in-from-left');
    candidateCard.classList.add(direction === 'next' ? 'slide-out-to-left' : 'slide-out-to-right');

    // Replace card after animation
    setTimeout(() => {
        candidateCard.innerHTML = newCard.innerHTML;
        candidateCard.classList.remove('slide-out-to-left', 'slide-out-to-right');
        newCard.classList.remove('slide-in-from-right', 'slide-in-from-left');
        currentIndex = index;
        updateNavigationDots();
        isAnimating = false;
    }, 300);
}

// Load existing rating and comments for the current candidate
function loadExistingRatingAndComments(applicationId) {
    fetch(`/get_comments?application_id=${applicationId}`)
        .then(response => response.json())
        .then(data => {
            const ratingStatus = document.getElementById('ratingStatus');
            const commentsList = document.getElementById('commentsList');

            // Update rating status
            if (data.rating) {
                ratingStatus.innerHTML = `
                    <div>
                        <span class="fw-medium">Your rating:</span>
                        <span class="badge bg-warning text-dark fs-6">${data.rating}/5</span>
                    </div>
                    <small class="text-muted">Click "Rate Now" to update</small>
                `;
            }

            // Update comments list
            if (data.comments && data.comments.length > 0) {
                commentsList.innerHTML = '';
                data.comments.forEach(comment => {
                    commentsList.innerHTML += `
                        <div class="comment-card">
                            <div class="d-flex justify-content-between">
                                <p class="fw-medium mb-1">${comment.faculty_name || 'Faculty'}</p>
                                <small class="text-muted">${comment.timestamp || 'Recent'}</small>
                            </div>
                            <p class="mb-0">${comment.comment}</p>
                        </div>
                    `;
                });
            } else {
                commentsList.innerHTML = '<p class="text-muted fst-italic">No comments yet</p>';
            }
        })
        .catch(error => {
            console.error("Error loading ratings and comments:", error);
        });
}

// Navigation buttons
prevBtn.addEventListener("click", () => {
    if (currentIndex > 0 && !isAnimating) {
        currentIndex--;
        displayCandidate(currentIndex, "left");
    } else if (!isAnimating) {
        animateBounce("left");
    }
});

nextBtn.addEventListener("click", () => {
    if (currentIndex < candidates.length - 1 && !isAnimating) {
        currentIndex++;
        displayCandidate(currentIndex, "right");
    } else if (!isAnimating) {
        animateBounce("right");
    }
});

// Add touch event listeners for swipe functionality
function initSwipeListeners() {
    const cardContainer = document.querySelector('.card-container');

    cardContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    cardContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    // Also add mouse events for desktop testing
    cardContainer.addEventListener('mousedown', (e) => {
        touchStartX = e.screenX;
        cardContainer.style.cursor = 'grabbing';
        e.preventDefault();
    }, false);

    cardContainer.addEventListener('mouseup', (e) => {
        touchEndX = e.screenX;
        cardContainer.style.cursor = 'grab';
        handleSwipe();
    }, false);

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && !isAnimating) {
            if (currentIndex > 0) {
                currentIndex--;
                displayCandidate(currentIndex, "left");
            } else {
                animateBounce("left");
            }
        } else if (e.key === 'ArrowRight' && !isAnimating) {
            if (currentIndex < candidates.length - 1) {
                currentIndex++;
                displayCandidate(currentIndex, "right");
            } else {
                animateBounce("right");
            }
        }
    });
}

// Handle the swipe gesture
function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;

    if (Math.abs(swipeDistance) >= swipeThreshold) {
        if (swipeDistance > 0) {
            // Swiped right, go to previous
            if (currentIndex > 0) {
                currentIndex--;
                displayCandidate(currentIndex, "left");
            } else {
                // Bounce animation for first card
                animateBounce("left");
            }
        } else {
            // Swiped left, go to next
            if (currentIndex < candidates.length - 1) {
                currentIndex++;
                displayCandidate(currentIndex, "right");
            } else {
                // Bounce animation for last card
                animateBounce("right");
            }
        }
    }
}

// Animate a bounce effect when swiping at the edges
function animateBounce(direction) {
    if (isAnimating) return;

    isAnimating = true;
    const bounceDistance = direction === "left" ? '3%' : '-3%';

    candidateCard.style.transition = 'transform 0.15s ease-out';
    candidateCard.style.transform = `translateX(${bounceDistance})`;

    setTimeout(() => {
        candidateCard.style.transform = 'translateX(0)';
        setTimeout(() => {
            isAnimating = false;
        }, 150);
    }, 150);
}

// Add CSS to the document
function addSwipeStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .card-container {
            cursor: grab;
            user-select: none;
            -webkit-user-select: none;
            touch-action: pan-y;
            position: relative;
            width: 100%;
            max-width: 1000px;
            margin: 0 auto;
            height: 600px;
        }

        .card-wrapper {
            position: relative;
            overflow: hidden;
            height: 100%;
        }

        .candidate-card {
            user-select: none;
            -webkit-user-select: none;
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border-radius: 1rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
            background: white;
            overflow: hidden;
            transition: transform 0.4s ease-out, opacity 0.4s ease-out;
        }

        /* Enhanced animations for card transitions */
        @keyframes slideInFromRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideInFromLeft {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideOutToLeft {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(-100%); opacity: 0; }
        }

        @keyframes slideOutToRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }

        .card-enter-from-right {
            animation: slideInFromRight 0.5s forwards;
        }

        .card-enter-from-left {
            animation: slideInFromLeft 0.5s forwards;
        }

        .card-leave-to-left {
            animation: slideOutToLeft 0.5s forwards;
        }

        .card-leave-to-right {
            animation: slideOutToRight 0.5s forwards;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
            .card-container {
                height: 600px;
                min-height: 500px;
                max-height: 600px;
                margin-bottom: 2rem;
                cursor: grab;
            }
            
            .card-body {
                padding: 1rem;
                height: calc(100% - 60px);
                overflow-y: auto;
            }
            
            .nav-tabs .nav-link {
                padding: 0.5rem 0.75rem;
                font-size: 0.9rem;
            }
            
            .card-header {
                padding: 1rem;
            }
            
            .card-header h4 {
                font-size: 1.2rem;
            }
            
            .tag-pill {
                font-size: 0.8rem;
                padding: 0.2rem 0.5rem;
                margin-right: 0.3rem;
                margin-bottom: 0.3rem;
            }
            
            .comment-card {
                padding: 0.75rem;
                margin-bottom: 0.75rem;
            }
            
            .nav-controls {
                position: absolute;
                top: 50%;
                width: 100%;
                transform: translateY(-50%);
                z-index: 20;
                pointer-events: none;
            }
            
            .nav-btn {
                width: 35px;
                height: 35px;
                pointer-events: auto;
            }
            
            .prev-btn {
                left: 5px;
            }
            
            .next-btn {
                right: 5px;
            }
        }
    `;
    document.head.appendChild(styleElement);
}

// Open the rating modal
function openRateModal(index) {
    selectedIndex = index;
    let candidate = candidates[index];
    
    // Set candidate name and interests in the modal
    document.getElementById("modalCandidateName-1").textContent = candidate.name;
    
    const interestsList = document.getElementById("modalCandidateInterests-1");
    if (candidate.interests && candidate.interests.length > 0) {
        interestsList.innerHTML = candidate.interests
            .map(interest => `<li class="mb-1">${interest}</li>`)
            .join("");
    } else {
        interestsList.innerHTML = "<li>No interests specified.</li>";
    }

    // Reset modal elements
    document.getElementById("rating").value = "";
    document.getElementById("first_display").style.display = "block";
    document.querySelector(".interest-prompt").style.display = "none";
    document.getElementById("comment").style.display = "none";
    document.getElementById("comments-section").innerHTML = ""; // Clear previous comments

    // Reset previous rating indicators
    document.getElementById("previousRatingBadge").classList.add("d-none");
    document.getElementById("previousRatingLabel").classList.add("d-none");
    document.getElementById("previousCommentsLabel").classList.add("d-none");

    // Fetch previous ratings and comments
    checkPreviousRating(candidate.id);

    // Show the modal
    rateModalObj.show();
}

// Close rating modal
function closeRateModal() {
    rateModalObj.hide();
}

// Check for previous ratings
function checkPreviousRating(applicationId) {
    fetch(`/get_comments?application_id=${applicationId}`)
        .then(response => response.json())
        .then(data => {
            if (data.rating) {
                // Show the previous rating badge
                const ratingBadge = document.getElementById("previousRatingBadge");
                const ratingLabel = document.getElementById("previousRatingLabel");
                const ratingValue = document.getElementById("previousRatingValue");

                ratingBadge.classList.remove("d-none");
                ratingLabel.classList.remove("d-none");
                ratingValue.textContent = data.rating;

                // Pre-fill the rating input with previous value
                document.getElementById("rating").value = data.rating;

                // If they also had comments before
                if (data.has_comments) {
                    document.getElementById("previousCommentsLabel").classList.remove("d-none");
                }
            }
        })
        .catch(error => {
            console.error("Error checking previous rating:", error);
        });
}

// Handle rating input
document.getElementById("rating").addEventListener("input", function () {
    let rating = parseInt(this.value, 10);

    if (rating < 4) {
        document.getElementById("first_display").style.display = "none";
        document.querySelector(".interest-prompt").style.display = "block";
        document.getElementById("comment").style.display = "none";
    } else {
        document.getElementById("first_display").style.display = "block";
        document.querySelector(".interest-prompt").style.display = "none";
        document.getElementById("comment").style.display = "block";
    }
});

// Handle radio button selection
document.querySelectorAll("input[name='interest_prompt']").forEach((radio) => {
    radio.addEventListener("change", function () {
        if (this.value === "yes") {
            let applicantId = candidates[selectedIndex].id;
            document.getElementById("comment").style.display = "block";
            fetchComments(applicantId);
        } else {
            document.getElementById("comment").style.display = "none";
        }
    });
});

// Fetch comments for a candidate
function fetchComments(applicationId) {
    let facultyName = document.getElementById("loggedInUser").value;
    let userHasCommented = false;

    fetch(`/get_comments?application_id=${applicationId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let commentsSection = document.getElementById("comments-section");
                if (!commentsSection) {
                    console.error("Error: comments-section not found in DOM");
                    return;
                }

                commentsSection.innerHTML = ""; // Clear previous comments

                if (data.comments.length === 0) {
                    commentsSection.innerHTML = "<p class='text-muted'>No comments yet.</p>";
                    return;
                }

                data.comments.forEach(comment => {
                    const commentDiv = document.createElement("div");
                    commentDiv.setAttribute("id", `comment-${comment.id}`);

                    // Check if this is the current user's comment
                    if (comment.faculty_name === facultyName) {
                        userHasCommented = true;
                    }

                    commentDiv.innerHTML = `
                        <div class="comment-card mb-3 border-start border-3 ps-3" style="border-color: #236465 !important;">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="comment-content">
                                    <p class="mb-1" style="color:#236465 !important">
                                        <strong class="fw-bold">${comment.faculty_name || facultyName}:</strong>
                                        <span id="commentText-${comment.id}" style="color: inherit;">${comment.comment}</span>
                                    </p>
                                    <small class="text-muted comment-time">${comment.timestamp || 'Just now'}</small>
                                </div>
                                <div class="comment-actions">
                                    ${comment.faculty_name === facultyName ? `
                                    <button class="btn btn-sm rounded-pill me-1 shadow-sm" style="background:#008080 !important; color: white;"
                                        onclick="editComment('${comment.id}')">
                                        <i class="fas fa-edit me-1"></i> Edit
                                    </button>
                                    <button class="btn btn-sm rounded-pill shadow-sm" style="background:#AD4245 !important; color: white;"
                                        onclick="deleteComment('${comment.id}')">
                                        <i class="fas fa-trash-alt me-1"></i> Delete
                                    </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;

                    commentsSection.appendChild(commentDiv);
                });

                // Show the "you've previously commented" indicator if applicable
                if (userHasCommented) {
                    document.getElementById("previousCommentsLabel").classList.remove("d-none");
                }
            } else {
                console.error("Failed to fetch comments:", data.message);
                showToast("Failed to load comments", "error");
            }
        })
        .catch(error => {
            console.error("Error fetching comments:", error);
            showToast("Error loading comments", "error");
        });
}

// Function to edit a comment
function editComment(commentId) {
    const commentSpan = document.getElementById(`commentText-${commentId}`);
    const newComment = prompt("Edit your comment:", commentSpan.textContent);

    if (newComment !== null && newComment.trim() !== "") {
        fetch("/comment", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                comment_id: commentId,
                rating: document.getElementById("rating").value, // Include updated rating
                interest_prompt: document.querySelector("input[name='interest_prompt']:checked")?.value || "",
                comment: newComment
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                commentSpan.textContent = newComment;
                showToast("Comment updated successfully!");
            } else {
                showToast("Error: " + data.message, "error");
            }
        })
        .catch(error => {
            console.error("Error updating comment:", error);
            showToast("Error updating comment", "error");
        });
    }
}

// Function to delete a comment
function deleteComment(commentId) {
    if (confirm("Are you sure you want to delete this comment?")) {
        fetch("/delete_comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comment_id: commentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById(`comment-${commentId}`).remove();
                showToast("Comment deleted successfully!");
            } else {
                showToast("Error: " + data.message, "error");
            }
        })
        .catch(error => {
            console.error("Error deleting comment:", error);
            showToast("Error deleting comment", "error");
        });
    }
}

// Submit rating and comment
function submitRating() {
    const rating = document.getElementById("rating").value;
    const comment = document.getElementById("new-comment").value;
    const interestPrompt = document.querySelector("input[name='interest_prompt']:checked")?.value || "";
    
    if (!rating) {
        showToast("Please provide a rating", "error");
        return;
    }
    
    if (rating < 4 && !interestPrompt) {
        showToast("Please answer the interest prompt", "error");
        return;
    }
    
    if (rating < 4 && !comment) {
        showToast("Please provide a comment for low ratings", "error");
        return;
    }
    
    const candidate = candidates[selectedIndex];
    
    fetch("/rate_candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            application_id: candidate.id,
            rating: rating,
            interest_prompt: interestPrompt,
            comment: comment
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast("Rating submitted successfully!");
            closeRateModal();
            
            // Refresh the candidate display to show updated rating
            displayCandidate(currentIndex, "right");
        } else {
            showToast("Error: " + data.message, "error");
        }
    })
    .catch(error => {
        console.error("Error submitting rating:", error);
        showToast("Error submitting rating", "error");
    });
}

// Toast notification helper
function showToast(message, type = "success") {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        toastContainer.className = "position-fixed bottom-0 end-0 p-3";
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastId = "toast-" + Date.now();
    const toast = document.createElement("div");
    toast.id = toastId;
    toast.className = `toast align-items-center text-white bg-${type === "success" ? "success" : type === "error" ? "danger" : "warning"} border-0`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");

    toast.innerHTML = `
    <div class="d-flex">
        <div class="toast-body">
            ${message}
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
}

// Populate course filters
function populateCourseFilters() {
    const courses = new Set();
    
    // Extract courses from candidates
    candidates.forEach(candidate => {
        if (candidate.interests && candidate.interests.length > 0) {
            candidate.interests.forEach(course => {
                courses.add(course.trim());
            });
        } else if (candidate.summary) {
            // Extract course from summary if interests not available
            const courseMatch = candidate.summary.match(/Interested in (.+?)\./);
            if (courseMatch && courseMatch[1]) {
                courses.add(courseMatch[1].trim());
            }
        }
    });

    courseFilters.innerHTML = Array.from(courses).map(course => `
        <div class="filter-option" data-filter="course" data-value="${course}">
            <i class="fas fa-book"></i> ${course}
        </div>
    `).join('');
}

// Toggle course filter
function toggleCourseFilter(option) {
    const course = option.dataset.value;
    if (activeFilters.courses.has(course)) {
        activeFilters.courses.delete(course);
        option.classList.remove('active');
    } else {
        activeFilters.courses.add(course);
        option.classList.add('active');
    }
    applyFilters();
}

// Toggle filter
function toggleFilter(filterType, value, option) {
    const currentValue = activeFilters[filterType];
    if (currentValue === value) {
        activeFilters[filterType] = null;
        option.classList.remove('active');
    } else {
        activeFilters[filterType] = value;
        option.classList.remove('active');
        option.classList.add('active');
    }
    applyFilters();
}

// Apply filters
function applyFilters() {
    activeFilters.searchQuery = searchInput.value.toLowerCase();
    
    filteredCandidates = candidates.filter(candidate => {
        // Search filter
        if (activeFilters.searchQuery && !candidate.name.toLowerCase().includes(activeFilters.searchQuery)) {
            return false;
        }

        // Course filter
        if (activeFilters.courses.size > 0) {
            const candidateCourses = new Set();
            
            // Add courses from interests array
            if (candidate.interests && candidate.interests.length > 0) {
                candidate.interests.forEach(course => {
                    candidateCourses.add(course.trim());
                });
            }
            
            // Add course from summary if interests not available
            if (candidate.summary) {
                const courseMatch = candidate.summary.match(/Interested in (.+?)\./);
                if (courseMatch && courseMatch[1]) {
                    candidateCourses.add(courseMatch[1].trim());
                }
            }
            
            if (!Array.from(activeFilters.courses).some(course => candidateCourses.has(course))) {
                return false;
            }
        }

        // Rating status filter
        if (activeFilters.ratingStatus) {
            const hasRating = candidate.rating !== undefined;
            if (activeFilters.ratingStatus === 'rated' && !hasRating) return false;
            if (activeFilters.ratingStatus === 'not-rated' && hasRating) return false;
        }

        // Rating value filter
        if (activeFilters.ratingValue && candidate.rating !== parseInt(activeFilters.ratingValue)) {
            return false;
        }

        return true;
    });

    updateFilterUI();
    updateFilterCount();
    
    if (filteredCandidates.length === 0) {
        noResults.classList.remove('d-none');
        candidateCard.parentElement.classList.add('d-none');
    } else {
        noResults.classList.add('d-none');
        candidateCard.parentElement.classList.remove('d-none');
        if (currentIndex >= filteredCandidates.length) {
            currentIndex = 0;
        }
        displayCandidate(currentIndex);
        createNavigationDots();
    }
}

// Update filter UI
function updateFilterUI() {
    // Update active filter badges
    activeFiltersContainer.innerHTML = '';
    
    // Course filters
    activeFilters.courses.forEach(course => {
        addFilterBadge('course', course, 'book');
    });

    // Rating status
    if (activeFilters.ratingStatus) {
        addFilterBadge('rating-status', activeFilters.ratingStatus === 'rated' ? 'Rated' : 'Not Rated', 'star');
    }

    // Rating value
    if (activeFilters.ratingValue) {
        addFilterBadge('rating-value', `${activeFilters.ratingValue} Stars`, 'star');
    }

    // Search query
    if (activeFilters.searchQuery) {
        addFilterBadge('search', `Search: ${activeFilters.searchQuery}`, 'search');
    }
}

// Add filter badge
function addFilterBadge(type, value, icon) {
    const badge = document.createElement('div');
    badge.className = 'filter-badge';
    badge.innerHTML = `
        ${value}
        <i class="fas fa-${icon} fa-times" onclick="removeFilter('${type}', '${value}')"></i>
    `;
    activeFiltersContainer.appendChild(badge);
}

// Remove filter
function removeFilter(type, value) {
    if (type === 'course') {
        activeFilters.courses.delete(value);
        const option = courseFilters.querySelector(`[data-value="${value}"]`);
        if (option) option.classList.remove('active');
    } else if (type === 'search') {
        searchInput.value = '';
        activeFilters.searchQuery = '';
    } else {
        activeFilters[type] = null;
        const option = document.querySelector(`[data-filter="${type}"][data-value="${value}"]`);
        if (option) option.classList.remove('active');
    }
    applyFilters();
}

// Reset all filters
function resetAllFilters() {
    // Reset course filters
    activeFilters.courses.clear();
    courseFilters.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('active');
    });

    // Reset rating filters
    activeFilters.ratingStatus = null;
    activeFilters.ratingValue = null;
    document.querySelectorAll('.filter-option[data-filter]').forEach(option => {
        option.classList.remove('active');
    });

    // Reset search
    searchInput.value = '';
    activeFilters.searchQuery = '';

    // Apply filters
    applyFilters();
}

// Update filter count
function updateFilterCount() {
    const count = activeFilters.courses.size + 
        (activeFilters.ratingStatus ? 1 : 0) + 
        (activeFilters.ratingValue ? 1 : 0) + 
        (activeFilters.searchQuery ? 1 : 0);
    filterCount.textContent = count;
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 