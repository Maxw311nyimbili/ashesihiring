//let candidates = [];
//let currentIndex = 0;
//const candidateCard = document.getElementById("candidateCard");
//const prevBtn = document.getElementById("prevBtn");
//const nextBtn = document.getElementById("nextBtn");
//
//// Modal elements
//const detailsModal = document.getElementById("detailsModal");
//const modalCandidateName = document.getElementById("modalCandidateName");
//const modalCandidateSummary = document.getElementById("modalCandidateSummary");
//const modalCandidateDetails = document.getElementById("modalCandidateDetails");
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
//    let candidate = candidates[index];
//
//    modalCandidateName.textContent = candidate.name;
//    modalCandidateSummary.textContent = candidate.summary;
//    modalCandidateDetails.innerHTML = candidate.details;
//
//    detailsModal.style.display = "block"; // Show modal
//}
//
//// Function to close the modal
//function closeModal() {
//    detailsModal.style.display = "none"; // Hide modal
//}
//
//
//// Load candidates on page load
//fetchCandidates();


let candidates = [];
let currentIndex = 0;
const candidateCard = document.getElementById("candidateCard");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// Modal elements
const detailsModal = document.getElementById("detailsModal");
const modalCandidateName = document.getElementById("modalCandidateName");
const modalCandidateSummary = document.getElementById("modalCandidateSummary");
const modalCandidateDetails = document.getElementById("modalCandidateDetails");
const modalCandidateInterests = document.getElementById("modalCandidateInterests"); // NEW

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

    // Populate interests dynamically
    if (candidate.interests && candidate.interests.length > 0) {
        modalCandidateInterests.innerHTML = candidate.interests
            .map(interest => `<li>${interest}</li>`)
            .join(""); // Convert array to list items
    } else {
        modalCandidateInterests.innerHTML = "<li>No interests specified.</li>";
    }

    detailsModal.style.display = "block"; // Show modal
}

// Function to close the modal
function closeModal() {
    detailsModal.style.display = "none"; // Hide modal
}

// Load candidates on page load
fetchCandidates();
