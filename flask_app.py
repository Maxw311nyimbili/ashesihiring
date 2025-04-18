# =============================================================================
# IMPORTS AND CONFIGURATION
# =============================================================================
from pdf_summary_extractor import init_pdf_extractor, get_pdf_extractor
from flask import Flask, render_template, request, redirect, url_for, jsonify, session, send_file
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import base64
import os
import mysql.connector
import logging
import json

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

# Initialize the PDF summary generator when the app starts
@app.before_first_request
def setup_pdf_extractor():
    """Initialize the PDF content extractor before the first request"""
    try:
        init_pdf_extractor(app)
        app.logger.info("PDF content extractor initialized successfully")
    except Exception as e:
        app.logger.error(f"Error initializing PDF content extractor: {str(e)}")


@app.route('/json/candidates')
def serve_candidates_json():
    try:
        with open("candidates.json", "r") as json_file:
            data = json.load(json_file)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "JSON file not found"}), 404


# Updated get_candidates route to include AI summary generation
@app.route('/api/candidates')
def get_candidates():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, first_name, last_name, telephone, gender, course_selection, 
                   cv_path, cover_letter_path, transcript_path 
            FROM applicants
        """)
        applicants = cursor.fetchall()

        candidates = []
        base_url = "/download_file/"

        # Get the PDF content extractor
        extractor = get_pdf_extractor(app)

        for applicant in applicants:
            cursor.execute("SELECT course_name FROM course_preferences WHERE applicant_id = %s", (applicant["id"],))
            interests = [row["course_name"] for row in cursor.fetchall()]

            # Extract just the filename from the paths
            cv_filename = os.path.basename(applicant['cv_path']) if applicant['cv_path'] else None
            cover_letter_filename = os.path.basename(applicant['cover_letter_path']) if applicant[
                'cover_letter_path'] else None
            transcript_filename = os.path.basename(applicant['transcript_path']) if applicant[
                'transcript_path'] else None

            # Log the filenames for debugging
            app.logger.info(f"CV filename: {cv_filename}")
            app.logger.info(f"Cover letter filename: {cover_letter_filename}")
            app.logger.info(f"Transcript filename: {transcript_filename}")

            # Generate content-based AI summary using the PDF extractor
            is_fallback = False
            try:
                # Create the summary based on the actual PDF content
                ai_summary = extractor.generate_summary(cv_filename, cover_letter_filename, interests)
                app.logger.info(f"Generated content-based summary for candidate {applicant['id']}")
            except Exception as e:
                app.logger.error(f"Error generating content-based summary: {str(e)}")
                # Fallback to a template-based summary if content extraction fails
                ai_summary = extractor.generate_fallback_summary(interests)
                is_fallback = True
                app.logger.info(f"Using fallback summary for candidate {applicant['id']}")

            candidates.append({
                "name": f"{applicant['first_name']} {applicant['last_name']}",
                "id": applicant['id'],
                "summary": ai_summary,
                "is_fallback": is_fallback,
                "details": f"""
                    <a href='{base_url}?file={cv_filename}' target='_blank'><i class="fas fa-file-pdf"></i> Resume</a> | 
                    <a href='{base_url}?file={cover_letter_filename}' target='_blank'><i class="fas fa-file-alt"></i> Cover Letter</a> | 
                    <a href='{base_url}?file={transcript_filename}' target='_blank'><i class="fas fa-file-contract"></i> Transcript</a>
                """,
                "interests": interests
            })

        cursor.close()
        conn.close()

        with open("candidates.json", "w") as json_file:
            json.dump(candidates, json_file, indent=4)

        return jsonify(candidates)

    except mysql.connector.Error as err:
        error_response = {"error": str(err)}
        with open("error_log.json", "w") as json_file:
            json.dump(error_response, json_file, indent=4)
        return jsonify(error_response), 500
    except Exception as e:
        app.logger.error(f"Unexpected error in get_candidates: {str(e)}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred"}), 500


@app.route('/check_pdf_extraction')
def check_pdf_extraction():
    """Detailed PDF extraction check for a specific candidate"""
    application_id = request.args.get('application_id')

    if not application_id:
        return jsonify({"error": "Application ID is required"}), 400

    try:
        # Get the candidate's information
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, first_name, last_name, cv_path, cover_letter_path
            FROM applicants
            WHERE id = %s
        """, (application_id,))

        applicant = cursor.fetchone()

        if not applicant:
            return jsonify({"error": "Applicant not found"}), 404

        # Get the candidate's interests
        cursor.execute("SELECT course_name FROM course_preferences WHERE applicant_id = %s", (application_id,))
        interests = [row["course_name"] for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        # Extract just the filename from the paths
        cv_filename = os.path.basename(applicant['cv_path']) if applicant['cv_path'] else None
        cover_letter_filename = os.path.basename(applicant['cover_letter_path']) if applicant['cover_letter_path'] else None

        # Get the PDF content extractor
        extractor = get_pdf_extractor(app)

        # Check if files exist
        cv_exists = False
        cover_letter_exists = False

        if cv_filename:
            cv_path = os.path.join(app.config['UPLOAD_FOLDER'], cv_filename)
            cv_exists = os.path.exists(cv_path)

        if cover_letter_filename:
            cover_letter_path = os.path.join(app.config['UPLOAD_FOLDER'], cover_letter_filename)
            cover_letter_exists = os.path.exists(cover_letter_path)

        # Try to extract text from the files
        cv_text = ""
        cover_letter_text = ""
        cv_error = None
        cover_letter_error = None

        if cv_exists:
            try:
                cv_text = extractor.extract_text_from_pdf(cv_filename)
            except Exception as e:
                cv_error = str(e)

        if cover_letter_exists:
            try:
                cover_letter_text = extractor.extract_text_from_pdf(cover_letter_filename)
            except Exception as e:
                cover_letter_error = str(e)

        # Check if we can extract key information
        combined_text = f"{cover_letter_text}\n\n{cv_text}"

        # Extract detailed information for the report
        key_phrases = []
        skills = []
        education = []
        experience_years = None

        try:
            key_phrases = extractor.extract_key_phrases(combined_text)
            skills = extractor.extract_skills(combined_text)
            education = extractor.extract_education(combined_text)
            experience_years = extractor.extract_experience_years(combined_text)
        except Exception as e:
            app.logger.error(f"Error extracting details: {str(e)}")

        # Determine if we would use a fallback summary
        would_use_fallback = not (key_phrases or skills or education)

        # Extract sample text for preview (up to 300 chars)
        cv_preview = cv_text[:300] + "..." if len(cv_text) > 300 else cv_text
        cover_letter_preview = cover_letter_text[:300] + "..." if len(cover_letter_text) > 300 else cover_letter_text

        return jsonify({
            "applicant": {
                "id": applicant['id'],
                "name": f"{applicant['first_name']} {applicant['last_name']}",
                "interests": interests
            },
            "files": {
                "cv": {
                    "filename": cv_filename,
                    "exists": cv_exists,
                    "path": os.path.join(app.config['UPLOAD_FOLDER'], cv_filename) if cv_filename else None,
                    "error": cv_error,
                    "text_length": len(cv_text) if cv_text else 0,
                    "preview": cv_preview if cv_text else ""
                },
                "cover_letter": {
                    "filename": cover_letter_filename,
                    "exists": cover_letter_exists,
                    "path": os.path.join(app.config['UPLOAD_FOLDER'],
                                         cover_letter_filename) if cover_letter_filename else None,
                    "error": cover_letter_error,
                    "text_length": len(cover_letter_text) if cover_letter_text else 0,
                    "preview": cover_letter_preview if cover_letter_text else ""
                }
            },
            "extraction": {
                "key_phrases_count": len(key_phrases),
                "sample_key_phrases": key_phrases[:3] if key_phrases else [],
                "skills_count": len(skills),
                "sample_skills": skills[:5] if skills else [],
                "education_count": len(education),
                "education_details": education if education else [],
                "experience_years": experience_years,
                "would_use_fallback": would_use_fallback,
                "reason": "Insufficient content extracted from documents" if would_use_fallback else "Sufficient content available for summary generation"
            }
        })

    except Exception as e:
        app.logger.error(f"Error checking PDF extraction: {str(e)}")
        return jsonify({"error": str(e)}), 500

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
        cursor.execute("SELECT id FROM applications WHERE id = %s", (application_id,))
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


# Add these routes to your existing flask_app.py

# =============================================================================
# INTERVIEW SCHEDULING ROUTES
# =============================================================================

@app.route('/faculty_scheduling')
def faculty_scheduling():
    """Render the faculty scheduling page."""
    if 'faculty_id' not in session:
        return redirect(url_for('faculty_login'))

    faculty_name = session.get('faculty_name', 'Unknown')

    # Get current date for min date attribute
    from datetime import datetime, timedelta
    today = datetime.now().strftime('%Y-%m-%d')

    return render_template('faculty_scheduling.html',
                           faculty_name=faculty_name,
                           min_date=today)


# New endpoint name to avoid conflict
@app.route('/api/faculty_rated_applicants')
def faculty_rated_applicants():
    """API to get applicants that the current faculty has rated."""
    if 'faculty_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    faculty_id = session.get('faculty_id')

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get applicants that this faculty has rated
        cursor.execute("""
            SELECT 
                a.id, 
                CONCAT(a.first_name, ' ', a.last_name) AS name, 
                c.rating, 
                c.interest_prompt, 
                c.comment
            FROM applicants a 
            JOIN comments c ON a.id = c.application_id
            WHERE c.faculty_id = %s
            ORDER BY c.rating DESC, a.first_name
        """, (faculty_id,))

        applicants = cursor.fetchall()

        # For each applicant, get their course interests
        for applicant in applicants:
            cursor.execute("""
                SELECT course_name
                FROM course_preferences
                WHERE applicant_id = %s
            """, (applicant['id'],))

            interests = [row['course_name'] for row in cursor.fetchall()]
            applicant['interests'] = interests

        conn.close()
        return jsonify(applicants)

    except Exception as e:
        app.logger.error(f"Error getting shortlisted applicants: {str(e)}")
        return jsonify({"error": str(e)}), 500


# New endpoint name to avoid conflict
@app.route('/api/create_interview', methods=['POST'])
def create_interview():
    """API to schedule an interview with an applicant."""
    if 'faculty_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    applicant_id = data.get("applicant_id")
    interview_date = data.get("date")
    faculty_id = session.get("faculty_id")

    if not applicant_id or not interview_date:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if this applicant is already scheduled with this faculty
        cursor.execute("""
            SELECT id
            FROM interviews
            WHERE applicant_id = %s AND faculty_id = %s
        """, (applicant_id, faculty_id))

        existing = cursor.fetchone()

        if existing:
            # Update existing interview
            cursor.execute("""
                UPDATE interviews
                SET interview_date = %s
                WHERE applicant_id = %s AND faculty_id = %s
            """, (interview_date, applicant_id, faculty_id))
            message = "Interview updated successfully"
        else:
            # Create new interview
            cursor.execute("""
                INSERT INTO interviews (applicant_id, faculty_id, interview_date)
                VALUES (%s, %s, %s)
            """, (applicant_id, faculty_id, interview_date))
            message = "Interview scheduled successfully"

        conn.commit()
        conn.close()

        return jsonify({"message": message})

    except Exception as e:
        app.logger.error(f"Error scheduling interview: {str(e)}")
        return jsonify({"error": str(e)}), 500


# New endpoint name to avoid conflict
@app.route('/api/faculty_interviews')
def faculty_interviews():
    """API to get all scheduled interviews."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get all scheduled interviews with details
        cursor.execute("""
            SELECT 
                i.id,
                i.applicant_id,
                i.faculty_id,
                i.interview_date, 
                f.username AS faculty_name, 
                f.email,
                CONCAT(a.first_name, ' ', a.last_name) AS applicant_name,
                cp.course_name,
                cp.preference
            FROM interviews i
            JOIN faculty_users f ON i.faculty_id = f.id
            JOIN applicants a ON i.applicant_id = a.id
            LEFT JOIN course_preferences cp ON a.id = cp.applicant_id
            ORDER BY i.interview_date, f.username
        """)

        interviews = cursor.fetchall()
        conn.close()

        return jsonify(interviews)

    except Exception as e:
        app.logger.error(f"Error getting scheduled interviews: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/update_faculty_schedule', methods=['POST'])
def update_faculty_schedule():
    """API to update a faculty's interview schedule date."""
    if 'faculty_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    new_date = data.get("new_date")
    old_date = data.get("old_date")
    faculty_id = session.get("faculty_id")

    if not new_date:
        return jsonify({"error": "Missing new date"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Update all interviews for this faculty to the new date
        if old_date:
            cursor.execute("""
                UPDATE interviews
                SET interview_date = %s
                WHERE faculty_id = %s AND interview_date = %s
            """, (new_date, faculty_id, old_date))
        else:
            cursor.execute("""
                UPDATE interviews
                SET interview_date = %s
                WHERE faculty_id = %s
            """, (new_date, faculty_id))

        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Schedule updated successfully"})

    except Exception as e:
        app.logger.error(f"Error updating faculty schedule: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/delete_faculty_schedule', methods=['POST'])
def delete_faculty_schedule():
    """API to delete all interviews for a faculty."""
    if 'faculty_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    date = data.get("date")
    faculty_id = session.get("faculty_id")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Delete all interviews for this faculty
        if date:
            cursor.execute("""
                DELETE FROM interviews
                WHERE faculty_id = %s AND interview_date = %s
            """, (faculty_id, date))
        else:
            cursor.execute("""
                DELETE FROM interviews
                WHERE faculty_id = %s
            """, (faculty_id,))

        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Schedule deleted successfully"})

    except Exception as e:
        app.logger.error(f"Error deleting faculty schedule: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/remove_from_schedule', methods=['POST'])
def remove_from_schedule():
    """API to remove a specific candidate from the schedule."""
    if 'faculty_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    applicant_id = data.get("applicant_id")
    faculty_id = session.get("faculty_id")

    if not applicant_id:
        return jsonify({"error": "Missing applicant ID"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Delete the specific interview
        cursor.execute("""
            DELETE FROM interviews
            WHERE applicant_id = %s AND faculty_id = %s
        """, (applicant_id, faculty_id))

        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Candidate removed from schedule"})

    except Exception as e:
        app.logger.error(f"Error removing candidate from schedule: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# MAIN APPLICATION ENTRY POINT
# =============================================================================
if __name__ == '__main__':
    app.run(debug=True)