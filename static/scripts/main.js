let candidates = [];
let currentIndex = 0;
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

function openRateModal(index) {
    let candidate = candidates[index];

    modalCandidateName_rating.textContent = candidate.name;

    // Populate interests dynamically
    if (candidate.interests && candidate.interests.length > 0) {
        modalCandidateInterests_rating.innerHTML = candidate.interests
            .map(interest => `<li>${interest}</li>`)
            .join("");
    } else {
        modalCandidateInterests_rating.innerHTML = "<li>No interests specified.</li>";
    }

    // Reset modal elements
    document.getElementById("rating").value = ""; // Clear rating input
    document.getElementById("first_display").style.display = "block"; // Show initial details
    document.querySelector(".interest-prompt").style.display = "none"; // Hide interest prompt
    document.getElementById("comment").style.display = "none"; // Hide comment box
    document.getElementById("comments-section").innerHTML = ""; // Clear previous comments

    rateModal.style.display = "flex";
    detailsModal.style.display = "none"; // Hide details modal
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
    const commentText = document.getElementById("new-comment").value.trim();
    if (commentText === "") {
        alert("Comment cannot be empty.");
        return;
    }

    const commentId = new Date().getTime(); // Unique ID for comment
    const commentDiv = document.createElement("div");
    commentDiv.classList.add("border", "p-2");
    commentDiv.setAttribute("id", `comment-${commentId}`);

    commentDiv.innerHTML = `
        <p style="color:#236465 !important">
            <strong>User:</strong>
            <span id="commentText-${commentId}" style="color: inherit;">${commentText}</span>
        </p>
        <small class="text-muted">
            <button class="btn btn-sm" style="color:#236465 !important" onclick="editComment('${commentId}')">Edit</button>
            <button class="btn btn-sm" style="color:#AD4245 !important" onclick="deleteComment('${commentId}')">Delete</button>
        </small>
    `;

    document.getElementById("comments-section").appendChild(commentDiv);
    document.getElementById("new-comment").value = ""; // Clear input
});

// Function to edit a comment
function editComment(commentId) {
    const commentSpan = document.getElementById(`commentText-${commentId}`);
    const newComment = prompt("Edit your comment:", commentSpan.textContent);
    if (newComment !== null && newComment.trim() !== "") {
        commentSpan.textContent = newComment;
    }
}

// Function to delete a comment
function deleteComment(commentId) {
    document.getElementById(`comment-${commentId}`).remove();
}

function closeRateModal() {
    rateModal.style.display = "none";
    detailsModal.style.display = "flex"; // Show details modal
}
