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
    
    // Add AI summary styles
    addAISummaryStyles();
    
    // Load candidates on page load
    fetchCandidates();
    
    // Initialize swipe functionality
    initSwipeListeners();
    addSwipeStyles();
    
    // Add responsive adjustments
    adjustForMobile();
});

// Add better styles for distinguishing fallback summaries
function addAISummaryStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .ai-summary-box {
            background-color: #f8f9fa;
            border-left: 4px solid #236465;
            border-radius: 0.5rem;
            padding: 1.25rem;
            margin-bottom: 1.5rem;
            position: relative;
            transition: all 0.3s ease;
        }
        
        .ai-summary-box:hover {
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            transform: translateY(-2px);
        }
        
        .ai-summary-header {
            display: flex;
            align-items: center;
            margin-bottom: 0.75rem;
        }
        
        .ai-summary-header i {
            color: #236465;
            margin-right: 0.5rem;
            font-size: 1.1rem;
        }
        
        .ai-summary-header h6 {
            color: #236465;
            margin-bottom: 0;
            font-weight: 600;
        }
        
        .ai-summary-content {
            color: #343a40;
            font-size: 0.95rem;
            line-height: 1.5;
        }
        
        .summary-source-indicator {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
        }
        
        .summary-source-badge {
            padding: 0.25rem 0.6rem;
            border-radius: 20px;
            font-weight: 500;
            display: flex;
            align-items: center;
        }
        
        .summary-source-badge.content-based {
            background-color: #e3f2fd;
            color: #0d6efd;
            border: 1px solid #b6d4fe;
        }
        
        .summary-source-badge.fallback {
            background-color: #fff3cd;
            color: #664d03;
            border: 1px solid #ffecb5;
        }
        
        .summary-source-badge i {
            margin-right: 5px;
            font-size: 0.875rem;
        }
        
        .source-info-tooltip {
            display: inline-block;
            margin-left: 5px;
            cursor: help;
            color: #6c757d;
        }
        
        .pdf-check-btn {
            margin-left: 5px;
            padding: 0.125rem 0.5rem;
            font-size: 0.75rem;
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 3px;
            color: #6c757d;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .pdf-check-btn:hover {
            background-color: #e9ecef;
            color: #343a40;
        }
        
        .fallback-notice {
            margin-top: 10px;
            padding: 8px 12px;
            background-color: #fff3cd;
            border-left: 3px solid #ffc107;
            border-radius: 4px;
            font-size: 0.85rem;
            color: #664d03;
        }
        
        @media (max-width: 768px) {
            .ai-summary-box {
                padding: 1rem;
            }
            
            .ai-summary-content {
                font-size: 0.9rem;
            }
            
            .summary-source-indicator {
                position: static;
                margin-bottom: 10px;
                justify-content: flex-end;
            }
        }
    `;
    document.head.appendChild(styleElement);
}

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

// Modified fetchCandidates function to check for AI summaries
async function fetchCandidates() {
    try {
        let response = await fetch("/api/candidates");
        let data = await response.json();
        candidates = data;

        // Make sure every candidate has a valid summary
        candidates.forEach(candidate => {
            if (!candidate.summary || candidate.summary.trim() === "") {
                // If no summary is provided, create a placeholder message
                candidate.summary = "Processing candidate profile. Summary will be available soon.";
            }
        });

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

// Update the displayCandidate function to clearly show summary source
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
    newCard.classList.add(direction === "left" ? "card-enter-from-left" : "card-enter-from-right");

    // Source indicator for the summary
    const summarySourceBadge = candidate.is_fallback ? 
        `<div class="summary-source-badge fallback">
            <i class="fas fa-robot"></i> Template-based Summary
         </div>` : 
        `<div class="summary-source-badge content-based">
            <i class="fas fa-file-alt"></i> Document-based Summary
         </div>`;
        
    // Additional info button for summary source
    const infoButton = `
        <span class="source-info-tooltip" title="Check the source of this summary">
            <i class="fas fa-info-circle"></i>
        </span>
        <button class="pdf-check-btn" onclick="checkPDFExtraction(${candidate.id})">
            <i class="fas fa-search"></i> Check PDF
        </button>
    `;

    // Prepare card content with enhanced AI summary section
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
                    <button class="nav-link" id="rate-tab" data-bs-toggle="tab" data-bs-target="#rate-pane" type="button" role="tab">
                        <i class="fas fa-star me-1"></i> Rate
                    </button>
                </li>
            </ul>

            <div class="tab-content">
                <!-- Summary Tab -->
                <div class="tab-pane fade show active" id="info-pane" role="tabpanel" tabindex="0">
                    <!-- AI Summary Section with Source Indicator -->
                    <div class="ai-summary-box">
                        <div class="summary-source-indicator">
                            ${summarySourceBadge}
                            ${infoButton}
                        </div>
                        <div class="ai-summary-header">
                            <i class="fas fa-robot"></i>
                            <h6>AI Profile Analysis</h6>
                        </div>
                        <div class="ai-summary-content">
                            ${candidate.summary}
                            ${candidate.is_fallback ? 
                                `<div class="fallback-notice">
                                    <i class="fas fa-exclamation-triangle me-1"></i> This summary was generated using a template because the system couldn't extract sufficient content from the PDF files. This could be due to document formatting, protection settings, or file issues.
                                </div>` : ''}
                        </div>
                    </div>
                    
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
                    
                    <h6 class="fw-bold mt-4">Documents</h6>
                    <div class="document-links">
                        ${candidate.details}
                    </div>
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

        // Initialize tooltip
        const tooltips = newCard.querySelectorAll('.source-info-tooltip');
        tooltips.forEach(tooltip => {
            new bootstrap.Tooltip(tooltip);
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

// Add this function to check PDF extraction details
async function checkPDFExtraction(applicationId) {
    try {
        const response = await fetch(`/check_pdf_extraction?application_id=${applicationId}`);
        const data = await response.json();
        
        if (response.ok) {
            // Create a modal to display the PDF extraction details
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'pdfExtractionModal';
            modal.tabIndex = '-1';
            modal.setAttribute('aria-hidden', 'true');
            
            let statusColor = data.extraction.would_use_fallback ? 'danger' : 'success';
            let statusIcon = data.extraction.would_use_fallback ? 'exclamation-triangle' : 'check-circle';
            let statusText = data.extraction.would_use_fallback ? 'Using Fallback Summary' : 'Using Document-Based Summary';
            
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header py-2">
                            <h5 class="modal-title">PDF Extraction Status</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3 text-center">
                                <div class="d-inline-block p-3 rounded-circle bg-${statusColor} bg-opacity-10 mb-2">
                                    <i class="fas fa-${statusIcon} text-${statusColor} fs-4"></i>
                                </div>
                                <h5 class="text-${statusColor}">${statusText}</h5>
                                <p class="text-muted mb-0">For candidate: ${data.applicant.name}</p>
                            </div>
                            
                            <div class="row g-3 mb-3">
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-header py-2 px-3 bg-light">CV Status</div>
                                        <div class="card-body p-3">
                                            <p class="mb-1">
                                                <i class="fas fa-${data.files.cv.exists ? 'check text-success' : 'times text-danger'}"></i>
                                                File exists: ${data.files.cv.exists ? 'Yes' : 'No'}
                                            </p>
                                            <p class="mb-1">Text extracted: ${data.files.cv.text_length} characters</p>
                                            ${data.files.cv.error ? `<p class="mb-0 text-danger"><i class="fas fa-exclamation-circle"></i> Error: ${data.files.cv.error}</p>` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-header py-2 px-3 bg-light">Cover Letter Status</div>
                                        <div class="card-body p-3">
                                            <p class="mb-1">
                                                <i class="fas fa-${data.files.cover_letter.exists ? 'check text-success' : 'times text-danger'}"></i>
                                                File exists: ${data.files.cover_letter.exists ? 'Yes' : 'No'}
                                            </p>
                                            <p class="mb-1">Text extracted: ${data.files.cover_letter.text_length} characters</p>
                                            ${data.files.cover_letter.error ? `<p class="mb-0 text-danger"><i class="fas fa-exclamation-circle"></i> Error: ${data.files.cover_letter.error}</p>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card mb-3">
                                <div class="card-header py-2 px-3 bg-light">Extraction Results</div>
                                <div class="card-body p-3">
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="d-flex align-items-center mb-2">
                                                <div class="rounded-circle bg-primary bg-opacity-10 p-2 me-2">
                                                    <i class="fas fa-key text-primary"></i>
                                                </div>
                                                <div>
                                                    <h6 class="mb-0">Key Phrases</h6>
                                                    <p class="mb-0">${data.extraction.key_phrases_count} found</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="d-flex align-items-center mb-2">
                                                <div class="rounded-circle bg-success bg-opacity-10 p-2 me-2">
                                                    <i class="fas fa-tools text-success"></i>
                                                </div>
                                                <div>
                                                    <h6 class="mb-0">Skills</h6>
                                                    <p class="mb-0">${data.extraction.skills_count} found</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="d-flex align-items-center mb-2">
                                                <div class="rounded-circle bg-info bg-opacity-10 p-2 me-2">
                                                    <i class="fas fa-graduation-cap text-info"></i>
                                                </div>
                                                <div>
                                                    <h6 class="mb-0">Education</h6>
                                                    <p class="mb-0">${data.extraction.education_count} entries</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="alert ${data.extraction.would_use_fallback ? 'alert-warning' : 'alert-info'} mb-0">
                                <i class="fas fa-info-circle me-2"></i>
                                ${data.extraction.would_use_fallback ? 
                                    'The system is using a template-based fallback summary because it could not extract sufficient meaningful content from the documents. This may be due to PDF formatting, security settings, or scanned image-based PDFs.' : 
                                    'The system was able to extract meaningful content from the documents and is using this to generate a personalized summary.'}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add the modal to the document body
            document.body.appendChild(modal);
            
            // Initialize and show the modal
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            // Remove the modal from the DOM when it's hidden
            modal.addEventListener('hidden.bs.modal', function () {
                document.body.removeChild(modal);
            });
        } else {
            showToast(data.error || 'Failed to check PDF extraction', 'error');
        }
    } catch (error) {
        console.error('Error checking PDF extraction:', error);
        showToast('Failed to check PDF extraction', 'error');
    }
}