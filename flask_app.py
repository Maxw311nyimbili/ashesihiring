# =============================================================================
# IMPORTS AND CONFIGURATION
# =============================================================================
from flask import Flask, render_template, request, redirect, url_for, jsonify, session, send_file
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import base64
import os
import mysql.connector
import logging
import json
import requests
import PyPDF2
import docx
import io
import re

# Configure logging
logging.basicConfig(
    filename='form_debug.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding='utf-8',
)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.urandom(24)

# Configure upload folder
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Wit.ai configuration
WIT_AI_ACCESS_TOKEN = os.environ.get('WIT_AI_ACCESS_TOKEN', 'YOUR_WIT_AI_ACCESS_TOKEN')
WIT_AI_API_URL = 'https://api.wit.ai/message'

# =============================================================================
# FILE PROCESSING AND AI FUNCTIONS
# =============================================================================

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file."""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
    except Exception as e:
        logging.error(f"Error extracting text from PDF: {str(e)}")
        return ""

def extract_text_from_docx(file_path):
    """Extract text from a DOCX file."""
    try:
        doc = docx.Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        logging.error(f"Error extracting text from DOCX: {str(e)}")
        return ""

def extract_text_from_file(file_path):
    """Extract text from a file based on its extension."""
    if file_path.lower().endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    elif file_path.lower().endswith('.docx'):
        return extract_text_from_docx(file_path)
    else:
        logging.warning(f"Unsupported file type: {file_path}")
        return ""

def generate_summary_with_wit_ai(text):
    """Generate a summary using Wit.ai API."""
    try:
        headers = {
            'Authorization': f'Bearer {WIT_AI_ACCESS_TOKEN}',
            'Content-Type': 'application/json'
        }
        
        # Prepare the text for analysis
        # Limit text length to avoid API limits
        text = text[:5000]  # Adjust this limit based on Wit.ai's requirements
        
        # Make the API request
        response = requests.post(
            WIT_AI_API_URL,
            headers=headers,
            json={'text': text}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract relevant information from Wit.ai response
            # This will depend on how you've trained your Wit.ai model
            entities = data.get('entities', {})
            
            # Example: Extract key skills, experience, education
            skills = entities.get('skill', [])
            experience = entities.get('experience', [])
            education = entities.get('education', [])
            
            # Construct a summary
            summary_parts = []
            
            if skills:
                summary_parts.append(f"Skills: {', '.join([s['value'] for s in skills])}")
            
            if experience:
                summary_parts.append(f"Experience: {', '.join([e['value'] for e in experience])}")
            
            if education:
                summary_parts.append(f"Education: {', '.join([e['value'] for e in education])}")
            
            if summary_parts:
                return " | ".join(summary_parts)
            else:
                # Fallback to a simple summary if no entities were found
                return text[:200] + "..." if len(text) > 200 else text
        else:
            logging.error(f"Wit.ai API error: {response.status_code} - {response.text}")
            return text[:200] + "..." if len(text) > 200 else text
    except Exception as e:
        logging.error(f"Error generating summary with Wit.ai: {str(e)}")
        return text[:200] + "..." if len(text) > 200 else text

# =============================================================================
# DATABASE CONNECTION
# =============================================================================
def get_db_connection():
    return mysql.connector.connect(
        host='ashesihiring.mysql.pythonanywhere-services.com',
        user='ashesihiring',
        password='beginninghiring2002',
        database="ashesihiring$default"
    )

# =============================================================================
# AUTHENTICATION FUNCTIONS
# =============================================================================
def hash_password(password: str, salt: bytes) -> str:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode())).decode()

def verify_password(stored_password: str, password: str, salt: bytes) -> bool:
    hashed_attempt = hash_password(password, salt)
    app.logger.debug(f"Stored hashed password: {stored_password}")
    app.logger.debug(f"Hashed password attempt: {hashed_attempt}")
    return stored_password == hashed_attempt

# =============================================================================
# AUTHENTICATION ROUTES
# =============================================================================
@app.route('/faculty_signup', methods=['GET', 'POST'])
def faculty_signup():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        salt = os.urandom(16)
        hashed_password = hash_password(password, salt)

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO faculty_users (username, email, password_hash, salt) VALUES (%s, %s, %s, %s)",
            (username, email, hashed_password, base64.b64encode(salt).decode())
        )
        conn.commit()
        conn.close()

        return redirect(url_for('faculty_login'))

    return render_template('faculty_signup.html')

@app.route('/faculty-login', methods=['GET', 'POST'])
def faculty_login():
    faculty_debug = None

    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            cursor.execute("SELECT id, username, password_hash, salt FROM faculty_users WHERE email = %s", (email,))
            faculty = cursor.fetchone()

            if faculty:
                salt_encoded = faculty["salt"]

                try:
                    salt = base64.b64decode(salt_encoded)
                except Exception:
                    return jsonify({
                        "error": "Invalid Base64 salt stored in database.",
                        "faculty": faculty
                    })

                faculty_debug = {
                    "id": faculty["id"],
                    "username": faculty["username"],
                    "stored_password": faculty["password_hash"],
                    "decoded_salt": salt_encoded,
                    "rehashed_password": hash_password(password, salt)
                }

                if verify_password(faculty['password_hash'], password, salt):
                    session['faculty_id'] = faculty['id']
                    session['faculty_name'] = faculty['username']
                    return redirect(url_for('faculty_dashboard'))
                else:
                    return render_template('faculty_login.html', login_error="Invalid login credentials",
                                           faculty_debug=faculty_debug)
            else:
                return render_template('faculty_login.html', login_error="Invalid login credentials")

        except Exception as e:
            return jsonify({"error": str(e)})

        finally:
            cursor.close()
            conn.close()

    return render_template('faculty_login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    session.pop('role', None)
    session.pop('logged_in', None)
    return redirect(url_for('login'))

# =============================================================================
# PAGE ROUTES
# =============================================================================
@app.route('/')
def index():
    return render_template('landing_page.html')

@app.route('/demo')
def demo():
    return render_template('demo.html')

@app.route('/faculty_dashboard')
def faculty_dashboard():
    faculty_name = session.get('faculty_name', 'Unknown')
    return render_template('faculty_dashboard.html', faculty_name=faculty_name)

@app.route('/candidate')
def candidate_page():
    return render_template('candidate.html')

@app.route('/faculty_scheduling')
def faculty_scheduling():
    return render_template('faculty_scheduling.html')

@app.route('/admin_dashboard')
def admin_dashboard():
    return render_template('admin_dashboard.html')

# =============================================================================
# APPLICATION SUBMISSION
# =============================================================================
@app.route('/submit', methods=['POST'])
def submit_application():
    first_name = request.form.get('first-name')
    last_name = request.form.get('last-name')
    telephone = request.form.get('telephone')
    gender = request.form.get('gender')
    course_selection = request.form.get('course_selection_id')

    cv = request.files.get('cv')
    cover_letter = request.files.get('cover_letter')
    transcript = request.files.get('transcript')

    def save_file(file, folder):
        if file and file.filename:
            path = os.path.join(folder, file.filename)
            file.save(path)
            return path
        return None

    cv_path = save_file(cv, app.config['UPLOAD_FOLDER'])
    cover_letter_path = save_file(cover_letter, app.config['UPLOAD_FOLDER'])
    transcript_path = save_file(transcript, app.config['UPLOAD_FOLDER'])

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO applicants (first_name, last_name, telephone, gender, course_selection, cv_path, cover_letter_path, transcript_path) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (first_name, last_name, telephone, gender, course_selection, cv_path, cover_letter_path, transcript_path))
    applicant_id = cursor.lastrowid
    conn.commit()

    for course in request.form.keys():
        if course.startswith("preference_"):
            course_name = course.replace("preference_", "").replace("_", " ")
            preference = request.form.get(course)
            cursor.execute("""
                INSERT INTO course_preferences (applicant_id, course_name, preference) 
                VALUES (%s, %s, %s)
            """, (applicant_id, course_name, preference))

    conn.commit()
    cursor.close()
    conn.close()

    return redirect('/candidate')

# =============================================================================
# CANDIDATE API ROUTES
# =============================================================================
@app.route('/json/candidates')
def serve_candidates_json():
    try:
        with open("candidates.json", "r") as json_file:
            data = json.load(json_file)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "JSON file not found"}), 404

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    """Get all candidates with their details."""
    try:
        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Query to get all applicants with their details
        query = """
            SELECT 
                a.id,
                a.first_name,
                a.last_name,
                a.telephone,
                a.gender,
                a.course_selection,
                a.cv_path,
                a.cover_letter_path,
                a.transcript_path,
                a.created_at
            FROM 
                applicants a
            ORDER BY 
                a.created_at DESC
        """
        
        cursor.execute(query)
        applicants = cursor.fetchall()
        
        # Process each applicant
        candidates = []
        for applicant in applicants:
            # Generate AI summary from CV
            cv_text = ""
            if applicant['cv_path']:
                cv_text = extract_text_from_file(applicant['cv_path'])
            
            # Generate summary using Wit.ai
            ai_summary = generate_summary_with_wit_ai(cv_text) if cv_text else "No CV available for analysis."
            
            # Create candidate details
            candidate = {
                'id': applicant['id'],
                'name': f"{applicant['first_name']} {applicant['last_name']}",
                'email': None,  # Not in the applicants table
                'phone': applicant['telephone'],
                'cv_link': f"{base_url}{applicant['cv_path']}" if applicant['cv_path'] else None,
                'cover_letter_link': f"{base_url}{applicant['cover_letter_path']}" if applicant['cover_letter_path'] else None,
                'transcript_link': f"{base_url}{applicant['transcript_path']}" if applicant['transcript_path'] else None,
                'created_at': applicant['created_at'].strftime('%Y-%m-%d %H:%M:%S'),
                'status': applicant.get('status', 'Pending'),  # Default to 'Pending' if not in the table
                'rating': applicant.get('rating', None),  # Default to None if not in the table
                'comment': applicant.get('comment', None),  # Default to None if not in the table
                'interest_prompt': applicant.get('interest_prompt', None),  # Default to None if not in the table
                'interest_response': applicant.get('interest_response', None),  # Default to None if not in the table
                'ai_summary': ai_summary
            }
            
            candidates.append(candidate)
        
        # Close database connection
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'candidates': candidates
        })
    except Exception as e:
        logging.error(f"Error getting candidates: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get candidates'
        }), 500

# Add a new route to serve files publicly
@app.route('/download_file/')
def download_file():
    file_path = request.args.get('file')
    if not file_path:
        app.logger.error('No file specified in download_file request')
        return "No file specified", 400
    
    # Security check to prevent directory traversal
    if '..' in file_path or file_path.startswith('/'):
        app.logger.error(f'Invalid file path in download_file request: {file_path}')
        return "Invalid file path", 403
    
    # Log the file path for debugging
    app.logger.info(f'Attempting to serve file: {file_path}')
    
    # Get the filename from the path
    filename = os.path.basename(file_path)
    app.logger.info(f'Extracted filename: {filename}')
    
    # Construct the full path - try both the direct path and the uploads folder
    full_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    app.logger.info(f'Looking for file at: {full_path}')
    
    # Check if file exists
    if not os.path.exists(full_path):
        app.logger.error(f'File not found at: {full_path}')
        return "File not found", 404
    
    # Determine the MIME type based on file extension
    mime_type = 'application/octet-stream'  # Default
    if filename.endswith('.pdf'):
        mime_type = 'application/pdf'
    elif filename.endswith('.doc') or filename.endswith('.docx'):
        mime_type = 'application/msword'
    elif filename.endswith('.txt'):
        mime_type = 'text/plain'
    
    app.logger.info(f'Serving file: {filename} with MIME type: {mime_type}')
    
    # Return the file for inline viewing instead of forcing download
    return send_file(
        full_path, 
        mimetype=mime_type, 
        as_attachment=False,  # Set to False to allow inline viewing
        download_name=filename
    )

# =============================================================================
# COMMENT AND RATING ROUTES
# =============================================================================
@app.route('/add_comment', methods=['POST'])
def add_comment():
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No data provided.'}), 400

    if 'faculty_id' not in session:
        return jsonify({'success': False, 'message': 'You must be logged in to comment.'}), 403

    user_id = session.get("faculty_id")
    application_id = data.get('application_id')
    rating = int(data.get('rating'))
    interest_prompt = data.get('interest_prompt')
    comment_text = data.get('comment')

    if not application_id or rating is None or not interest_prompt:
        return jsonify({'success': False, 'message': 'Application ID, Rating, and Interest Prompt are required.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if rating >= 4:
            cursor.execute("""
                INSERT INTO comments (application_id, rating, faculty_id, interest_prompt, comment)
                VALUES (%s, %s, %s, NULL, NULL)
            """, (application_id, rating, user_id))
        else:
            if not interest_prompt or not comment_text:
                return jsonify({'success': False, 'message': 'Interest Prompt and Comment are required for ratings below 4.'}), 400

            cursor.execute("""
                INSERT INTO comments (application_id, rating, interest_prompt, comment, faculty_id)
                VALUES (%s, %s, %s, %s, %s)
            """, (application_id, rating, interest_prompt, comment_text, user_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': 'Comment added successfully.'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route('/get_comments', methods=['GET'])
def get_comments():
    application_id = request.args.get('application_id')

    if not application_id:
        app.logger.error('Missing application_id in request')
        return jsonify({'success': False, 'message': 'Application ID is required.'}), 400

    try:
        # Validate that application_id is a valid integer
        application_id = int(application_id)
    except (TypeError, ValueError):
        app.logger.error(f'Invalid application_id format: {application_id}')
        return jsonify({'success': False, 'message': 'Invalid application ID format.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # First check if the application exists
        cursor.execute("SELECT id FROM applicants WHERE id = %s", (application_id,))
        application = cursor.fetchone()
        
        if not application:
            app.logger.error(f'Application not found with ID: {application_id}')
            return jsonify({'success': False, 'message': 'Application not found.'}), 404

        # Get the rating for this application
        cursor.execute("""
            SELECT rating, interest_prompt
            FROM comments
            WHERE application_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (application_id,))
        
        rating_data = cursor.fetchone()
        
        # Get all comments for this application
        cursor.execute("""
            SELECT 
                c.id, 
                c.application_id, 
                c.rating, 
                c.interest_prompt, 
                c.created_at AS timestamp,
                c.comment, 
                f.username AS faculty_name
            FROM comments c
            JOIN faculty_users f ON c.faculty_id = f.id
            WHERE c.application_id = %s
            ORDER BY c.created_at DESC;
        """, (application_id,))

        comments = cursor.fetchall()
        cursor.close()
        conn.close()

        # Prepare the response
        response = {
            'success': True,
            'comments': comments
        }
        
        # Add rating data if available
        if rating_data:
            response['rating'] = rating_data['rating']
            response['interest_prompt'] = rating_data['interest_prompt']
            
            # Check if the current user has commented
            current_user = session.get('faculty_name')
            if current_user:
                user_comments = [c for c in comments if c['faculty_name'] == current_user]
                response['has_comments'] = len(user_comments) > 0
        
        return jsonify(response)
    except Exception as e:
        app.logger.error(f'Error fetching comments for application_id {application_id}: {str(e)}')
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route('/comment', methods=['PUT'])
def update_comment():
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No data provided.'}), 400

    user_id = session.get("faculty_id")
    comment_id = data.get('comment_id')
    rating = data.get('rating')
    interest_prompt = data.get('interest_prompt')
    updated_comment = data.get('comment')

    if not comment_id or rating is None or not interest_prompt:
        return jsonify({'success': False, 'message': 'Comment ID, Rating, and Interest Prompt are required.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id FROM comments WHERE id = %s
        """, (comment_id,))
        result = cursor.fetchone()

        if not result:
            return jsonify({'success': False, 'message': 'Comment not found.'}), 404

        cursor.execute("""
            UPDATE comments SET rating = %s, interest_prompt = %s, comment = %s, faculty_id = %s WHERE id = %s
        """, (rating, interest_prompt, updated_comment, user_id, comment_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': 'Comment updated successfully.'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route('/delete_comment', methods=['POST'])
def delete_comment():
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No data provided.'}), 400

    comment_id = data.get('comment_id')

    if not comment_id:
        return jsonify({'success': False, 'message': 'Comment ID is required.'}), 400

    if 'faculty_id' not in session:
        return jsonify({'success': False, 'message': 'You must be logged in to delete a comment.'}), 403

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM comments WHERE id = %s", (comment_id,))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': 'Comment deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route('/submit_rating', methods=['POST'])
def submit_rating():
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No data provided.'}), 400

    application_id = data.get('application_id')
    rating = data.get('rating')

    if not application_id or rating is None:
        return jsonify({'success': False, 'message': 'Application ID and Rating are required.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM comments WHERE application_id = %s", (application_id,))
        existing_comment = cursor.fetchone()

        if existing_comment:
            cursor.execute("UPDATE comments SET rating = %s WHERE application_id = %s", (rating, application_id))
        else:
            cursor.execute("INSERT INTO comments (application_id, rating) VALUES (%s, %s)", (application_id, rating))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': 'Rating processed successfully.'})

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route('/rate_candidate', methods=['POST'])
def rate_candidate():
    data = request.get_json()

    if not data:
        app.logger.error('No data provided in rate_candidate request')
        return jsonify({'success': False, 'message': 'No data provided.'}), 400

    if 'faculty_id' not in session:
        app.logger.error('User not logged in for rate_candidate request')
        return jsonify({'success': False, 'message': 'You must be logged in to rate a candidate.'}), 403

    application_id = data.get('application_id')
    rating = data.get('rating')
    interest_prompt = data.get('interest_prompt')
    comment = data.get('comment')

    if not application_id:
        app.logger.error('Missing application_id in rate_candidate request')
        return jsonify({'success': False, 'message': 'Application ID is required.'}), 400

    if rating is None:
        app.logger.error('Missing rating in rate_candidate request')
        return jsonify({'success': False, 'message': 'Rating is required.'}), 400

    try:
        # Validate that application_id is a valid integer
        application_id = int(application_id)
        # Validate that rating is a valid integer between 1 and 5
        rating = int(rating)
        if rating < 1 or rating > 5:
            app.logger.error(f'Invalid rating value: {rating}')
            return jsonify({'success': False, 'message': 'Rating must be between 1 and 5.'}), 400
    except (TypeError, ValueError):
        app.logger.error(f'Invalid application_id or rating format: {application_id}, {rating}')
        return jsonify({'success': False, 'message': 'Invalid application ID or rating format.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # First check if the application exists
        cursor.execute("SELECT id FROM applicants WHERE id = %s", (application_id,))
        application = cursor.fetchone()
        
        if not application:
            app.logger.error(f'Application not found with ID: {application_id}')
            return jsonify({'success': False, 'message': 'Application not found.'}), 404

        # Check if the faculty has already rated this candidate
        faculty_id = session['faculty_id']
        cursor.execute("""
            SELECT id FROM comments 
            WHERE application_id = %s AND faculty_id = %s
        """, (application_id, faculty_id))
        
        existing_comment = cursor.fetchone()

        if existing_comment:
            # Update existing comment
            cursor.execute("""
                UPDATE comments 
                SET rating = %s, interest_prompt = %s, comment = %s, updated_at = NOW()
                WHERE id = %s
            """, (rating, interest_prompt, comment, existing_comment['id']))
            app.logger.info(f'Updated rating for application {application_id} by faculty {faculty_id}')
        else:
            # Insert new comment
            cursor.execute("""
                INSERT INTO comments (application_id, faculty_id, rating, interest_prompt, comment)
                VALUES (%s, %s, %s, %s, %s)
            """, (application_id, faculty_id, rating, interest_prompt, comment))
            app.logger.info(f'Added new rating for application {application_id} by faculty {faculty_id}')

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': 'Rating submitted successfully.'})
    except Exception as e:
        app.logger.error(f'Error processing rating for application_id {application_id}: {str(e)}')
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# =============================================================================
# INTERVIEW SCHEDULING ROUTES
# =============================================================================
@app.route('/get_shortlisted_applicants')
def get_shortlisted_applicants():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT a.id, CONCAT(a.first_name, ' ', a.last_name) AS name, c.rating, c.interest_prompt, c.comment
        FROM applicants a 
        JOIN comments c ON a.id = c.application_id
        WHERE c.rating >= 4 OR c.interest_prompt = 'Yes';
    """)
    applicants = cur.fetchall()
    conn.close()
    return jsonify([dict(row) for row in applicants])

@app.route('/schedule_interview', methods=['POST'])
def schedule_interview():
    if 'faculty_id' not in session:
        return jsonify({"message": "Unauthorized"}), 403

    data = request.json
    applicant_id = data.get("applicant_id")
    interview_date = data.get("date")
    faculty_id = session["faculty_id"]

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("INSERT INTO interviews (applicant_id, faculty_id, interview_date) VALUES (%s, %s, %s)",
                (applicant_id, faculty_id, interview_date))
    conn.commit()
    conn.close()

    return jsonify({"message": "Interview scheduled successfully!"})

@app.route('/get_scheduled_interviews')
def get_scheduled_interviews():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT 
            i.applicant_id,
            i.interview_date, 
            f.username AS faculty_name, f.email,
            CONCAT(a.first_name, ' ', a.last_name) AS applicant_name,
            cp.course_name,
            cp.preference
        FROM interviews i
        JOIN faculty_users f ON i.faculty_id = f.id
        JOIN applicants a ON i.applicant_id = a.id
        LEFT JOIN course_preferences cp ON a.id = cp.applicant_id
        ORDER BY i.interview_date;
    """)

    interviews = cur.fetchall()
    conn.close()
    return jsonify(interviews)

# =============================================================================
# MAIN APPLICATION ENTRY POINT
# =============================================================================
if __name__ == '__main__':
    app.run(debug=True)
