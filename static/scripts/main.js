// Global variables
let candidates = [];
let currentIndex = 0;
let selectedIndex = null;
let rateModalObj;
let isAnimating = false;

// DOM elements
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const navDots = document.getElementById("nav-dots");
const candidateCard = document.getElementById("candidateCard");
const cardWrapper = document.querySelector('.card-wrapper');

// Touch swipe variables
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 50; // Minimum distance required for a swipe

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap modals
    rateModalObj = new bootstrap.Modal(document.getElementById("rateModal"));
    
    // Initialize star rating functionality
    initStarRating();
    
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
    const cardBody = document.querySelector('.card-body');
    
    // Add event listener for window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            // Mobile adjustments - using fixed height instead of auto
            cardContainer.style.height = '600px';
            cardContainer.style.minHeight = '500px';
            cardContainer.style.maxHeight = '600px';
            
            if (cardBody) {
                cardBody.style.padding = '1rem';
                cardBody.style.height = 'calc(100% - 60px)';
            }
            
            // Make tabs more compact
            const tabs = document.querySelectorAll('.nav-tabs .nav-link');
            tabs.forEach(tab => {
                tab.style.padding = '0.5rem 0.75rem';
                tab.style.fontSize = '0.9rem';
            });
            
            // Adjust spacing in card content
            const cardContent = document.querySelectorAll('.card-body h6, .card-body p');
            cardContent.forEach(element => {
                if (element.classList.contains('mb-3')) {
                    element.classList.remove('mb-3');
                    element.classList.add('mb-2');
                }
            });
        } else {
            // Desktop adjustments
            cardContainer.style.height = '600px';
            cardContainer.style.minHeight = '500px';
            cardContainer.style.maxHeight = '600px';
            
            if (cardBody) {
                cardBody.style.padding = '1.5rem';
                cardBody.style.height = 'calc(100% - 70px)';
            }
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

        if (candidates.length > 0) {
            // Create navigation dots
            createNavDots(candidates.length);
            displayCandidate(currentIndex, "right"); // Initial display
            updateNavDots();
        }
    } catch (error) {
        console.error("Error fetching candidates:", error);
        candidateCard.innerHTML = "<div class='d-flex justify-content-center align-items-center h-100'><p class='text-danger'><i class='fas fa-exclamation-triangle me-2'></i>Error loading candidates. Please try again later.</p></div>";
    }
}

// Create navigation dots based on candidate count
function createNavDots(count) {
    navDots.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const dot = document.createElement('div');
        dot.className = 'nav-dot';
        dot.setAttribute('data-index', i);
        dot.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            const direction = index > currentIndex ? "right" : "left";
            currentIndex = index;
            displayCandidate(currentIndex, direction);
            updateNavDots();
        });
        navDots.appendChild(dot);
    }
}

// Update active state of navigation dots
function updateNavDots() {
    document.querySelectorAll('.nav-dot').forEach((dot, index) => {
        if (index === currentIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Function to display a candidate with animation
function displayCandidate(index, direction) {
    if (candidates.length === 0 || isAnimating) return;

    isAnimating = true;
    let candidate = candidates[index];
    selectedIndex = index;  // Set the selectedIndex to the current index

    

    // Create a new card element that will slide in
    const newCard = document.createElement('div');
    newCard.className = 'candidate-card';
    newCard.id = 'newCandidateCard';

    // Add appropriate animation class based on direction
    // For "right" direction (next), new card slides in from right, current slides out to left
    // For "left" direction (previous), new card slides in from left, current slides out to right
    newCard.classList.add(direction === "left" ? "card-enter-from-left" : "card-enter-from-right");

    // Prepare card content
    newCard.innerHTML = `
        <div class="card-header">
            <h3>${candidate.name}</h3>
            <div class="candidate-status ${candidate.status.toLowerCase()}">${candidate.status}</div>
        </div>
        <div class="card-body">
            <ul class="nav nav-tabs" role="tablist">
                <li class="nav-item">
                    <a class="nav-link active" data-bs-toggle="tab" href="#summary-${index}">Summary</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#details-${index}">Details</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#rating-${index}">Rating</a>
                </li>
            </ul>
            <div class="tab-content">
                <div class="tab-pane fade show active" id="summary-${index}">
                    <div class="ai-summary">
                        <h4>AI-Generated Summary</h4>
                        <p>${candidate.ai_summary}</p>
                    </div>
                    <div class="candidate-details">
                        <p><strong>Email:</strong> ${candidate.email}</p>
                        <p><strong>Phone:</strong> ${candidate.phone}</p>
                        <p><strong>Applied:</strong> ${candidate.created_at}</p>
                    </div>
                </div>
                <div class="tab-pane fade" id="details-${index}">
                    <div class="document-links">
                        ${candidate.cv_link ? `<a href="${candidate.cv_link}" target="_blank" class="btn btn-outline-primary"><i class="fas fa-file-pdf"></i> Resume</a>` : ''}
                        ${candidate.cover_letter_link ? `<a href="${candidate.cover_letter_link}" target="_blank" class="btn btn-outline-primary"><i class="fas fa-file-alt"></i> Cover Letter</a>` : ''}
                        ${candidate.transcript_link ? `<a href="${candidate.transcript_link}" target="_blank" class="btn btn-outline-primary"><i class="fas fa-file-contract"></i> Transcript</a>` : ''}
                    </div>
                </div>
                <div class="tab-pane fade" id="rating-${index}">
                    <div class="rating-section">
                        <div class="current-rating">
                            <h4>Current Rating</h4>
                            <div class="stars">
                                ${generateStars(candidate.rating || 0)}
                            </div>
                            ${candidate.comment ? `<p class="comment">${candidate.comment}</p>` : ''}
                        </div>
                        <button class="btn btn-primary rate-btn" onclick="openRatingModal(${candidate.id})">
                            Rate Candidate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add the new card
    cardWrapper.appendChild(newCard);

    // Get the current card
    const currentCard = document.getElementById('candidateCard');

    // Apply opposite animation to the current card
    currentCard.className = 'candidate-card';
    void currentCard.offsetWidth; // Force reflow
    currentCard.classList.add(direction === "left" ? "card-leave-to-right" : "card-leave-to-left");

    // After animation completes
    setTimeout(() => {
        // Remove the old card
        cardWrapper.removeChild(currentCard);

        // Make the new card the current card
        newCard.id = 'candidateCard';
        newCard.classList.remove('card-enter-from-left', 'card-enter-from-right');

        // Initialize Bootstrap tabs in the new card
        const tabs = newCard.querySelectorAll('[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const target = newCard.querySelector(this.dataset.bsTarget);
                newCard.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('show', 'active');
                });
                newCard.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                this.classList.add('active');
                target.classList.add('show', 'active');
            });
        });

        // Load ratings and comments for this candidate
        loadExistingRatingAndComments(candidate.id);

        isAnimating = false;
    }, 500); // Match this to your animation duration

    // Update navigation dots
    updateNavDots();
}

// Helper function to generate star rating HTML
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Load existing rating and comments for the current candidate
function loadExistingRatingAndComments(applicationId) {
    if (!applicationId) {
        console.error('Application ID is required');
        return;
    }
    
    fetch(`/get_comments?application_id=${applicationId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
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
            } else {
                ratingStatus.innerHTML = `
                    <span class="text-muted">You haven't rated this candidate yet</span>
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
            showToast("Error loading ratings and comments", "error");
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
    // Validate index
    if (index === null || index === undefined || index < 0 || index >= candidates.length) {
        console.error('Invalid index for openRateModal:', index);
        showToast("Error: Invalid candidate selection", "error");
        return;
    }
    
    selectedIndex = index;
    let candidate = candidates[index];
    
    if (!candidate) {
        console.error('No candidate found at index:', index);
        showToast("Error: Candidate data not found", "error");
        return;
    }
    
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
    document.getElementById("interest-prompt-section").classList.add("d-none");
    document.getElementById("new-comment-container").classList.add("d-none");
    document.getElementById("comments-section").innerHTML = ""; // Clear previous comments
    document.getElementById("new-comment").value = ""; // Clear new comment input

    // Reset previous rating indicators
    document.getElementById("previousRatingBadge").classList.add("d-none");
    document.getElementById("previousRatingLabel").classList.add("d-none");
    document.getElementById("previousCommentsLabel").classList.add("d-none");
    document.getElementById("edit-rating-container").classList.add("d-none");
    
    // Make sure submit button is visible
    document.getElementById("final-subButton").classList.remove("d-none");
    
    // Check for previous rating
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
    if (!applicationId) {
        console.error('Application ID is required');
        return;
    }
    
    fetch(`/get_comments?application_id=${applicationId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.rating) {
                // Show the previous rating badge
                const ratingBadge = document.getElementById("previousRatingBadge");
                const ratingLabel = document.getElementById("previousRatingLabel");
                const ratingValue = document.getElementById("previousRatingValue");
                const editRatingContainer = document.getElementById("edit-rating-container");
                const submitButton = document.getElementById("final-subButton");

                ratingBadge.classList.remove("d-none");
                ratingLabel.classList.remove("d-none");
                ratingValue.textContent = data.rating;
                
                // Pre-fill the rating input with previous value
                document.getElementById("rating").value = data.rating;
                
                // Update star rating
                updateStarRating(parseInt(data.rating));
                
                // If they also had comments before
                if (data.has_comments) {
                    document.getElementById("previousCommentsLabel").classList.remove("d-none");
                    
                    // Show edit button if they've already rated
                    editRatingContainer.classList.remove("d-none");
                    
                    // Fetch and display existing comments
                    fetchComments(applicationId);
                }
                
                // Check if rating is low to show interest prompt
                if (parseInt(data.rating) < 4) {
                    document.getElementById("interest-prompt-section").classList.remove("d-none");
                    
                    // If they had an interest prompt answer before, pre-select it
                    if (data.interest_prompt) {
                        const radioButton = document.querySelector(`input[name='interest_prompt'][value='${data.interest_prompt}']`);
                        if (radioButton) {
                            radioButton.checked = true;
                            
                            // If they answered "yes", show the comment section
                            if (data.interest_prompt === "yes") {
                                document.getElementById("new-comment-container").classList.remove("d-none");
                            }
                        }
                    }
                } else {
                    // For high ratings, show comment section
                    document.getElementById("new-comment-container").classList.remove("d-none");
                }
                
                // If we're in edit mode, hide the submit button
                if (editRatingContainer && !editRatingContainer.classList.contains("d-none")) {
                    submitButton.classList.add("d-none");
                }
            }
        })
        .catch(error => {
            console.error("Error checking previous rating:", error);
            showToast("Error checking previous rating", "error");
        });
}

// Update star rating display
function updateStarRating(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
            star.style.color = '#AD4245';
            } else {
            star.classList.remove('fas');
            star.classList.add('far');
            star.style.color = '#ccc';
        }
    });
}

// Initialize star rating functionality
function initStarRating() {
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('rating');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            ratingInput.value = rating;
            updateStarRating(rating);
            
            // Trigger the input event to handle showing/hiding sections
            ratingInput.dispatchEvent(new Event('input'));
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            updateStarRating(rating);
        });
        
        star.addEventListener('mouseout', function() {
            const currentRating = parseInt(ratingInput.value) || 0;
            updateStarRating(currentRating);
        });
    });
}

// Handle rating input
document.getElementById("rating").addEventListener("input", function () {
    let rating = parseInt(this.value, 10);
    
    // Update star rating
    updateStarRating(rating);

    // Handle visibility of sections based on rating
    if (rating < 4) {
        // For low ratings (1-3), show interest prompt and hide comment section initially
        document.getElementById("interest-prompt-section").classList.remove("d-none");
        document.getElementById("new-comment-container").classList.add("d-none");
        
        // Reset radio buttons when rating changes
        document.querySelectorAll("input[name='interest_prompt']").forEach(radio => {
            radio.checked = false;
        });
    } else {
        // For high ratings (4-5), hide interest prompt and show comment section
        document.getElementById("interest-prompt-section").classList.add("d-none");
        document.getElementById("new-comment-container").classList.remove("d-none");
    }
});

// Handle radio button selection
document.querySelectorAll("input[name='interest_prompt']").forEach((radio) => {
    radio.addEventListener("change", function () {
        if (this.value === "yes") {
            // If "yes" is selected, show comment section
            document.getElementById("new-comment-container").classList.remove("d-none");
            
            // Fetch comments if we have a valid candidate
            if (selectedIndex !== null && candidates[selectedIndex]) {
                fetchComments(candidates[selectedIndex].id);
            }
        } else {
            // If "no" is selected, hide comment section
            document.getElementById("new-comment-container").classList.add("d-none");
        }
    });
});

// Fetch comments for a candidate
function fetchComments(applicationId) {
    if (!applicationId) {
        console.error('Application ID is required');
        return;
    }
    
let facultyName = document.getElementById("loggedInUser").value;
let userHasCommented = false;

fetch(`/get_comments?application_id=${applicationId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
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
        // Pre-select the "yes" radio button for interest_prompt
        const yesRadioButton = document.querySelector("input[name='interest_prompt'][value='yes']");
        if (yesRadioButton) {
            yesRadioButton.checked = true;
        }
        
        // Show the comment section when editing
        document.getElementById("new-comment-container").classList.remove("d-none");
        
        // Set the new comment value in the textarea
        document.getElementById("new-comment").value = newComment;
        
        // Hide the submit button when editing
        document.getElementById("final-subButton").classList.add("d-none");
        
fetch("/comment", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        comment_id: commentId,
        rating: document.getElementById("rating").value, // Include updated rating
                interest_prompt: "yes", // Always set to "yes" when editing
        comment: newComment
    })
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        commentSpan.textContent = newComment;
        showToast("Comment updated successfully!");
                
                // Show the submit button again after successful edit
                document.getElementById("final-subButton").classList.remove("d-none");
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
    
    // Validate based on rating value
    if (parseInt(rating) < 4) {
        // For low ratings, require interest prompt
        if (!interestPrompt) {
            showToast("Please answer the interest prompt", "error");
            return;
        }
        
        // If interest prompt is "yes", require a comment
        if (interestPrompt === "yes" && !comment) {
            showToast("Please provide a comment for low ratings with positive qualities", "error");
            return;
        }
    } else {
        // For high ratings (4-5), we don't require a comment
        // But if the comment section is visible, we should allow an optional comment
        const commentContainer = document.getElementById("new-comment-container");
        if (!commentContainer.classList.contains("d-none") && !comment) {
            // If the comment section is visible but no comment is provided, we'll just submit without a comment
            console.log("Comment section visible but no comment provided, proceeding with submission");
        }
    }
    
    const candidate = candidates[selectedIndex];
    
    if (!candidate || !candidate.id) {
        showToast("Error: Invalid candidate data", "error");
        return;
    }
    
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
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
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