import os
import re
import random
import logging
from flask import current_app
import PyPDF2  # For PDF text extraction

# Set up logging
logging.basicConfig(
    filename='pdf_summary.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PDFContentExtractor:
    """
    Extracts text content from PDF files and generates summaries
    based on the actual content of the documents
    """

    def __init__(self, upload_folder):
        """Initialize with the folder where PDFs are stored"""
        self.upload_folder = upload_folder

    def extract_text_from_pdf(self, pdf_filename):
        """Extract text content from a PDF file"""
        if not pdf_filename:
            return ""

        try:
            full_path = os.path.join(self.upload_folder, pdf_filename)
            if not os.path.exists(full_path):
                logger.error(f"PDF file not found: {full_path}")
                return ""

            text = ""
            with open(full_path, 'rb') as file:
                try:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page_num in range(len(pdf_reader.pages)):
                        page = pdf_reader.pages[page_num]
                        text += page.extract_text() + "\n"
                except Exception as e:
                    logger.error(f"Error extracting text from PDF page: {str(e)}")

            # Clean up the text
            text = re.sub(r'\s+', ' ', text)  # Replace multiple whitespace with single space
            text = text.strip()

            logger.info(f"Extracted {len(text)} characters from {pdf_filename}")
            return text

        except Exception as e:
            logger.error(f"Error processing PDF {pdf_filename}: {str(e)}")
            return ""

    def extract_key_phrases(self, text, count=5):
        """Extract key phrases from text content"""
        if not text or len(text) < 50:
            return []

        # Break text into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

        # Score sentences based on keywords
        keyword_indicators = [
            "experience", "skill", "expert", "proficient", "knowledge",
            "degree", "education", "qualification", "certified",
            "project", "developed", "created", "managed", "led",
            "teach", "instruct", "training", "mentor", "coach"
        ]

        scored_sentences = []
        for sentence in sentences:
            score = 0
            for keyword in keyword_indicators:
                if keyword.lower() in sentence.lower():
                    score += 1
            if score > 0:
                scored_sentences.append((sentence, score))

        # Sort by score and take top sentences
        sorted_sentences = sorted(scored_sentences, key=lambda x: x[1], reverse=True)
        top_sentences = [s[0] for s in sorted_sentences[:count]]

        # If we don't have enough keyword-based sentences, add some random ones
        if len(top_sentences) < count and len(sentences) > 0:
            random.shuffle(sentences)
            for sentence in sentences:
                if sentence not in top_sentences:
                    top_sentences.append(sentence)
                if len(top_sentences) >= count:
                    break

        return top_sentences

    def extract_skills(self, text):
        """Extract likely skills from text content"""
        if not text:
            return []

        # Common skill keywords to look for
        skill_keywords = [
            "programming", "java", "python", "javascript", "html", "css", "sql",
            "data analysis", "statistics", "machine learning", "algorithms",
            "research", "critical thinking", "problem solving", "teamwork",
            "leadership", "project management", "communication", "presentation",
            "teaching", "curriculum development", "instructional design",
            "assessment", "pedagogy", "mentoring", "training", "education"
        ]

        # Specialized skills by discipline
        specialized_skills = {
            "tech": ["software development", "web development", "mobile development",
                     "database", "cloud", "aws", "azure", "devops", "agile",
                     "cybersecurity", "networking", "systems administration"],
            "data": ["data science", "analytics", "big data", "visualization",
                     "tableau", "power bi", "excel", "r", "spss", "sas",
                     "statistical analysis", "predictive modeling"],
            "business": ["marketing", "sales", "finance", "accounting", "economics",
                         "management", "strategy", "operations", "consulting",
                         "customer service", "human resources", "crm"],
            "engineering": ["civil", "mechanical", "electrical", "industrial",
                            "chemical", "aerospace", "biomedical", "environmental",
                            "manufacturing", "robotics", "automation"],
            "science": ["research methodology", "lab techniques", "experiment design",
                        "data collection", "scientific writing", "hypothesis testing",
                        "biology", "chemistry", "physics", "environmental science"]
        }

        # Flatten specialized skills into one list
        all_possible_skills = skill_keywords.copy()
        for category in specialized_skills.values():
            all_possible_skills.extend(category)

        # Look for skills in the text
        found_skills = []
        text_lower = text.lower()

        for skill in all_possible_skills:
            if skill.lower() in text_lower:
                found_skills.append(skill)

        # Deduplicate and limit results
        found_skills = list(set(found_skills))
        random.shuffle(found_skills)  # Randomize to avoid always getting the same subset

        return found_skills[:10]  # Return up to 10 skills

    def extract_education(self, text):
        """Extract education information from text"""
        if not text:
            return []

        education_patterns = [
            r"(?:Ph\.?D\.?|Doctor\s+of\s+Philosophy)(?:\s+in\s+|\s+,\s+)?([^.,;:]+)",
            r"(?:Master(?:'|')?s|M\.?S\.?|M\.?A\.?|M\.?B\.?A\.?)(?:\s+in\s+|\s+,\s+)?([^.,;:]+)",
            r"(?:Bachelor(?:'|')?s|B\.?S\.?|B\.?A\.?)(?:\s+in\s+|\s+,\s+)?([^.,;:]+)"
        ]

        education = []
        text_lower = text.lower()

        # Check for degrees
        if re.search(r"ph\.?d|doctor\s+of\s+philosophy", text_lower):
            for pattern in education_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    if match.strip():
                        education.append(f"Ph.D. in {match.strip()}")
                        break
                if education:
                    break
            if not education:  # If no specific field found
                education.append("Ph.D.")

        elif re.search(r"master|mba|m\.a\.|m\.s\.", text_lower):
            for pattern in education_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    if match.strip():
                        education.append(f"Master's in {match.strip()}")
                        break
                if education:
                    break
            if not education:  # If no specific field found
                education.append("Master's degree")

        elif re.search(r"bachelor|b\.a\.|b\.s\.", text_lower):
            for pattern in education_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    if match.strip():
                        education.append(f"Bachelor's in {match.strip()}")
                        break
                if education:
                    break
            if not education:  # If no specific field found
                education.append("Bachelor's degree")

        return education

    def extract_experience_years(self, text):
        """Extract years of experience from text"""
        if not text:
            return None

        # Look for experience statements with years
        experience_patterns = [
            r"(\d+)\+?\s+years?\s+(?:of\s+)?experience",
            r"experience\s+(?:of\s+)?(\d+)\+?\s+years",
            r"worked\s+(?:for\s+)?(\d+)\+?\s+years"
        ]

        max_years = 0
        for pattern in experience_patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                years = int(match.replace('+', ''))
                max_years = max(max_years, years)

        return max_years if max_years > 0 else None

    def generate_summary(self, cv_path, cover_letter_path, interests=None):
        """
        Generate a summary based on the actual content of the CV and cover letter
        """
        # Extract text from both documents
        cv_text = self.extract_text_from_pdf(cv_path)
        cover_letter_text = self.extract_text_from_pdf(cover_letter_path)

        # Combine texts, giving priority to cover letter
        combined_text = f"{cover_letter_text}\n\n{cv_text}"

        # Extract key information
        key_phrases = self.extract_key_phrases(combined_text)
        skills = self.extract_skills(combined_text)
        education = self.extract_education(combined_text)
        experience_years = self.extract_experience_years(combined_text)

        # If we couldn't extract much content, fall back to template-based generation
        if not key_phrases and not skills and not education:
            return self.generate_fallback_summary(interests)

        # Build summary based on extracted content
        summary_parts = []

        # Add introduction based on education and experience
        if education:
            degree = education[0]
            if experience_years:
                summary_parts.append(f"A candidate with a {degree} and {experience_years}+ years of experience.")
            else:
                summary_parts.append(f"A candidate with a {degree} seeking opportunities in teaching.")
        elif experience_years:
            summary_parts.append(f"An experienced professional with {experience_years}+ years in the field.")
        else:
            summary_parts.append("A qualified candidate with relevant background and expertise.")

        # Add skills section
        if skills:
            random.shuffle(skills)  # Randomize for variety
            sample_size = min(5, len(skills))
            selected_skills = skills[:sample_size]
            summary_parts.append(
                f"Demonstrates proficiency in {', '.join(selected_skills[:-1])} and {selected_skills[-1]}.")

        # Add a key phrase or two
        if key_phrases:
            random.shuffle(key_phrases)  # Randomize for variety
            selected_phrase = key_phrases[0]
            # Clean up and shorten if needed
            if len(selected_phrase) > 120:
                selected_phrase = selected_phrase[:120] + "..."
            summary_parts.append(selected_phrase)

        # Add a conclusion based on interests
        if interests and len(interests) > 0:
            if len(interests) == 1:
                interest_text = interests[0]
            elif len(interests) == 2:
                interest_text = f"{interests[0]} and {interests[1]}"
            else:
                # Select 2 random interests
                random.shuffle(interests)
                interest_text = f"{interests[0]} and {interests[1]}"

            conclusion_phrases = [
                f"Well-positioned to contribute to teaching in {interest_text}.",
                f"Shows strong alignment with instructional needs in {interest_text}.",
                f"Brings valuable experience that would benefit students in {interest_text}.",
                f"Would be an effective instructor for courses in {interest_text}."
            ]
            summary_parts.append(random.choice(conclusion_phrases))

        # Combine all parts
        summary = " ".join(summary_parts)

        # Log and return
        logger.info(f"Generated content-based summary for {cv_path}")
        return summary

    def generate_fallback_summary(self, interests=None):
        """Generate a fallback summary when content extraction fails"""
        # Template phrases for different parts of the summary
        intro_phrases = [
            "A motivated candidate with experience in",
            "Experienced professional with background in",
            "Qualified individual with expertise in",
            "Dedicated professional specializing in",
            "Versatile candidate skilled in"
        ]

        skill_phrases = [
            "Demonstrates proficiency in",
            "Key skills include",
            "Shows particular strength in",
            "Notable capabilities in",
            "Possesses competencies in"
        ]

        teaching_phrases = [
            "Shows potential for effectively teaching",
            "Well-positioned to instruct students in",
            "Can bring practical experience to teaching",
            "Capable of delivering quality instruction in",
            "Would effectively engage students in"
        ]

        # Generic skills
        generic_skills = [
            "critical thinking and analysis",
            "effective communication and presentation",
            "curriculum development and assessment",
            "student engagement and mentoring",
            "research methodology and application",
            "problem-solving and analytical reasoning",
            "collaborative teamwork and leadership"
        ]

        # Build the summary
        summary_parts = []

        # Random introduction
        intro = random.choice(intro_phrases)
        discipline = "relevant academic areas"
        if interests and len(interests) > 0:
            discipline = interests[0]
        summary_parts.append(f"{intro} {discipline}.")

        # Skills section
        random.shuffle(generic_skills)
        selected_skills = generic_skills[:2]
        skill_phrase = random.choice(skill_phrases)
        summary_parts.append(f"{skill_phrase} {' and '.join(selected_skills)}.")

        # Teaching potential
        teaching_phrase = random.choice(teaching_phrases)
        if interests and len(interests) > 0:
            if len(interests) == 1:
                interest_text = interests[0]
            elif len(interests) == 2:
                interest_text = f"{interests[0]} and {interests[1]}"
            else:
                # Select 2 random interests
                random.shuffle(interests)
                interest_text = f"{interests[0]} and {interests[1]}"
            summary_parts.append(f"{teaching_phrase} {interest_text}.")
        else:
            summary_parts.append(f"{teaching_phrase} academic subjects aligned with their expertise.")

        # Combine all parts
        summary = " ".join(summary_parts)

        logger.info(f"Generated fallback summary (content extraction failed)")
        return summary


# Initialize the extractor
def init_pdf_extractor(app):
    """Initialize the PDF content extractor with the application context"""
    upload_folder = app.config.get('UPLOAD_FOLDER', 'static/uploads')
    extractor = PDFContentExtractor(upload_folder)
    app.config['PDF_CONTENT_EXTRACTOR'] = extractor
    return extractor


# Get the extractor instance
def get_pdf_extractor(app):
    """Get or create the PDF content extractor"""
    extractor = app.config.get('PDF_CONTENT_EXTRACTOR')
    if not extractor:
        extractor = init_pdf_extractor(app)
    return extractor