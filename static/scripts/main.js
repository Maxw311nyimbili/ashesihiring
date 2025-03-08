//let candidates = [
//    { name: "John Doe",
//      summary: "Software Engineer with 3 years experience. He has Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum quos numquam aliquam. Non rem fugiat ut fugit exercitationem, sit error hic tempore accusamus, voluptatibus facere neque quia at adipisci. Molestias culpa nesciunt vitae voluptas, modi iusto explicabo eum similique dolorem maxime, id officia cupiditate praesentium itaque quia. Quidem, totam nihil?",
//      details: "Full Resume, Cover Letter & Transcript Here." },
//
//    { name: "Jane Smith", summary: "Data Analyst with expertise in Python & SQL. SHe has Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum quos numquam aliquam. Non rem fugiat ut fugit exercitationem, sit error hic tempore accusamus, voluptatibus facere neque quia at adipisci. Molestias culpa nesciunt vitae voluptas, modi iusto explicabo eum similique dolorem maxime, id officia cupiditate praesentium itaque quia. Quidem, totam nihil?", details: "Full Resume, Cover Letter & Transcript Here." },
//    { name: "Michael Brown", summary: "Project Manager skilled in Agile. He He has Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum quos numquam aliquam. Non rem fugiat ut fugit exercitationem, sit error hic tempore accusamus, voluptatibus facere neque quia at adipisci. Molestias culpa nesciunt vitae voluptas, modi iusto explicabo eum similique dolorem maxime, id officia cupiditate praesentium itaque quia. Quidem, totam nihil?", details: "Full Resume, Cover Letter & Transcript Here." }
//];
//
//let currentIndex = 0;
//let candidateCard = document.getElementById("candidateCard");
//
//function displayCandidate(index, direction) {
//    let candidate = candidates[index];
//
//    // Determine slide-out direction
//    let outClass = direction === "left" ? "hidden-left" : "hidden-right";
//    let inClass = direction === "left" ? "hidden-right" : "hidden-left";
//
//    // Remove previous classes before adding the new one
//    candidateCard.classList.remove("active");
//    candidateCard.classList.add(outClass);
//
//    // Wait for slide-out animation to finish
//    setTimeout(() => {
//        // Update content
//        candidateCard.innerHTML = `
//            <h3>${candidate.name}</h3>
//            <p>${candidate.summary}</p>
//            <button onclick="viewMore(${index})">View More</button>
//        `;
//
//        // Reset classes and force reflow
//        candidateCard.classList.remove("hidden-left", "hidden-right");
//
//        // Small timeout to force animation reflow
//        setTimeout(() => {
//            candidateCard.classList.add("active");
//        }, 50); // Short delay to ensure smooth transition
//    }, 400); // Matches transition duration
//}
//
//
//// Initial candidate display
//displayCandidate(currentIndex, "left");
//
//// Navigation logic
//document.getElementById("prevBtn").addEventListener("click", () => {
//    if (currentIndex > 0) {
//        currentIndex--;
//        displayCandidate(currentIndex, "left");
//    }
//});
//
//document.getElementById("nextBtn").addEventListener("click", () => {
//    if (currentIndex < candidates.length - 1) {
//        currentIndex++;
//        displayCandidate(currentIndex, "right");
//    }
//});

let candidates = [];
let currentIndex = 0;
let candidateCard = document.getElementById("candidateCard");

// Fetch candidates from Flask API
async function fetchCandidates() {
    try {
        let response = await fetch("/api/candidates");
        candidates = await response.json();
        if (candidates.length > 0) {
            displayCandidate(currentIndex, "left");
        }
    } catch (error) {
        console.error("Error fetching candidates:", error);
    }
}

// Display candidate details
function displayCandidate(index, direction) {
    if (candidates.length === 0) return;

    let candidate = candidates[index];

    let outClass = direction === "left" ? "hidden-left" : "hidden-right";
    let inClass = direction === "left" ? "hidden-right" : "hidden-left";

    candidateCard.classList.remove("active");
    candidateCard.classList.add(outClass);

    setTimeout(() => {
        candidateCard.innerHTML = `
            <h3>${candidate.name}</h3>
            <p>${candidate.summary}</p>
            <div>${candidate.details}</div>
            <button onclick="viewMore(${index})">View More</button>
        `;

        candidateCard.classList.remove("hidden-left", "hidden-right");

        setTimeout(() => {
            candidateCard.classList.add("active");
        }, 50);
    }, 400);
}

// Initial fetch and display
fetchCandidates();

// Navigation logic
document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentIndex > 0) {
        currentIndex--;
        displayCandidate(currentIndex, "left");
    }
});

document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentIndex < candidates.length - 1) {
        currentIndex++;
        displayCandidate(currentIndex, "right");
    }
});




// Open candidate details modal
function viewMore(index) {
    document.getElementById("modalCandidateName").innerText = candidates[index].name;
    document.getElementById("modalCandidateDetails").innerText = candidates[index].details;
    document.getElementById("modalCandidateSummary").innerText = candidates[index].summary;
    document.getElementById("detailsModal").style.display = "flex";
}

// Close modals
function closeModal() {
    document.getElementById("detailsModal").style.display = "none";
}

function openRateModal() {
    document.getElementById("rateModal").style.display = "flex";
}

function closeRateModal() {
    document.getElementById("rateModal").style.display = "none";
}

function submitRating() {
    let rating = document.getElementById("rating").value;
    let comment = document.getElementById("comment").value;

    if (rating < 4 && comment.trim() === "") {
        alert("Please add a comment for low ratings.");
        return;
    }

    alert(`Candidate rated ${rating}/5. Comment: ${comment}`);
    closeRateModal();
}
