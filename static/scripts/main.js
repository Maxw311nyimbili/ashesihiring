
let candidates = [];
let currentIndex = 0;
let selectedIndex = null;
const candidateCard = document.getElementById("candidateCard");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const navDots = document.getElementById("nav-dots");

// Bootstrap modal objects
let rateModalObj;
//
//// Rating modal elements
//const rateModal = document.getElementById("rateModal");
//const modalCandidateName_rating = document.getElementById("modalCandidateName-1");
//const modalCandidateInterests_rating = document.getElementById("modalCandidateInterests-1");
//
//// Initialize Bootstrap modals
//document.addEventListener('DOMContentLoaded', function() {
//    rateModalObj = new bootstrap.Modal(rateModal);
//
//    // Load candidates on page load
//    fetchCandidates();
//});
//
//// Fetch candidates from backend API
//async function fetchCandidates() {
//    try {
//        let response = await fetch("/api/candidates");
//        let data = await response.json();
//        candidates = data;
//
//        if (candidates.length > 0) {
//            // Create navigation dots
//            createNavDots(candidates.length);
//            displayCandidate(currentIndex, "right"); // Initial display
//            updateNavDots();
//        }
//    } catch (error) {
//        console.error("Error fetching candidates:", error);
//        candidateCard.innerHTML = "<div class='d-flex justify-content-center align-items-center h-100'><p class='text-danger'><i class='fas fa-exclamation-triangle me-2'></i>Error loading candidates. Please try again later.</p></div>";
//    }
//}
//
//// Create navigation dots based on candidate count
//function createNavDots(count) {
//    navDots.innerHTML = '';
//    for (let i = 0; i < count; i++) {
//        const dot = document.createElement('div');
//        dot.className = 'nav-dot';
//        dot.setAttribute('data-index', i);
//        dot.addEventListener('click', (e) => {
//            const index = parseInt(e.target.getAttribute('data-index'));
//            const direction = index > currentIndex ? "right" : "left";
//            currentIndex = index;
//            displayCandidate(currentIndex, direction);
//            updateNavDots();
//        });
//        navDots.appendChild(dot);
//    }
//}
//
//// Update active state of navigation dots
//function updateNavDots() {
//    document.querySelectorAll('.nav-dot').forEach((dot, index) => {
//        if (index === currentIndex) {
//            dot.classList.add('active');
//        } else {
//            dot.classList.remove('active');
//        }
//    });
//}
//
//// Function to display a candidate with animation
//function displayCandidate(index, direction) {
//    if (candidates.length === 0) return;
//
//    let candidate = candidates[index];
//
//    // Add appropriate animation class
//    candidateCard.className = 'candidate-card';
//    void candidateCard.offsetWidth; // Force reflow
//
//    candidateCard.classList.add(direction === "left" ? "card-enter-active" : "card-leave-active");
//
//    // Update the card content
//    candidateCard.innerHTML = `
//        <div class="card-header d-flex justify-content-between align-items-center">
//            <h4 class="mb-0 fw-bold">${candidate.name}</h4>
//            <span class="badge bg-light text-dark rounded-pill">${index + 1}/${candidates.length}</span>
//        </div>
//        <div class="card-body">
//            <ul class="nav nav-tabs mb-3" id="candidateTabs" role="tablist">
//                <li class="nav-item" role="presentation">
//                    <button class="nav-link active" id="info-tab" data-bs-toggle="tab" data-bs-target="#info-pane" type="button" role="tab">
//                        <i class="fas fa-user-circle me-1"></i> Summary
//                    </button>
//                </li>
//                <li class="nav-item" role="presentation">
//                    <button class="nav-link" id="details-tab" data-bs-toggle="tab" data-bs-target="#details-pane" type="button" role="tab">
//                        <i class="fas fa-clipboard-list me-1"></i> Details
//                    </button>
//                </li>
//                <li class="nav-item" role="presentation">
//                    <button class="nav-link" id="rate-tab" data-bs-toggle="tab" data-bs-target="#rate-pane" type="button" role="tab">
//                        <i class="fas fa-star me-1"></i> Rate
//                    </button>
//                </li>
//            </ul>
//
//            <div class="tab-content">
//                <!-- Summary Tab -->
//                <div class="tab-pane fade show active" id="info-pane" role="tabpanel" tabindex="0">
//                    <div class="candidate-info-box">
//                        <div class="mb-3">
//                            <h6 class="text-danger mb-1">Interested to be an FI for:</h6>
//                            <div class="interests-container">
//                                ${candidate.interests && candidate.interests.length > 0 ?
//                                  candidate.interests.map(interest => `<span class="tag-pill">${interest}</span>`).join('') :
//                                  "<span class='text-muted fst-italic'>No interests specified</span>"}
//                            </div>
//                        </div>
//                    </div>
//
//                    <h6 class="fw-bold">Summary</h6>
//                    <p>${candidate.summary}</p>
//                </div>
//
//                <!-- Details Tab -->
//                <div class="tab-pane fade" id="details-pane" role="tabpanel" tabindex="0">
//                    <h6 class="fw-bold mb-3">Detailed Information</h6>
//                    <div>${candidate.details}</div>
//                </div>
//
//                <!-- Rate Tab -->
//                <div class="tab-pane fade" id="rate-pane" role="tabpanel" tabindex="0">
//                    <div class="rating-card p-3 mb-3" id="ratingStatusCard">
//                        <h6 class="fw-bold text-secondary mb-3">Candidate Rating</h6>
//                        <div class="d-flex align-items-center justify-content-between">
//                            <div id="ratingStatus">
//                                <span class="text-muted">You haven't rated this candidate yet</span>
//                            </div>
//                            <button class="btn btn-primary" onclick="openRateModal(${index})">
//                                <i class="fas fa-star me-1"></i> Rate Now
//                            </button>
//                        </div>
//                    </div>
//
//                    <div class="mt-4" id="candidateCommentsSection">
//                        <h6 class="fw-bold text-secondary mb-3">Faculty Comments</h6>
//                        <div id="commentsList" class="comment-list">
//                            <!-- Will be populated via JavaScript -->
//                            <p class="text-muted fst-italic">No comments yet</p>
//                        </div>
//                    </div>
//                </div>
//            </div>
//        </div>
//    `;
//
//    // Load any existing ratings and comments for this candidate
//    loadExistingRatingAndComments(candidate.id);
//}
//
//// Load existing rating and comments for the current candidate
//function loadExistingRatingAndComments(applicationId) {
//    fetch(`/get_comments?application_id=${applicationId}`)
//        .then(response => response.json())
//        .then(data => {
//            const ratingStatus = document.getElementById('ratingStatus');
//            const commentsList = document.getElementById('commentsList');
//
//            // Update rating status
//            if (data.rating) {
//                ratingStatus.innerHTML = `
//                    <div>
//                        <span class="fw-medium">Your rating:</span>
//                        <span class="badge bg-warning text-dark fs-6">${data.rating}/5</span>
//                    </div>
//                    <small class="text-muted">Click "Rate Now" to update</small>
//                `;
//            }
//
//            // Update comments list
//            if (data.comments && data.comments.length > 0) {
//                commentsList.innerHTML = '';
//                data.comments.forEach(comment => {
//                    commentsList.innerHTML += `
//                        <div class="comment-card">
//                            <div class="d-flex justify-content-between">
//                                <p class="fw-medium mb-1">${comment.faculty_name || 'Faculty'}</p>
//                                <small class="text-muted">${comment.timestamp || 'Recent'}</small>
//                            </div>
//                            <p class="mb-0">${comment.comment}</p>
//                        </div>
//                    `;
//                });
//            } else {
//                commentsList.innerHTML = '<p class="text-muted fst-italic">No comments yet</p>';
//            }
//        })
//        .catch(error => {
//            console.error("Error loading ratings and comments:", error);
//        });
//}
//
//// Navigation buttons
//prevBtn.addEventListener("click", () => {
//    if (currentIndex > 0) {
//        currentIndex--;
//        displayCandidate(currentIndex, "left");
//        updateNavDots();
//    }
//});
//
//nextBtn.addEventListener("click", () => {
//    if (currentIndex < candidates.length - 1) {
//        currentIndex++;
//        displayCandidate(currentIndex, "right");
//        updateNavDots();
//    }
//});
//
//// Open the rating modal
//function openRateModal(index) {
//    selectedIndex = index;
//    let candidate = candidates[index];
//    modalCandidateName_rating.textContent = candidate.name;
//
//    if (candidate.interests && candidate.interests.length > 0) {
//        modalCandidateInterests_rating.innerHTML = candidate.interests
//            .map(interest => `<li class="mb-1">${interest}</li>`)
//            .join("");
//    } else {
//        modalCandidateInterests_rating.innerHTML = "<li>No interests specified.</li>";
//    }
//
//    // Reset modal elements
//    document.getElementById("rating").value = "";
//    document.getElementById("first_display").style.display = "block";
//    document.querySelector(".interest-prompt").style.display = "none";
//    document.getElementById("comment").style.display = "none";
//    document.getElementById("comments-section").innerHTML = ""; // Clear previous comments
//
//    // Reset previous rating indicators
//    document.getElementById("previousRatingBadge").classList.add("d-none");
//    document.getElementById("previousRatingLabel").classList.add("d-none");
//    document.getElementById("previousCommentsLabel").classList.add("d-none");
//
//    // Fetch previous ratings and comments
//    checkPreviousRating(candidate.id);
//
//    // Fetch and display existing comments
//    fetchComments(candidate.id);
//
//    rateModalObj.show();
//}
//
//// Close rating modal
//function closeRateModal() {
//    rateModalObj.hide();
//
//    // Refresh the current candidate display to show updated ratings/comments
//    displayCandidate(currentIndex, "right");
//}
//
//// Check for previous ratings
//function checkPreviousRating(applicationId) {
//    fetch(`/get_comments?application_id=${applicationId}`)
//        .then(response => response.json())
//        .then(data => {
//            if (data.rating) {
//                // Show the previous rating badge
//                const ratingBadge = document.getElementById("previousRatingBadge");
//                const ratingLabel = document.getElementById("previousRatingLabel");
//                const ratingValue = document.getElementById("previousRatingValue");
//
//                ratingBadge.classList.remove("d-none");
//                ratingLabel.classList.remove("d-none");
//                ratingValue.textContent = data.rating;
//
//                // Pre-fill the rating input with previous value
//                document.getElementById("rating").value = data.rating;
//
//                // If they also had comments before
//                if (data.has_comments) {
//                    document.getElementById("previousCommentsLabel").classList.remove("d-none");
//                }
//            }
//        })
//        .catch(error => {
//            console.error("Error checking previous rating:", error);
//        });
//}
//
//// Handle rating input
//document.getElementById("rating").addEventListener("input", function () {
//    let rating = parseInt(this.value, 10);
//
//    if (rating < 4) {
//        document.getElementById("first_display").style.display = "none";
//        document.querySelector(".interest-prompt").style.display = "block";
//        document.getElementById("comment").style.display = "none";
//    } else {
//        document.getElementById("first_display").style.display = "block";
//        document.querySelector(".interest-prompt").style.display = "none";
//        document.getElementById("comment").style.display = "block";
//    }
//});
//
//<!-- Experimentation -->
//// Add this code to your existing JavaScript, preferably right after your existing event listeners
//
//// Touch swipe functionality for mobile users
//let touchStartX = 0;
//let touchEndX = 0;
//const swipeThreshold = 50; // Minimum distance required for a swipe to register
//
//// Add touch event listeners to candidate card container
//const cardContainer = document.querySelector('.card-container');
//
//// Detect touch start position
//cardContainer.addEventListener('touchstart', (e) => {
//touchStartX = e.changedTouches[0].screenX;
//}, { passive: true });
//
//// Detect touch end position and determine if it was a swipe
//cardContainer.addEventListener('touchend', (e) => {
//touchEndX = e.changedTouches[0].screenX;
//handleSwipe();
//}, { passive: true });
//
//// Handle the swipe action
//function handleSwipe() {
//const swipeDistance = touchEndX - touchStartX;
//
//// Check if the swipe was significant enough (beyond threshold)
//if (Math.abs(swipeDistance) < swipeThreshold) return;
//
//if (swipeDistance > 0) {
//// Swiped right - go to previous candidate
//if (currentIndex > 0) {
//    currentIndex--;
//    displayCandidate(currentIndex, "left");
//    updateNavDots();
//} else {
//    // Visual feedback for first item (optional bounce effect)
//    animateBounce("left");
//}
//} else {
//// Swiped left - go to next candidate
//if (currentIndex < candidates.length - 1) {
//    currentIndex++;
//    displayCandidate(currentIndex, "right");
//    updateNavDots();
//} else {
//    // Visual feedback for last item (optional bounce effect)
//    animateBounce("right");
//}
//}
//}
//
//// Optional: Add bounce animation to indicate end of list
//function animateBounce(direction) {
//candidateCard.style.transition = 'transform 0.2s ease-in-out';
//
//if (direction === "left") {
//candidateCard.style.transform = 'translateX(20px)';
//} else {
//candidateCard.style.transform = 'translateX(-20px)';
//}
//
//setTimeout(() => {
//candidateCard.style.transform = 'translateX(0)';
//setTimeout(() => {
//    candidateCard.style.transition = '';
//}, 200);
//}, 200);
//}
//
//// Update the displayCandidate function to better handle animations
//function displayCandidate(index, direction) {
//if (candidates.length === 0) return;
//
//let candidate = candidates[index];
//
//// Store old content temporarily
//const oldContent = candidateCard.innerHTML;
//
//// Create the new content but don't insert it yet
//const newContent = `
//<div class="card-header d-flex justify-content-between align-items-center">
//    <h4 class="mb-0 fw-bold">${candidate.name}</h4>
//    <span class="badge bg-light text-dark rounded-pill">${index + 1}/${candidates.length}</span>
//</div>
//<div class="card-body">
//    <ul class="nav nav-tabs mb-3" id="candidateTabs" role="tablist">
//        <li class="nav-item" role="presentation">
//            <button class="nav-link active" id="info-tab" data-bs-toggle="tab" data-bs-target="#info-pane" type="button" role="tab">
//                <i class="fas fa-user-circle me-1"></i> Summary
//            </button>
//        </li>
//        <li class="nav-item" role="presentation">
//            <button class="nav-link" id="details-tab" data-bs-toggle="tab" data-bs-target="#details-pane" type="button" role="tab">
//                <i class="fas fa-clipboard-list me-1"></i> Details
//            </button>
//        </li>
//        <li class="nav-item" role="presentation">
//            <button class="nav-link" id="rate-tab" data-bs-toggle="tab" data-bs-target="#rate-pane" type="button" role="tab">
//                <i class="fas fa-star me-1"></i> Rate
//            </button>
//        </li>
//    </ul>
//
//    <div class="tab-content">
//        <!-- Summary Tab -->
//        <div class="tab-pane fade show active" id="info-pane" role="tabpanel" tabindex="0">
//            <div class="candidate-info-box">
//                <div class="mb-3">
//                    <h6 class="text-danger mb-1">Interested to be an FI for:</h6>
//                    <div class="interests-container">
//                        ${candidate.interests && candidate.interests.length > 0 ?
//                          candidate.interests.map(interest => `<span class="tag-pill">${interest}</span>`).join('') :
//                          "<span class='text-muted fst-italic'>No interests specified</span>"}
//                    </div>
//                </div>
//            </div>
//
//            <h6 class="fw-bold">Summary</h6>
//            <p>${candidate.summary}</p>
//        </div>
//
//        <!-- Details Tab -->
//        <div class="tab-pane fade" id="details-pane" role="tabpanel" tabindex="0">
//            <h6 class="fw-bold mb-3">Detailed Information</h6>
//            <div>${candidate.details}</div>
//        </div>
//
//        <!-- Rate Tab -->
//        <div class="tab-pane fade" id="rate-pane" role="tabpanel" tabindex="0">
//            <div class="rating-card p-3 mb-3" id="ratingStatusCard">
//                <h6 class="fw-bold text-secondary mb-3">Candidate Rating</h6>
//                <div class="d-flex align-items-center justify-content-between">
//                    <div id="ratingStatus">
//                        <span class="text-muted">You haven't rated this candidate yet</span>
//                    </div>
//                    <button class="btn btn-primary" onclick="openRateModal(${index})">
//                        <i class="fas fa-star me-1"></i> Rate Now
//                    </button>
//                </div>
//            </div>
//
//            <div class="mt-4" id="candidateCommentsSection">
//                <h6 class="fw-bold text-secondary mb-3">Faculty Comments</h6>
//                <div id="commentsList" class="comment-list">
//                    <!-- Will be populated via JavaScript -->
//                    <p class="text-muted fst-italic">No comments yet</p>
//                </div>
//            </div>
//        </div>
//    </div>
//</div>
//`;
//
//// Add animation class
//candidateCard.classList.add(`sliding-${direction}`);
//
//// After a short delay, replace content and remove animation class
//setTimeout(() => {
//candidateCard.innerHTML = newContent;
//candidateCard.classList.remove(`sliding-${direction}`);
//
//// Load existing ratings and comments
//loadExistingRatingAndComments(candidate.id);
//
//// Ensure Bootstrap tabs work on the new content
//const tabElements = candidateCard.querySelectorAll('[data-bs-toggle="tab"]');
//tabElements.forEach(tabEl => {
//    new bootstrap.Tab(tabEl);
//});
//}, 300);
//}
//
//// Add these CSS rules to your existing styles
//document.head.insertAdjacentHTML('beforeend', `
//<style>
//@keyframes slideFromLeft {
//    from { transform: translateX(-100%); opacity: 0; }
//    to { transform: translateX(0); opacity: 1; }
//}
//
//@keyframes slideFromRight {
//    from { transform: translateX(100%); opacity: 0; }
//    to { transform: translateX(0); opacity: 1; }
//}
//
//@keyframes slideToLeft {
//    from { transform: translateX(0); opacity: 1; }
//    to { transform: translateX(-100%); opacity: 0; }
//}
//
//@keyframes slideToRight {
//    from { transform: translateX(0); opacity: 1; }
//    to { transform: translateX(100%); opacity: 0; }
//}
//
//.sliding-left {
//    animation: slideFromLeft 0.3s forwards;
//}
//
//.sliding-right {
//    animation: slideFromRight 0.3s forwards;
//}
//
///* Hide navigation buttons on mobile */
//@media (max-width: 768px) {
//    .nav-btn {
//        display: none !important;
//    }
//
//    .card-container::after {
//        content: 'Swipe to navigate ←→';
//        display: block;
//        text-align: center;
//        color: white;
//        font-size: 0.9rem;
//        padding: 10px;
//        opacity: 0.8;
//        position: absolute;
//        bottom: -30px;
//        width: 100%;
//    }
//}
//</style>
//`);
//<!-- End of Experimentation-->


// Add these variables to your existing variables section
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 50; // Minimum distance required for a swipe
let isAnimating = false;

// Enhanced displayCandidate function with animation matching your HTML classes
function displayCandidate(index, direction) {
    if (candidates.length === 0 || isAnimating) return;

    isAnimating = true;
    let candidate = candidates[index];

    // Create a new card element that will slide in
    const newCard = document.createElement('div');
    newCard.className = 'candidate-card';
    newCard.id = 'newCandidateCard';

    // Add appropriate animation class based on direction
    newCard.classList.add(direction === "left" ? "card-enter-active" : "card-leave-active");

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

    // Get reference to the card wrapper
    const cardWrapper = document.querySelector('.card-wrapper');

    // Add the new card
    cardWrapper.appendChild(newCard);

    // Get the current card
    const currentCard = document.getElementById('candidateCard');

    // Apply opposite animation to the current card
    currentCard.className = 'candidate-card';
    void currentCard.offsetWidth; // Force reflow
    currentCard.classList.add(direction === "left" ? "card-leave-active" : "card-enter-active");

    // After animation completes
    setTimeout(() => {
        // Remove the old card
        cardWrapper.removeChild(currentCard);

        // Make the new card the current card
        newCard.id = 'candidateCard';
        newCard.classList.remove('card-enter-active', 'card-leave-active');
        candidateCard = newCard;

        // Initialize Bootstrap tabs in the new card
        const tabs = candidateCard.querySelectorAll('[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const target = document.querySelector(this.dataset.bsTarget);
                candidateCard.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('show', 'active');
                });
                candidateCard.querySelectorAll('.nav-link').forEach(link => {
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

// Add swipe indicators to the card container
function addSwipeIndicators() {
    const cardContainer = document.querySelector('.card-container');

    // Add left indicator if it doesn't exist
    if (!document.querySelector('.swipe-hint-left')) {
        const leftHint = document.createElement('div');
        leftHint.className = 'swipe-hint-left';
        leftHint.innerHTML = '<i class="fas fa-chevron-left"></i>';
        cardContainer.appendChild(leftHint);
    }

    // Add right indicator if it doesn't exist
    if (!document.querySelector('.swipe-hint-right')) {
        const rightHint = document.createElement('div');
        rightHint.className = 'swipe-hint-right';
        rightHint.innerHTML = '<i class="fas fa-chevron-right"></i>';
        cardContainer.appendChild(rightHint);
    }
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
        }

        .card-wrapper {
            position: relative;
            overflow: hidden;
        }

        .candidate-card {
            user-select: none;
            -webkit-user-select: none;
        }

        /* Visual indicators for swipe direction */
        .swipe-hint-left, .swipe-hint-right {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            font-size: 2rem;
            color: #AD4245;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
            z-index: 30;
        }

        .swipe-hint-left {
            left: 20px;
        }

        .swipe-hint-right {
            right: 20px;
        }

        .card-container:hover .swipe-hint-left,
        .card-container:hover .swipe-hint-right {
            opacity: 0.5;
        }

        /* Enhanced animations for card transitions */
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(-100%); opacity: 0; }
        }

        .card-enter-active {
            animation: slideIn 0.5s forwards;
        }

        .card-leave-active {
            animation: slideOut 0.5s forwards;
        }
    `;
    document.head.appendChild(styleElement);
}

// Setup swipe functionality after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // The original DOMContentLoaded handler will still execute

    // Store reference to the original fetchCandidates function
    const originalFetchCandidates = window.fetchCandidates;

    // Replace fetchCandidates with our enhanced version
    window.fetchCandidates = async function() {
        // Call the original function first
        await originalFetchCandidates();

        // Add our enhancements
        addSwipeIndicators();
        initSwipeListeners();
        addSwipeStyles();

        // Make the card container grabbable
        const cardContainer = document.querySelector('.card-container');
        cardContainer.style.cursor = 'grab';
    };

    // Update navigation button event listeners
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentIndex > 0 && !isAnimating) {
                currentIndex--;
                displayCandidate(currentIndex, "left");
            } else if (!isAnimating) {
                animateBounce("left");
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (currentIndex < candidates.length - 1 && !isAnimating) {
                currentIndex++;
                displayCandidate(currentIndex, "right");
            } else if (!isAnimating) {
                animateBounce("right");
            }
        });
    }

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
});



// Handle radio button selection
document.querySelectorAll("input[name='interest_prompt']").forEach((radio) => {
    radio.addEventListener("change", function () {
        if (this.value === "yes") {
            let applicantId = selectedIndex + 1;
            document.getElementById("comment").style.display = "block";
            fetchComments(applicantId);
        } else {
            document.getElementById("comment").style.display = "none";
        }
    });
});






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
            console.log("from db: ");
            console.log(comment.faculty_name);
            console.log("from session:");
            console.log(facultyName);

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

function closeRateModal() {
rateModalObj.hide(); // Hide rating modal using Bootstrap method
setTimeout(() => {
detailsModalObj.show(); // Show details modal using Bootstrap method
}, 500); // Small delay to ensure smooth transition
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
