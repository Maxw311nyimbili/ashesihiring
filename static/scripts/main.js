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

    // Initialize all event listeners for the improved rating modal
    initRatingModalEvents();
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
        <div class="card-header d-flex justify-content-between align-items-center">
            <h4 class="mb-0 fw-bold">${candidate.name}</h4>
            <span class="badge bg-light text-dark rounded-pill">${index + 1}/${candidates.length}</span>
        </div>
        <div class="card-body">
            <ul class="nav nav-tabs mb-3" id="candidateTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="info-tab" data-bs-toggle="tab" data-bs-target="#info-pane" type="button" role="tab">
                        <i class="fas fa-user-circle me-1"></i> Summary
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="details-tab" data-bs-toggle="tab" data-bs-target="#details-pane" type="button" role="tab">
                        <i class="fas fa-clipboard-list me-1"></i> Details
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="rate-tab" data-bs-toggle="tab" data-bs-target="#rate-pane" type="button" role="tab">
                        <i class="fas fa-star me-1"></i> Rate
                    </button>
                </li>
            </ul>

            <div class="tab-content">
                <!-- Summary Tab -->
                <div class="tab-pane fade show active" id="info-pane" role="tabpanel" tabindex="0">
                    <div class="candidate-info-box">
                        <div class="mb-3">
                            <h6 class="text-danger mb-1">Interested to be an FI for:</h6>
                            <div class="interests-container">
                                ${candidate.interests && candidate.interests.length > 0 ?
                                  candidate.interests.map(interest => `<span class="tag-pill">${interest}</span>`).join('') :
                                  "<span class='text-muted fst-italic'>No interests specified</span>"}
                            </div>
                        </div>
                    </div>

                    <h6 class="fw-bold">Summary</h6>
                    <p>${candidate.summary}</p>
                </div>

                <!-- Details Tab -->
                <div class="tab-pane fade" id="details-pane" role="tabpanel" tabindex="0">
                    <h6 class="fw-bold mb-3">Detailed Information</h6>
                    <div>${candidate.details}</div>
                </div>

                <!-- Rate Tab -->
                <div class="tab-pane fade" id="rate-pane" role="tabpanel" tabindex="0">
                    <div class="rating-card p-3 mb-3" id="ratingStatusCard">
                        <h6 class="fw-bold text-secondary mb-3">Candidate Rating</h6>
                        <div class="d-flex align-items-center justify-content-between">
                            <div id="ratingStatus">
                                <span class="text-muted">You haven't rated this candidate yet</span>
                            </div>
                            <button class="btn btn-primary" onclick="openRateModal(${index})">
                                <i class="fas fa-star me-1"></i> Rate Now
                            </button>
                        </div>
                    </div>

                    <div class="mt-4" id="candidateCommentsSection">
                        <h6 class="fw-bold text-secondary mb-3">Faculty Comments</h6>
                        <div id="commentsList" class="comment-list">
                            <!-- Will be populated via JavaScript -->
                            <p class="text-muted fst-italic">No comments yet</p>
                        </div>
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

// Enhanced Rating Modal Logic
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all event listeners for the improved rating modal
    initRatingModalEvents();
});

// Initialize all event listeners for the rating modal
function initRatingModalEvents() {
    // Step navigation buttons
    document.getElementById('next-to-rating').addEventListener('click', () => {
        showRatingStep(2);
        updateProgressBar(66);
    });
    
    document.getElementById('back-to-info').addEventListener('click', () => {
        showRatingStep(1);
        updateProgressBar(33);
    });
    
    document.getElementById('next-to-comments').addEventListener('click', () => {
        showRatingStep(3);
        updateProgressBar(100);
    });
    
    document.getElementById('back-to-rating').addEventListener('click', () => {
        showRatingStep(2);
        updateProgressBar(66);
    });
    
    // Star rating with enhanced feedback
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('rating');
    const nextToCommentsBtn = document.getElementById('next-to-comments');
    const ratingFeedback = document.getElementById('ratingFeedback');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            ratingInput.value = rating;
            updateStarRating(rating);
            
            // Provide feedback based on rating
            const feedbackMessages = [
                "Poor fit for the position",
                "Below average candidate",
                "Acceptable candidate",
                "Strong candidate",
                "Exceptional candidate"
            ];
            
            ratingFeedback.textContent = feedbackMessages[rating - 1];
            ratingFeedback.className = 'mt-2 fw-medium';
            
            // Add appropriate color based on rating
            if (rating <= 2) {
                ratingFeedback.classList.add('text-danger');
            } else if (rating == 3) {
                ratingFeedback.classList.add('text-warning');
            } else {
                ratingFeedback.classList.add('text-success');
            }
            
            // Show/hide interest prompt based on rating
            handleRatingChange(rating);
            
            // Enable the next button when a rating is selected
            nextToCommentsBtn.disabled = false;
        });
        
        // Enhanced hover effects
        star.addEventListener('mouseover', function() {
            const hoverRating = parseInt(this.getAttribute('data-rating'));
            highlightStars(hoverRating);
        });
        
        star.addEventListener('mouseout', function() {
            const currentRating = parseInt(ratingInput.value) || 0;
            highlightStars(currentRating);
        });
    });
    
    // Interest prompt radio buttons
    document.querySelectorAll("input[name='interest_prompt']").forEach((radio) => {
        radio.addEventListener("change", function() {
            // No need to conditionally enable the next button here as it's already enabled by rating selection
        });
    });
    
    // Character count for comment textarea
    const commentTextarea = document.getElementById('new-comment');
    const characterCount = document.getElementById('characterCount');
    
    commentTextarea.addEventListener('input', function() {
        const currentLength = this.value.length;
        characterCount.textContent = `${currentLength}/500`;
        
        // Visual feedback for character count
        if (currentLength > 450) {
            characterCount.className = 'text-danger';
        } else if (currentLength > 350) {
            characterCount.className = 'text-warning';
        } else {
            characterCount.className = 'text-muted';
        }
    });
    
    // Submit rating button
    document.getElementById('submit-rating').addEventListener('click', submitRatingEnhanced);
    
    // Edit mode controls
    document.getElementById('cancel-edit').addEventListener('click', () => {
        // Revert to display mode and reset form
        toggleEditMode(false);
    });
    
    document.getElementById('update-rating').addEventListener('click', () => {
        submitRatingEnhanced(true); // Pass true to indicate this is an update
    });
}

// Show the specified step and hide others
function showRatingStep(stepNumber) {
    document.querySelectorAll('.rating-step').forEach((step, index) => {
        if (index + 1 === stepNumber) {
            step.classList.remove('d-none');
            // Add a subtle animation
            step.style.opacity = 0;
            setTimeout(() => {
                step.style.transition = 'opacity 0.3s ease';
                step.style.opacity = 1;
            }, 50);
        } else {
            step.classList.add('d-none');
        }
    });
}

// Update the progress bar
function updateProgressBar(percentage) {
    const progressBar = document.getElementById('ratingProgressBar');
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
    
    // Animate the progress bar
    progressBar.style.transition = 'width 0.4s ease-in-out';
}

// Handle showing/hiding sections based on rating
function handleRatingChange(rating) {
    const interestPromptSection = document.getElementById('interest-prompt-section');
    
    // For low ratings (1-3), show interest prompt
    if (rating < 4) {
        interestPromptSection.classList.remove('d-none');
        // Apply fade-in effect
        interestPromptSection.style.opacity = 0;
        setTimeout(() => {
            interestPromptSection.style.transition = 'opacity 0.3s ease';
            interestPromptSection.style.opacity = 1;
        }, 50);
        
        // Reset radio buttons
        document.querySelectorAll("input[name='interest_prompt']").forEach(radio => {
            radio.checked = false;
        });
    } else {
        // For high ratings (4-5), hide interest prompt
        interestPromptSection.classList.add('d-none');
    }
}

// Enhanced star rating visualization
function updateStarRating(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
            // Color gradient based on rating
            if (rating <= 2) {
                star.style.color = '#AD4245'; // Red for low ratings
            } else if (rating == 3) {
                star.style.color = '#f0ad4e'; // Yellow/orange for medium
            } else {
                star.style.color = '#28a745'; // Green for high ratings
            }
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
            star.style.color = '#ccc';
        }
    });
}

// Helper function for star hover effects
function highlightStars(count) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < count) {
            star.classList.remove('far');
            star.classList.add('fas');
            // Color based on position
            if (count <= 2) {
                star.style.color = '#AD4245';
            } else if (count == 3) {
                star.style.color = '#f0ad4e';
            } else {
                star.style.color = '#28a745';
            }
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
            star.style.color = '#ccc';
        }
    });
}

// Toggle between edit mode and display mode
function toggleEditMode(isEdit) {
    const editControls = document.getElementById('edit-mode-controls');
    const normalControls = document.querySelectorAll('.rating-step');
    const submitBtn = document.getElementById('submit-rating');
    
    if (isEdit) {
        editControls.classList.remove('d-none');
        submitBtn.classList.add('d-none');
    } else {
        editControls.classList.add('d-none');
        submitBtn.classList.remove('d-none');
    }
}

// Open the enhanced rating modal
function openRateModal(index) {
    // Reset modal state
    resetModalState();
    
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
    document.getElementById("modalCandidateName").textContent = candidate.name;
    
    const interestsContainer = document.getElementById("modalCandidateInterests");
    if (candidate.interests && candidate.interests.length > 0) {
        interestsContainer.innerHTML = candidate.interests
            .map(interest => `<span class="tag-pill">${interest}</span>`)
            .join("");
    } else {
        interestsContainer.innerHTML = "<span class='text-muted fst-italic'>No interests specified</span>";
    }

    // Always start at step 1
    showRatingStep(1);
    updateProgressBar(33);
    
    // Check for previous rating
    checkPreviousRating(candidate.id);
    
    // Show the modal
    const rateModal = document.getElementById('rateModal');
    const modalInstance = new bootstrap.Modal(rateModal);
    modalInstance.show();
}

// Reset the modal state
function resetModalState() {
    // Reset all form fields
    document.getElementById("rating").value = "";
    document.getElementById("new-comment").value = "";
    document.getElementById("characterCount").textContent = "0/500";
    document.getElementById("characterCount").className = "text-muted";
    
    // Reset star rating
    updateStarRating(0);
    
    // Hide all conditional sections
    document.getElementById("interest-prompt-section").classList.add("d-none");
    document.getElementById("previousRatingBadge").classList.add("d-none");
    document.getElementById("previousCommentsLabel").classList.add("d-none");
    
    // Reset radio buttons
    document.querySelectorAll("input[name='interest_prompt']").forEach(radio => {
        radio.checked = false;
    });
    
    // Reset rating feedback
    document.getElementById("ratingFeedback").textContent = "";
    document.getElementById("ratingFeedback").className = "mt-2 fw-medium";
    
    // Reset comments section
    document.getElementById("comments-section").innerHTML = "";
    document.getElementById("commentCount").textContent = "0";
    
    // Disable the continue button until rating is selected
    document.getElementById("next-to-comments").disabled = true;
    
    // Hide edit mode controls
    toggleEditMode(false);
    
    // Hide success state if visible
    document.getElementById("rating-success").classList.add("d-none");
    document.getElementById("ratingStepsContainer").classList.remove("d-none");
}

// Check for previous ratings (enhanced)
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
                document.getElementById("previousRatingBadge").classList.remove("d-none");
                
                // Pre-fill the rating input with previous value
                document.getElementById("rating").value = data.rating;
                
                // Update star rating
                updateStarRating(parseInt(data.rating));
                
                // Update rating feedback
                const feedbackMessages = [
                    "Poor fit for the position",
                    "Below average candidate", 
                    "Acceptable candidate",
                    "Strong candidate",
                    "Exceptional candidate"
                ];
                
                const ratingFeedback = document.getElementById('ratingFeedback');
                const rating = parseInt(data.rating);
                
                ratingFeedback.textContent = feedbackMessages[rating - 1];
                ratingFeedback.className = 'mt-2 fw-medium';
                
                if (rating <= 2) {
                    ratingFeedback.classList.add('text-danger');
                } else if (rating == 3) {
                    ratingFeedback.classList.add('text-warning');
                } else {
                    ratingFeedback.classList.add('text-success');
                }
                
                // Enable continue button
                document.getElementById("next-to-comments").disabled = false;
                
                // Handle interest prompt visibility based on rating
                handleRatingChange(rating);
                
                // If they had an interest prompt answer before, pre-select it
                if (data.interest_prompt && rating < 4) {
                    const radioButton = document.querySelector(`input[name='interest_prompt'][value='${data.interest_prompt}']`);
                    if (radioButton) {
                        radioButton.checked = true;
                    }
                }
                
                // If they also had comments before
                if (data.has_comments) {
                    document.getElementById("previousCommentsLabel").classList.remove("d-none");
                    
                    // Pre-fill comment field if editing
                    if (data.user_comment) {
                        document.getElementById("new-comment").value = data.user_comment;
                        // Update character count
                        const characterCount = document.getElementById('characterCount');
                        characterCount.textContent = `${data.user_comment.length}/500`;
                    }
                }
                
                // Fetch all comments for this application
                fetchEnhancedComments(applicationId);
            } else {
                // No previous rating
                document.getElementById("comments-section").innerHTML = '<p class="text-muted fst-italic">No comments yet</p>';
                document.getElementById("commentCount").textContent = "0";
            }
        })
        .catch(error => {
            console.error("Error checking previous rating:", error);
            showToast("Error checking previous rating", "error");
        });
}

// Enhanced comment fetching and display
function fetchEnhancedComments(applicationId) {
    if (!applicationId) {
        console.error('Application ID is required');
        return;
    }
    
    let facultyName = document.getElementById("loggedInUser").value;
    
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
                    commentsSection.innerHTML = "<p class='text-muted fst-italic'>No comments yet.</p>";
                    document.getElementById("commentCount").textContent = "0";
                    return;
                }

                // Update comment count
                document.getElementById("commentCount").textContent = data.comments.length;
                
                // Create a document fragment for better performance when adding multiple elements
                const fragment = document.createDocumentFragment();
                
                data.comments.forEach(comment => {
                    const commentDiv = document.createElement("div");
                    
                    const isCurrentUser = comment.faculty_name === facultyName;
                    const borderColor = isCurrentUser ? "#AD4245" : "#236465";
                    const badgeClass = isCurrentUser ? "bg-danger" : "bg-secondary";
                    
                    commentDiv.innerHTML = `
                        <div class="comment-card mb-3 p-3 bg-light rounded-3 border-start border-3" style="border-color: ${borderColor} !important;">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="d-flex align-items-center">
                                    <span class="badge ${badgeClass} me-2">${comment.faculty_name[0]}</span>
                                    <strong class="fw-medium">${comment.faculty_name}</strong>
                                    ${isCurrentUser ? '<span class="badge bg-light text-danger ms-2">You</span>' : ''}
                                </div>
                                <small class="text-muted">${comment.timestamp || 'Just now'}</small>
                            </div>
                            <p class="mt-2 mb-0">${comment.comment}</p>
                            ${isCurrentUser ? `
                            <div class="comment-actions mt-2 text-end">
                                <button class="btn btn-sm btn-outline-secondary" onclick="editExistingComment('${comment.id}', '${comment.comment}')">
                                    <i class="fas fa-edit me-1"></i> Edit
                                </button>
                            </div>
                            ` : ''}
                        </div>
                    `;
                    
                    fragment.appendChild(commentDiv);
                });
                
                commentsSection.appendChild(fragment);
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

// Edit an existing comment
function editExistingComment(commentId, commentText) {
    // Pre-fill the comment field
    document.getElementById("new-comment").value = commentText;
    
    // Update character count
    const characterCount = document.getElementById('characterCount');
    characterCount.textContent = `${commentText.length}/500`;
    
    // Switch to edit mode
    toggleEditMode(true);
    
    // Store the comment ID for the update operation
    document.getElementById("new-comment").setAttribute('data-comment-id', commentId);
    
    // Make sure we're on the comments step
    showRatingStep(3);
    updateProgressBar(100);
}

// Submit rating with enhanced UX
function submitRatingEnhanced(isUpdate = false) {
    const rating = document.getElementById("rating").value;
    const comment = document.getElementById("new-comment").value;
    const interestPrompt = document.querySelector("input[name='interest_prompt']:checked")?.value || "";
    const commentId = document.getElementById("new-comment").getAttribute('data-comment-id');
    
    // Validation with enhanced UX
    if (!rating) {
        showToast("Please provide a rating", "error");
        // Jump to the rating step
        showRatingStep(2);
        updateProgressBar(66);
        return;
    }
    
    // Validation for low ratings
    if (parseInt(rating) < 4) {
        // For low ratings, require interest prompt
        if (!interestPrompt) {
            showToast("Please indicate if the candidate has desirable qualities", "error");
            // Highlight the interest prompt section
            const promptSection = document.getElementById("interest-prompt-section");
            promptSection.classList.add("border");
            promptSection.classList.add("border-danger");
            
            // Remove the highlight after 2 seconds
            setTimeout(() => {
                promptSection.classList.remove("border");
                promptSection.classList.remove("border-danger");
            }, 2000);
            return;
        }
        
        // If interest prompt is "yes", encourage a comment
        if (interestPrompt === "yes" && !comment) {
            // We'll show a suggestion but not block submission
            showToast("Consider adding a comment to explain your assessment", "warning");
        }
    }
    
    const candidate = candidates[selectedIndex];
    
    if (!candidate || !candidate.id) {
        showToast("Error: Invalid candidate data", "error");
        return;
    }
    
    // Show loading state
    const submitBtn = isUpdate ? document.getElementById('update-rating') : document.getElementById('submit-rating');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Submitting...';
    submitBtn.disabled = true;
    
    // Determine if this is an update to an existing comment
    const endpoint = isUpdate && commentId ? "/comment" : "/rate_candidate";
    const method = isUpdate && commentId ? "PUT" : "POST";
    
    // Prepare the request body
    const requestBody = {
        application_id: candidate.id,
        rating: rating,
        interest_prompt: interestPrompt,
        comment: comment
    };
    
    // Add comment_id for updates
    if (isUpdate && commentId) {
        requestBody.comment_id = commentId;
    }
    
    fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Show success state
            document.getElementById("ratingStepsContainer").classList.add("d-none");
            document.getElementById("rating-success").classList.remove("d-none");
            
            // Show success toast
            showToast("Rating submitted successfully!", "success");
            
            // Close modal after a delay
            setTimeout(() => {
                closeRateModal();
                
                // Refresh the candidate display to show updated rating
                displayCandidate(currentIndex, "right");
            }, 2000);
        } else {
            // Show error toast
            showToast("Error: " + data.message, "error");
            
            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error("Error submitting rating:", error);
        showToast("Error submitting rating", "error");
        
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

// Close the rating modal
function closeRateModal() {
    const rateModal = document.getElementById('rateModal');
    const modalInstance = bootstrap.Modal.getInstance(rateModal);
    if (modalInstance) {
        modalInstance.hide();
    }
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

function initStarRating() {
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('rating');
    const ratingFeedback = document.getElementById('ratingFeedback');
    
    const ratingLabels = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent'
    };

    stars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const rating = this.dataset.rating;
            updateStars(rating);
        });

        star.addEventListener('click', function() {
            const rating = this.dataset.rating;
            ratingInput.value = rating;
            updateStars(rating);
            ratingFeedback.textContent = ratingLabels[rating];
        });
    });

    document.querySelector('.star-rating').addEventListener('mouseleave', function() {
        const currentRating = ratingInput.value;
        updateStars(currentRating);
    });

    function updateStars(rating) {
        stars.forEach(star => {
            const starRating = star.dataset.rating;
            if (starRating <= rating) {
                star.classList.remove('far');
                star.classList.add('fas');
                star.classList.add('text-warning');
            } else {
                star.classList.remove('fas');
                star.classList.add('far');
                star.classList.remove('text-warning');
            }
        });
    }
}