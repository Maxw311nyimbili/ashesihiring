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
    document.getElementById("comments-section").innerHTML = ""; // Clear previous comments

    // Fetch and display existing comments for this application
    fetchComments(candidate.id);

    rateModal.style.display = "flex";
    detailsModal.style.display = "none";
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
            document.getElementById("comment").style.display = "block";
        } else {
            document.getElementById("comment").style.display = "none";
        }
    });
});

// Function to post a comment
document.getElementById("post-comment-btn").addEventListener("click", function () {
    const applicationId = selectedIndex;
    const rating = document.getElementById("rating").value;
    const interestPrompt = document.querySelector("input[name='interest_prompt']:checked")?.value || "";
    const commentText = document.getElementById("new-comment").value.trim();

    console.log("Candidates Array:", candidates);
    console.log("Selected Index:", selectedIndex);


    if (!rating || !interestPrompt || commentText === "") {
        alert("All fields are required to post a comment.");
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
            alert("Comment posted successfully!");
            document.getElementById("new-comment").value = "";
            fetchComments(applicationId); // Refresh comments display
        } else {
            alert("Error: " + data.message + " id" + applicationId + " rating: " + rating + " interest prompt: " + interestPrompt + " comment" + commentText);
        }
    })
    .catch(error => console.error("Error posting comment:", error));
});

document.getElementById("final-subButton").addEventListener("click", function () {
    const applicationId = selectedIndex;
    const rating = document.getElementById("rating").value;
    const interestPrompt = document.querySelector("input[name='interest_prompt']:checked")?.value || "";
    const commentText = document.getElementById("new-comment").value.trim();

    if (!rating) {
        alert("Please provide a rating before submitting.");
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

    fetch("/submit_rating", {  // Change route if needed
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Rating submitted successfully!");
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => console.error("Error submitting rating:", error));
});


function fetchComments(applicationId) {
    fetch(`/get_comments?application_id=${applicationId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let commentsSection = document.getElementById("comments-section");
                commentsSection.innerHTML = ""; // Clear previous comments

                data.comments.forEach(comment => {
                    const commentDiv = document.createElement("div");
                    commentDiv.classList.add("border", "p-2");
                    commentDiv.setAttribute("id", `comment-${comment.id}`);

                    commentDiv.innerHTML = `
                        <p style="color:#236465 !important">
                            <strong>User:</strong>
                            <span id="commentText-${comment.id}" style="color: inherit;">${comment.comment}</span>
                        </p>
                        <small class="text-muted">
                            <button class="btn btn-sm" style="background:#008080 !important; color: white;"
                                onclick="editComment('${comment.id}')">Edit</button>
                            <button class="btn btn-sm" style="background:#AD4245 !important; color: white;"
                                onclick="deleteComment('${comment.id}')">Delete</button>
                        </small>
                    `;

                    commentsSection.appendChild(commentDiv);
                    document.getElementById("new-comment").value = ""; // Clear input
                });
            } else {
                console.error("Failed to fetch comments:", data.message);
            }
        })
        .catch(error => console.error("Error fetching comments:", error));
}

// // Function to edit a comment
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


function closeRateModal() {
    rateModal.style.display = "none";
    detailsModal.style.display = "flex"; // Show details modal
}
