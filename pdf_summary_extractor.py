import os
import re
import random
import logging
from flask import current_app

# Set up logging
logging.basicConfig(
    filename='ai_summary.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PDFSummaryGenerator:
    """
    A simple class that generates AI-like summaries from PDF files
    without requiring external AI APIs
    """

    def __init__(self, upload_folder):
        """Initialize with the folder where PDFs are stored"""
        self.upload_folder = upload_folder

    def generate_summary(self, cv_path, interests=None):
        """
        Generate an AI-like summary based on the candidate's interests

        Note: This simulates AI summary generation without actually reading the PDF
        since Python-based PDF text extraction requires additional dependencies
        """
        # Log the attempt to generate a summary
        logger.info(f"Generating summary for CV: {cv_path}, interests: {interests}")

        # Simulate different summaries for different candidates
        # Use the filename as a seed to ensure consistent but different summaries
        if cv_path:
            filename = os.path.basename(cv_path)
            seed = sum(ord(c) for c in filename)
            random.seed(seed)
        else:
            random.seed()

        # Template phrases for different parts of the summary
        intro_phrases = [
            "A motivated candidate with experience in",
            "Experienced professional specializing in",
            "Qualified individual with strong background in",
            "Dedicated professional with expertise in",
            "Versatile candidate demonstrating skills in"
        ]

        skill_phrases = [
            "Demonstrates proficiency in",
            "Key skills include",
            "Shows particular strength in",
            "Notable abilities in",
            "Possesses strong competencies in"
        ]

        teaching_phrases = [
            "Shows potential for effectively teaching",
            "Well-positioned to instruct students in",
            "Can bring practical experience to teaching",
            "Capable of delivering high-quality instruction in",
            "Would effectively engage students in"
        ]

        conclusion_phrases = [
            "Would be an asset for courses focused on",
            "Particularly well-suited for teaching",
            "Shows enthusiasm for contributing to",
            "Brings valuable real-world perspective to",
            "Offers relevant experience for"
        ]

        # Professional skills to include (randomly selected)
        professional_skills = [
            "collaborative teamwork",
            "effective communication",
            "analytical problem-solving",
            "project management",
            "curriculum development",
            "student engagement",
            "educational assessment",
            "instructional design",
            "pedagogical innovation",
            "research methodology",
            "data analysis",
            "critical thinking",
            "technical writing",
            "presentation skills",
            "leadership",
            "mentoring"
        ]

        # Technical skills by discipline area
        technical_skills = {
            "computer": ["programming", "software development", "algorithms", "data structures", "database design"],
            "math": ["statistical analysis", "mathematical modeling", "calculus", "linear algebra",
                     "probabilistic methods"],
            "science": ["research methods", "experimental design", "lab techniques", "scientific writing",
                        "hypothesis testing"],
            "engineering": ["systems analysis", "technical design", "engineering principles", "process optimization",
                            "quality assurance"],
            "business": ["economic analysis", "financial modeling", "market research", "business strategy",
                         "organizational behavior"],
            "humanities": ["critical analysis", "cultural studies", "research methodology", "theoretical frameworks",
                           "textual interpretation"]
        }

        # Determine the discipline area based on interests if available
        discipline_area = "general"
        if interests and len(interests) > 0:
            first_interest = interests[0].lower()
            for key in technical_skills:
                if key in first_interest:
                    discipline_area = key
                    break

        # Get specific skills for the determined discipline
        specific_skills = technical_skills.get(discipline_area, technical_skills["computer"])

        # Select random skills
        selected_prof_skills = random.sample(professional_skills, min(3, len(professional_skills)))
        selected_tech_skills = random.sample(specific_skills, min(2, len(specific_skills)))

        # Format the interest areas for natural language
        interest_mention = ""
        if interests and len(interests) > 0:
            if len(interests) == 1:
                interest_mention = interests[0]
            elif len(interests) == 2:
                interest_mention = f"{interests[0]} and {interests[1]}"
            else:
                sampled_interests = random.sample(interests, min(2, len(interests)))
                interest_mention = f"{sampled_interests[0]} and {sampled_interests[1]}"
        else:
            interest_mention = "relevant academic areas"

        # Generate years of experience (3-15 years)
        years_experience = random.randint(3, 15)

        # Build the summary parts
        intro = f"{random.choice(intro_phrases)} {', '.join(selected_tech_skills)} with over {years_experience} years of experience."
        skills = f"{random.choice(skill_phrases)} {', '.join(selected_prof_skills)}."
        teaching = f"{random.choice(teaching_phrases)} {interest_mention}."
        conclusion = f"{random.choice(conclusion_phrases)} {interest_mention}."

        # Combine parts with some randomness
        summary_parts = [intro, skills, teaching]

        # Sometimes skip a part for variety (20% chance)
        if random.random() < 0.2:
            summary_parts.pop(random.randint(0, len(summary_parts) - 1))

        # Always include the conclusion
        summary_parts.append(conclusion)

        # Join the parts into a complete summary
        summary = " ".join(summary_parts)

        logger.info(f"Generated summary: {summary[:100]}...")
        return summary


# Initialize the generator
def init_pdf_summary_generator(app):
    """Initialize the PDF summary generator with the application context"""
    upload_folder = app.config.get('UPLOAD_FOLDER', 'static/uploads')
    generator = PDFSummaryGenerator(upload_folder)
    app.config['PDF_SUMMARY_GENERATOR'] = generator
    return generator


# Get the generator instance
def get_pdf_summary_generator(app):
    """Get or create the PDF summary generator"""
    generator = app.config.get('PDF_SUMMARY_GENERATOR')
    if not generator:
        generator = init_pdf_summary_generator(app)
    return generator