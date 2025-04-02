//let candidates = [];
//let currentIndex = 0;
//let selectedIndex = null;
//const candidateCard = document.getElementById("candidateCard");
//const prevBtn = document.getElementById("prevBtn");
//const nextBtn = document.getElementById("nextBtn");
//
//// Modal elements
//const detailsModal = document.getElementById("detailsModal");
//const rateModal = document.getElementById("rateModal");
//const modalButton = document.getElementById("button");
//const modalCandidateName = document.getElementById("modalCandidateName");
//const modalCandidateSummary = document.getElementById("modalCandidateSummary");
//const modalCandidateDetails = document.getElementById("modalCandidateDetails");
//const modalCandidateInterests = document.getElementById("modalCandidateInterests");
//
////rating modal
//const modalCandidateName_rating= document.getElementById("modalCandidateName-1");
//const modalCandidateInterests_rating = document.getElementById("modalCandidateInterests-1");
//
//
//// Fetch candidates from backend API
//async function fetchCandidates() {
//    try {
//        let response = await fetch("/api/candidates");
//        let data = await response.json();
//        candidates = data;
//
//        if (candidates.length > 0) {
//            displayCandidate(currentIndex, "right"); // Initial display
//        }
//    } catch (error) {
//        console.error("Error fetching candidates:", error);
//        candidateCard.innerHTML = "<p>Error loading candidates. Please try again later.</p>";
//    }
//}
//
//// Function to display a candidate with animation
//function displayCandidate(index, direction) {
//    if (candidates.length === 0) return;
//
//    let candidate = candidates[index];
//
//    // Set exit animation class
//    let outClass = direction === "left" ? "hidden-left" : "hidden-right";
//    let inClass = direction === "left" ? "hidden-right" : "hidden-left";
//
//    // Remove active class for smooth exit animation
//    candidateCard.classList.remove("active");
//    candidateCard.classList.add(outClass);
//
//    setTimeout(() => {
//        // Update content only after animation
//        candidateCard.innerHTML = `
//            <h3>${candidate.name}</h3>
//            <p>${candidate.summary}</p>
//            <p>${candidate.details}</p>
//            <button onclick="openModal(${index})">View More</button>
//        `;
//
//        // Reset and apply entrance animation
//        candidateCard.classList.remove(outClass);
//        candidateCard.classList.add(inClass);
//
//        // Small timeout to ensure animation reflow
//        setTimeout(() => {
//            candidateCard.classList.add("active");
//        }, 50);
//    }, 400); // Matches CSS transition duration
//}
//
//// Navigation buttons
//prevBtn.addEventListener("click", () => {
//    if (currentIndex > 0) {
//        currentIndex--;
//        displayCandidate(currentIndex, "left");
//    }
//});
//
//nextBtn.addEventListener("click", () => {
//    if (currentIndex < candidates.length - 1) {
//        currentIndex++;
//        displayCandidate(currentIndex, "right");
//    }
//});
//
//// Function to open the modal
//function openModal(index) {
//
//    let candidate = candidates[index];
//
//    modalCandidateName.textContent = candidate.name;
//    modalCandidateSummary.textContent = candidate.summary;
//    modalCandidateDetails.innerHTML = candidate.details;
//    modalButton.innerHTML = `<button onclick="openRateModal(${index})">Rate Candidate</button>`;
//
//    // Populate interests dynamically
//    if (candidate.interests && candidate.interests.length > 0) {
//        modalCandidateInterests.innerHTML = candidate.interests
//            .map(interest => `<li>${interest}</li>`)
//            .join(""); // Convert array to list items
//    } else {
//        modalCandidateInterests.innerHTML = "<li>No interests specified.</li>";
//    }
//
//    detailsModal.style.display = "flex"; // Show modal
//}
//
//// Function to close the modal
//function closeModal() {
//    detailsModal.style.display = "none"; // Hide modal
//}
//
//
//
//// Load candidates on page load
//fetchCandidates();
//
//// Open the rating modal and load existing comments from the database
//function openRateModal(index) {
//    selectedIndex = index;
//    let candidate = candidates[index];
//    modalCandidateName_rating.textContent = candidate.name;
//
//    if (candidate.interests && candidate.interests.length > 0) {
//        modalCandidateInterests_rating.innerHTML = candidate.interests
//            .map(interest => `<li>${interest}</li>`)
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
//    // Fetch and display existing comments for this application
//    fetchComments(candidate.id);
//
//    rateModal.style.display = "flex";
//    detailsModal.style.display = "none";
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
//        document.getElementById("comment").style.display = "none";
//    }
//});
//
// //Handle radio button selection
//document.querySelectorAll("input[name='interest_prompt']").forEach((radio) => {
//    radio.addEventListener("change", function () {
//        if (this.value === "yes") {
//        let applicantId = selectedIndex + 1;
//            document.getElementById("comment").style.display = "block";
//            fetchComments(applicantId);
//        } else {
//            document.getElementById("comment").style.display = "none";
//        }
//    });
//});
//
//
//
//
//// Function to post a comment
//document.getElementById("post-comment-btn").addEventListener("click", function () {
//    const applicationId = selectedIndex + 1;
//    const rating = document.getElementById("rating").value;
//    const interestPrompt = document.querySelector("input[name='interest_prompt']:checked")?.value || "";
//    const commentText = document.getElementById("new-comment").value.trim();
//
//    console.log("Candidates Array:", candidates);
//    console.log("Selected Index:", selectedIndex);
//
//
//    if (!rating || !interestPrompt || commentText === "") {
//        alert("All fields are required to post a comment.");
//        return;
//    }
//
//    fetch("/add_comment", {
//        method: "POST",
//        headers: { "Content-Type": "application/json" },
//        body: JSON.stringify({
//            application_id: applicationId,
//            rating: rating,
//            interest_prompt: interestPrompt,
//            comment: commentText
//        })
//    })
//    .then(response => response.json())
//    .then(data => {
//        if (data.success) {
//            alert("Comment posted successfully!");
//            document.getElementById("new-comment").value = "";
//            fetchComments(applicationId); // Refresh comments display
//        } else {
//            alert("Error: " + data.message + " id" + applicationId + " rating: " + rating + " interest prompt: " + interestPrompt + " comment" + commentText);
//        }
//    })
//    .catch(error => console.error("Error posting comment:", error));
//});
//
//document.getElementById("final-subButton").addEventListener("click", function () {
//    const applicationId = selectedIndex + 1;
//    const rating = document.getElementById("rating").value;
//    const interestPrompt = document.querySelector("input[name='interest_prompt']:checked")?.value || "";
//    const commentText = document.getElementById("new-comment").value.trim();
//
//    if (!rating) {
//        alert("Please provide a rating before submitting.");
//        return;
//    }
//
//    const requestBody = {
//        application_id: applicationId,
//        rating: rating
//    };
//
//    // Include comment only if posted
//    if (commentText !== "") {
//        requestBody.comment = commentText;
//        requestBody.interest_prompt = interestPrompt;
//    }
//
//    fetch("/submit_rating", {  // Change route if needed
//        method: "POST",
//        headers: { "Content-Type": "application/json" },
//        body: JSON.stringify(requestBody)
//    })
//    .then(response => response.json())
//    .then(data => {
//        if (data.success) {
//            alert("Rating submitted successfully!");
//        } else {
//            alert("Error: " + data.message);
//        }
//    })
//    .catch(error => console.error("Error submitting rating:", error));
//});
//
//
//function fetchComments(applicationId) {
//    console.log("Fetching comments for Application ID:", applicationId); // Debugging
//
//    let facultyName = document.getElementById("loggedInUser").value;
//
//    fetch(`/get_comments?application_id=${applicationId}`)
//        .then(response => response.json())
//        .then(data => {
//            console.log("Fetched Data:", data); // Check response in DevTools Console
//
//            if (data.success) {
//                let commentsSection = document.getElementById("comments-section");
//                if (!commentsSection) {
//                    console.error("Error: comments-section not found in DOM");
//                    return;
//                }
//
//                commentsSection.innerHTML = ""; // Clear previous comments
//
//                if (data.comments.length === 0) {
//                    commentsSection.innerHTML = "<p>No comments yet.</p>";
//                    return;
//                }
//
//                data.comments.forEach(comment => {
//                    console.log("Processing Comment:", comment); // Debug each comment
//
//                    const commentDiv = document.createElement("div");
//                    commentDiv.classList.add("border", "p-2");
//                    commentDiv.setAttribute("id", `comment-${comment.id}`);
//
////                    commentDiv.innerHTML = `
////                        <p style="color:#236465 !important">
////                            <strong>${facultyName}:</strong>
////                            <span id="commentText-${comment.id}" style="color: inherit;">${comment.comment}</span>
////                        </p>
////                        <small class="text-muted">
////                            <button class="btn btn-sm" style="background:#008080 !important; color: white;"
////                                onclick="editComment('${comment.id}')">Edit</button>
////                            <button class="btn btn-sm" style="background:#AD4245 !important; color: white;"
////                                onclick="deleteComment('${comment.id}')">Delete</button>
////                        </small>
////                    `;
//
//                        commentDiv.innerHTML = `
//                        <div class="comment-card mb-3 border-start border-3 ps-3" style="border-color: #236465 !important;">
//                            <div class="d-flex justify-content-between align-items-start">
//                                <div class="comment-content">
//                                    <p class="mb-1" style="color:#236465 !important">
//                                        <strong class="fw-bold">${facultyName}:</strong>
//                                        <span id="commentText-${comment.id}" style="color: inherit;">${comment.comment}</span>
//                                    </p>
//                                    <small class="text-muted comment-time">${comment.timestamp || 'Just now'}</small>
//                                </div>
//                                <div class="comment-actions">
//                                    <button class="btn btn-sm rounded-pill me-1 shadow-sm" style="background:#008080 !important; color: white;"
//                                        onclick="editComment('${comment.id}')">
//                                        <i class="fas fa-edit me-1"></i> Edit
//                                    </button>
//                                    <button class="btn btn-sm rounded-pill shadow-sm" style="background:#AD4245 !important; color: white;"
//                                        onclick="deleteComment('${comment.id}')">
//                                        <i class="fas fa-trash-alt me-1"></i> Delete
//                                    </button>
//                                </div>
//                            </div>
//                        </div>
//                    `;
//
//                    commentsSection.appendChild(commentDiv);
//                });
//            } else {
//                console.error("Failed to fetch comments:", data.message);
//            }
//        })
//        .catch(error => console.error("Error fetching comments:", error));
//}
//
//// // Function to edit a comment
//function editComment(commentId) {
//    const commentSpan = document.getElementById(`commentText-${commentId}`);
//    const newComment = prompt("Edit your comment:", commentSpan.textContent);
//
//    if (newComment !== null && newComment.trim() !== "") {
//        fetch("/comment", {
//            method: "PUT",
//            headers: { "Content-Type": "application/json" },
//            body: JSON.stringify({
//                comment_id: commentId,
//                rating: document.getElementById("rating").value, // Include updated rating
//                interest_prompt: document.querySelector("input[name='interest_prompt']:checked")?.value || "",
//                comment: newComment
//            })
//        })
//        .then(response => response.json())
//        .then(data => {
//            if (data.success) {
//                commentSpan.textContent = newComment;
//                alert("Comment updated successfully!");
//            } else {
//                alert("Error: " + data.message);
//            }
//        })
//        .catch(error => console.error("Error updating comment:", error));
//    }
//}
//
//// Function to delete a comment
//function deleteComment(commentId) {
//    if (confirm("Are you sure you want to delete this comment?")) {
//        fetch("/delete_comment", {
//            method: "POST",
//            headers: { "Content-Type": "application/json" },
//            body: JSON.stringify({ comment_id: commentId })
//        })
//        .then(response => response.json())
//        .then(data => {
//            if (data.success) {
//                document.getElementById(`comment-${commentId}`).remove();
//                alert("Comment deleted successfully!");
//            } else {
//                alert("Error: " + data.message);
//            }
//        })
//        .catch(error => console.error("Error deleting comment:", error));
//    }
//}
//
//
//function closeRateModal() {
//    rateModal.style.display = "none";
//    detailsModal.style.display = "flex"; // Show details modal
//}



let candidates = [];
let currentIndex = 0;
let selectedIndex = null;
const candidateCard = document.getElementById("candidateCard");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// Bootstrap modal objects
let detailsModalObj, rateModalObj;

// Modal elements
const detailsModal = document.getElementById("detailsModal");
const rateModal = document.getElementById("rateModal");
const modalButton = document.getElementById("button");
const modalCandidateName = document.getElementById("modalCandidateName");
const modalCandidateSummary = document.getElementById("modalCandidateSummary");
const modalCandidateDetails = document.getElementById("modalCandidateDetails");
const modalCandidateInterests = document.getElementById("modalCandidateInterests");

// Rating modal
const modalCandidateName_rating = document.getElementById("modalCandidateName-1");
const modalCandidateInterests_rating = document.getElementById("modalCandidateInterests-1");

// Initialize Bootstrap modals
document.addEventListener('DOMContentLoaded', function() {
    detailsModalObj = new bootstrap.Modal(detailsModal);
    rateModalObj = new bootstrap.Modal(rateModal);

    // Load candidates on page load
    fetchCandidates();
});

// Fetch candidates from backend API
async function fetchCandidates() {
    try {
        let response = await fetch("/api/candidates");
        let data = await response.json();
        candidates = data;

        if (candidates.length > 0) {
            displayCandidate(currentIndex, "right"); // Initial display
        }
    } catch (error) {
        console.error("Error fetching candidates:", error);
        candidateCard.innerHTML = "<p class='text-danger'>Error loading candidates. Please try again later.</p>";
    }
}

// Function to display a candidate with animation
function displayCandidate(index, direction) {
    if (candidates.length === 0) return;

    let candidate = candidates[index];

    // Set exit animation class
    let outClass = direction === "left" ? "hidden-left" : "hidden-right";
    let inClass = direction === "left" ? "hidden-right" : "hidden-left";

    // Remove active class for smooth exit animation
    candidateCard.classList.remove("active");
    candidateCard.classList.add(outClass);

    setTimeout(() => {
        // Update content only after animation
        candidateCard.innerHTML = `
            <h3 class="mt-4">${candidate.name}</h3>
            <p>${candidate.summary}</p>
            <p>${candidate.details}</p>
            <button class="btn btn-link p-0 mt-2" onclick="openModal(${index})">View More</button>
        `;

        // Reset and apply entrance animation
        candidateCard.classList.remove(outClass);
        candidateCard.classList.add(inClass);

        // Small timeout to ensure animation reflow
        setTimeout(() => {
            candidateCard.classList.add("active");
        }, 50);
    }, 400); // Matches CSS transition duration
}

// Navigation buttons
prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
        currentIndex--;
        displayCandidate(currentIndex, "left");
    }
});

nextBtn.addEventListener("click", () => {
    if (currentIndex < candidates.length - 1) {
        currentIndex++;
        displayCandidate(currentIndex, "right");
    }
});

// Function to open the modal
function openModal(index) {
    let candidate = candidates[index];

    modalCandidateName.textContent = candidate.name;
    modalCandidateSummary.textContent = candidate.summary;
    modalCandidateDetails.innerHTML = candidate.details;
    modalButton.innerHTML = `<button class="btn rate-btn" onclick="openRateModal(${index})">Rate Candidate</button>`;

    // Populate interests dynamically
    if (candidate.interests && candidate.interests.length > 0) {
        modalCandidateInterests.innerHTML = candidate.interests
            .map(interest => `<li class="mb-1">${interest}</li>`)
            .join(""); // Convert array to list items
    } else {
        modalCandidateInterests.innerHTML = "<li>No interests specified.</li>";
    }

    detailsModalObj.show(); // Show modal using Bootstrap method
}

// Function to close the modal
function closeModal() {
    detailsModalObj.hide(); // Hide modal using Bootstrap method
}

// Open the rating modal and load existing comments from the database
function openRateModal(index) {
    detailsModalObj.hide(); // Hide details modal first

    selectedIndex = index;
    let candidate = candidates[index];
    modalCandidateName_rating.textContent = candidate.name;

    if (candidate.interests && candidate.interests.length > 0) {
        modalCandidateInterests_rating.innerHTML = candidate.interests
            .map(interest => `<li class="mb-1">${interest}</li>`)
            .join("");
    } else {
        modalCandidateInterests_rating.innerHTML = "<li>No interests specified.</li>";
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

    // Fetch and display existing comments for this application
    fetchComments(candidate.id);

    setTimeout(() => {
        rateModalObj.show(); // Show rating modal using Bootstrap method
    }, 500); // Small delay to ensure smooth transition
}

// Add this new function to check for previous ratings
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
        document.getElementById("comment").style.display = "none";
    }
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

// Function to post a comment
document.getElementById("post-comment-btn").addEventListener("click", function () {
    const applicationId = selectedIndex + 1;
    const rating = document.getElementById("rating").value;
    const interestPrompt = document.querySelector("input[name='interest_prompt']:checked")?.value || "";
    const commentText = document.getElementById("new-comment").value.trim();

    if (!rating || (rating < 4 && !interestPrompt) || commentText === "") {
        alert("Please fill in all required fields to post a comment.");
        return;
    }

    fetch("/add_comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            application_id: applicationId,
            rating: rating,
            interest_prompt: interestPrompt,
            comment: commentText
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show toast notification instead of alert
            showToast("Comment posted successfully!");
            document.getElementById("new-comment").value = "";
            fetchComments(applicationId); // Refresh comments display
        } else {
            showToast("Error: " + data.message, "error");
        }
    })
    .catch(error => {
        console.error("Error posting comment:", error);
        showToast("An error occurred. Please try again.", "error");
    });
});

document.getElementById("final-subButton").addEventListener("click", function () {
    submitRating();
});

function submitRating() {
    const applicationId = selectedIndex + 1;
    const rating = document.getElementById("rating").value;
    const interestPrompt = document.querySelector("input[name='interest_prompt']:checked")?.value || "";
    const commentText = document.getElementById("new-comment").value.trim();

    if (!rating) {
        showToast("Please provide a rating before submitting.", "warning");
        return;
    }

    const requestBody = {
        application_id: applicationId,
        rating: rating
    };

    // Include comment only if posted
    if (commentText !== "") {
        requestBody.comment = commentText;
        requestBody.interest_prompt = interestPrompt;
    }

    fetch("/submit_rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast("Rating submitted successfully!");
            rateModalObj.hide(); // Hide modal using Bootstrap method
        } else {
            showToast("Error: " + data.message, "error");
        }
    })
    .catch(error => {
        console.error("Error submitting rating:", error);
        showToast("An error occurred. Please try again.", "error");
    });
}

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
                    console.log(comment.faculty);
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