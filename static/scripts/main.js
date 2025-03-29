let candidates = [];
let currentIndex = 0;
let selectedIndex = null;
const candidateCard = document.getElementById("candidateCard");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// Modal elements
const detailsModal = document.getElementById("detailsModal");
const rateModal = document.getElementById("rateModal");
const modalButton = document.getElementById("button");
const modalCandidateName = document.getElementById("modalCandidateName");
const modalCandidateSummary = document.getElementById("modalCandidateSummary");
const modalCandidateDetails = document.getElementById("modalCandidateDetails");
const modalCandidateInterests = document.getElementById("modalCandidateInterests");

//rating modal
const modalCandidateName_rating= document.getElementById("modalCandidateName-1");
const modalCandidateInterests_rating = document.getElementById("modalCandidateInterests-1");


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
        candidateCard.innerHTML = "<p>Error loading candidates. Please try again later.</p>";
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
            <h3>${candidate.name}</h3>
            <p>${candidate.summary}</p>
            <p>${candidate.details}</p>
            <button onclick="openModal(${index})">View More</button>
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
    modalButton.innerHTML = `<button onclick="openRateModal(${index})">Rate Candidate</button>`;

    // Populate interests dynamically
    if (candidate.interests && candidate.interests.length > 0) {
        modalCandidateInterests.innerHTML = candidate.interests
            .map(interest => `<li>${interest}</li>`)
            .join(""); // Convert array to list items
    } else {
        modalCandidateInterests.innerHTML = "<li>No interests specified.</li>";
    }

    detailsModal.style.display = "flex"; // Show modal
}

// Function to close the modal
function closeModal() {
    detailsModal.style.display = "none"; // Hide modal
}



// Load candidates on page load
fetchCandidates();

// Open the rating modal and load existing comments from the database
function openRateModal(index) {
    selectedIndex = index;
    let candidate = candidates[index];
    modalCandidateName_rating.textContent = candidate.name;

    if (candidate.interests && candidate.interests.length > 0) {
        modalCandidateInterests_rating.innerHTML = candidate.interests
            .map(interest => `<li>${interest}</li>`)
            .join("");
    } else {
        modalCandidateInterests_rating.innerHTML = "<li>No interests specified.</li>";
    }

    // Reset modal elements
    document.getElementById("rating").value = "";
    document.getElementById("first_display").style.display = "block";
    document.querySelector(".interest-prompt").style.display = "none";
    document.getElementById("comment").style.display = "none";
    document.getElementById("new-comment").value = ""; // Clear comment field
    document.getElementById("comments-section").innerHTML = ""; // Clear previous comments

    // Reset radio buttons
    document.querySelectorAll("input[name='interest_prompt']").forEach(radio => {
        radio.checked = false;
    });

    // Fetch existing comments for this application
    fetchComments(candidate.id);

    // Also check if there's an existing rating in the comments
    checkExistingRating(candidate.id);

    rateModal.style.display = "flex";
    detailsModal.style.display = "none";
}

// Function to check for existing ratings in the comments
function checkExistingRating(applicationId) {
    fetch(`/get_comments?application_id=${applicationId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.comments.length > 0) {
                // Use the rating from the most recent comment
                const mostRecentComment = data.comments[data.comments.length - 1];
                document.getElementById("rating").value = mostRecentComment.rating;

                // Trigger the input event to show the appropriate sections
                const event = new Event('input', { bubbles: true });
                document.getElementById("rating").dispatchEvent(event);

                // If there was an interest prompt answer, select the appropriate radio button
                if (mostRecentComment.interest_prompt) {
                    const radio = document.querySelector(`input[name='interest_prompt'][value='${mostRecentComment.interest_prompt}']`);
                    if (radio) {
                        radio.checked = true;

                        // If they answered yes, show the comment section
                        if (mostRecentComment.interest_prompt === 'yes') {
                            document.getElementById("comment").style.display = "block";
                        }
                    }
                }

                // Since there's existing data, disable inputs initially and show edit button
                disableInputs();
                document.getElementById("edit-comment-btn").style.display = "block";
            } else {
                // No existing rating, enable inputs for first-time rating
                enableEditing();
                document.getElementById("edit-comment-btn").style.display = "none";
            }
        })
        .catch(error => console.error("Error checking existing rating:", error));
}

// Handle rating input
document.getElementById("rating").addEventListener("input", function() {
    let rating = parseInt(this.value, 10);

    if (rating < 4) {
        document.getElementById("first_display").style.display = "none";
        document.querySelector(".interest-prompt").style.display = "block";

        // Check if there's a radio button selected
        const selectedRadio = document.querySelector("input[name='interest_prompt']:checked");
        if (selectedRadio && selectedRadio.value === "yes") {
            document.getElementById("comment").style.display = "block";
        } else {
            document.getElementById("comment").style.display = "none";
        }
    } else {
        document.getElementById("first_display").style.display = "block";
        document.querySelector(".interest-prompt").style.display = "none";
        document.getElementById("comment").style.display = "block"; // Always show comment section for ratings >= 4
    }
});

// Handle radio button selection
document.querySelectorAll("input[name='interest_prompt']").forEach((radio) => {
    radio.addEventListener("change", function() {
        if (this.value === "yes") {
            document.getElementById("comment").style.display = "block";
        } else {
            document.getElementById("comment").style.display = "none";
        }
    });
});

// Function to post a comment
document.getElementById("post-comment-btn").addEventListener("click", function() {
    const applicationId = candidates[selectedIndex].id;
    const rating = document.getElementById("rating").value;
    const interestPrompt = document.querySelector("input[name='interest_prompt']:checked")?.value || "";
    const commentText = document.getElementById("new-comment").value.trim();

    if (!rating) {
        alert("Please provide a rating before posting a comment.");
        return;
    }

    if (rating < 4 && !interestPrompt) {
        alert("Please answer the interest prompt question.");
        return;
    }

    if (commentText === "") {
        alert("Please write a comment before posting.");
        return;
    }

    fetch("/add_comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            application_id: applicationId,
            rating: rating,
            interest_prompt: interestPrompt || "yes", // Default to "yes" for ratings >= 4
            comment: commentText
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Comment posted successfully!");
            document.getElementById("new-comment").value = "";
            fetchComments(applicationId); // Refresh comments display

            // After posting, disable inputs and show edit button
            disableInputs();
            document.getElementById("edit-comment-btn").style.display = "block";
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => console.error("Error posting comment:", error));
});

// Function to submit the final rating
document.getElementById("final-subButton").addEventListener("click", function() {
    const applicationId = candidates[selectedIndex].id;
    const rating = document.getElementById("rating").value;
    const interestPrompt = document.querySelector("input[name='interest_prompt']:checked")?.value || "";
    const commentText = document.getElementById("new-comment").value.trim();

    if (!rating) {
        alert("Please provide a rating before submitting.");
        return;
    }

    // For ratings < 4, interest prompt is required
    if (rating < 4 && !interestPrompt) {
        alert("Please answer whether the candidate has qualities that make them a desirable FI.");
        return;
    }

    // If they selected "yes" to interest prompt, a comment is required
    if (interestPrompt === "yes" && commentText === "") {
        alert("Please provide a comment explaining why the candidate is desirable.");
        return;
    }

    // If we have a comment but no existing comment in the database, post it first
    if (commentText !== "" && document.getElementById("comments-section").innerText.includes("No comments yet")) {
        // Post the comment first
        fetch("/add_comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                application_id: applicationId,
                rating: rating,
                interest_prompt: interestPrompt || "yes", // Default to "yes" for ratings >= 4
                comment: commentText
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Rating and comment submitted successfully!");
                disableInputs(); // Disable inputs after submission
                document.getElementById("edit-comment-btn").style.display = "block";
                fetchComments(applicationId); // Refresh comments
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => console.error("Error submitting:", error));
    } else {
        // Just submit the rating
        fetch("/submit_rating", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                application_id: applicationId,
                rating: rating
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Rating submitted successfully!");
                disableInputs(); // Disable inputs after submission
                document.getElementById("edit-comment-btn").style.display = "block";
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => console.error("Error submitting rating:", error));
    }
});

// Function to fetch and display comments
function fetchComments(applicationId) {
    fetch(`/get_comments?application_id=${applicationId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let commentsSection = document.getElementById("comments-section");
                commentsSection.innerHTML = "";

                if (data.comments.length === 0) {
                    commentsSection.innerHTML = "<p>No comments yet.</p>";
                    return;
                }

                data.comments.forEach(comment => {
                    const commentDiv = document.createElement("div");
                    commentDiv.classList.add("border", "p-2", "mb-2");
                    commentDiv.setAttribute("id", `comment-${comment.id}`);

                    commentDiv.innerHTML = `
                        <p style="color:#236465 !important">
                            <strong>Comment:</strong>
                            <span id="commentText-${comment.id}" style="color: inherit;">${comment.comment}</span>
                        </p>
                        <small class="text-muted">
                            <button class="btn btn-sm edit-btn" style="background:#008080 !important; color: white;"
                                onclick="editComment('${comment.id}')" id="edit-btn-${comment.id}" disabled>Edit</button>
                            <button class="btn btn-sm delete-btn" style="background:#AD4245 !important; color: white;"
                                onclick="deleteComment('${comment.id}')" id="delete-btn-${comment.id}" disabled>Delete</button>
                        </small>
                    `;

                    commentsSection.appendChild(commentDiv);
                });

                // If there are comments, we assume the user has already rated
                disableInputs();
                document.getElementById("edit-comment-btn").style.display = "block";
            } else {
                console.error("Failed to fetch comments:", data.message);
            }
        })
        .catch(error => console.error("Error fetching comments:", error));
}

// Function to disable rating input, comment box, and buttons
function disableInputs() {
    document.getElementById("rating").disabled = true;
    document.getElementById("new-comment").disabled = true;

    // Disable radio buttons
    document.querySelectorAll("input[name='interest_prompt']").forEach(radio => {
        radio.disabled = true;
    });

    // Disable edit/delete buttons for comments
    document.querySelectorAll(".edit-btn, .delete-btn").forEach(btn => {
        btn.disabled = true;
    });

    // Disable post comment button
    document.getElementById("post-comment-btn").disabled = true;
}

// Function to enable editing
function enableEditing() {
    document.getElementById("rating").disabled = false;
    document.getElementById("new-comment").disabled = false;

    // Enable radio buttons
    document.querySelectorAll("input[name='interest_prompt']").forEach(radio => {
        radio.disabled = false;
    });

    // Enable edit/delete buttons for comments
    document.querySelectorAll(".edit-btn, .delete-btn").forEach(btn => {
        btn.disabled = false;
    });

    // Enable post comment button
    document.getElementById("post-comment-btn").disabled = false;
}

// Add event listener for the edit button
document.getElementById("edit-comment-btn").addEventListener("click", function() {
    enableEditing();
    this.style.display = "none"; // Hide edit button when in edit mode
});

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
                rating: document.getElementById("rating").value,
                interest_prompt: document.querySelector("input[name='interest_prompt']:checked")?.value || "yes",
                comment: newComment
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                commentSpan.textContent = newComment;
                alert("Comment updated successfully!");
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => console.error("Error updating comment:", error));
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
                alert("Comment deleted successfully!");
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => console.error("Error deleting comment:", error));
    }
}

// Function to close the rating modal
function closeRateModal() {
    rateModal.style.display = "none";
    detailsModal.style.display = "flex"; // Show details modal
}