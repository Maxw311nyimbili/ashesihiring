from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import base64
import os
import mysql.connector
import logging


# Configure logging
logging.basicConfig(
    filename='form_debug.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding='utf-8',  # Ensure correct encoding
)

app = Flask(__name__)
app.secret_key = os.urandom(24)


# Configure upload folder
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def get_db_connection():
    return mysql.connector.connect(
        host='ashesihiring.mysql.pythonanywhere-services.com',
        user='ashesihiring',
        password='beginninghiring2002',
        database="ashesihiring$default"
    )


# Login and Sign up
# Password hashing using cryptography (PBKDF2)
def hash_password(password: str, salt: bytes) -> str:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode())).decode()


# Verify password with the stored hash
def verify_password(stored_password: str, password: str, salt: bytes) -> bool:
    # Log hashed attempts to ensure the verification works correctly
    hashed_attempt = hash_password(password, salt)
    app.logger.debug(f"Stored hashed password: {stored_password}")
    app.logger.debug(f"Hashed password attempt: {hashed_attempt}")
    return stored_password == hashed_attempt

@app.route('/faculty_signup', methods=['GET', 'POST'])
def faculty_signup():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        # Hash password
        salt = os.urandom(16)
        hashed_password = hash_password(password, salt)

        # Store faculty in database
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

                # Decode the salt using standard Base64
                try:
                    salt = base64.b64decode(salt_encoded)
                except Exception:
                    return jsonify({
                        "error": "Invalid Base64 salt stored in database.",
                        "faculty": faculty
                    })

                # Debugging info
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

#---------END OF PAGE ROUTES

@app.route('/logout')
def logout():
    # Clear the session data
    session.pop('user_id', None)
    session.pop('username', None)
    session.pop('role', None)
    session.pop('logged_in', None)

    # Redirect to the login page or homepage
    return redirect(url_for('login'))
# End of login and sign up
@app.route('/')
def index():
    return render_template('landing_page.html')

@app.route('/faculty_dashboard')
def faculty_dashboard():
    return render_template('faculty_dashboard.html')

@app.route('/candidate')
def candidate_page():
    return render_template('candidate.html')

@app.route('/submit', methods=['POST'])
def submit_application():
    # Get form data
    first_name = request.form.get('first-name')
    last_name = request.form.get('last-name')
    telephone = request.form.get('telephone')
    gender = request.form.get('gender')
    # course_selection = request.form.get('course_selection')  # "CS/MIS", "Math", "Both"
    course_selection = request.form.get('course_selection_id')


    # Handle file uploads
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

    # Store applicant information
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO applicants (first_name, last_name, telephone, gender, course_selection, cv_path, cover_letter_path, transcript_path) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (first_name, last_name, telephone, gender, course_selection, cv_path, cover_letter_path, transcript_path))
    applicant_id = cursor.lastrowid
    conn.commit()

    # Get course preferences from the form
    for course in request.form.keys():
        if course.startswith("preference_"):  # Example: preference_algorithm_design
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


@app.route('/json/candidates')
def serve_candidates_json():
    try:
        with open("candidates.json", "r") as json_file:
            data = json.load(json_file)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "JSON file not found"}), 404



import json
from flask import jsonify

@app.route('/api/candidates')
def get_candidates():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Fetch applicant details
        cursor.execute("""
            SELECT id, first_name, last_name, telephone, gender, course_selection, 
                   cv_path, cover_letter_path, transcript_path 
            FROM applicants
        """)
        applicants = cursor.fetchall()

        candidates = []
        base_url = "https://www.pythonanywhere.com/user/ashesihiring/files/home/ashesihiring/"

        for applicant in applicants:
            # Fetch course preferences for each candidate
            cursor.execute("SELECT course_name FROM course_preferences WHERE applicant_id = %s", (applicant["id"],))
            interests = [row["course_name"] for row in cursor.fetchall()]

            candidates.append({
                "name": f"{applicant['first_name']} {applicant['last_name']}",
                "summary": f"Interested in {applicant.get('course_selection', 'Unknown Course')}.",
                "details": f"""
                    <a href='{base_url}{applicant['cv_path']}' target='_blank'>Resume</a> | 
                    <a href='{base_url}{applicant['cover_letter_path']}' target='_blank'>Cover Letter</a> | 
                    <a href='{base_url}{applicant['transcript_path']}' target='_blank'>Transcript</a>
                """,
                "interests": interests  # Include interests dynamically
            })

        cursor.close()
        conn.close()

        # Save JSON response to a file
        with open("candidates.json", "w") as json_file:
            json.dump(candidates, json_file, indent=4)

        return jsonify(candidates)

    except mysql.connector.Error as err:
        error_response = {"error": str(err)}

        # Save error response to a file
        with open("error_log.json", "w") as json_file:
            json.dump(error_response, json_file, indent=4)

        return jsonify(error_response), 500

# -----------------------------------------------------------

# INSERTING A COMMENT INTO THE DB
@app.route('/add_comment', methods=['POST'])
def add_comment():
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No data provided.'}), 400

    application_id = data.get('application_id')
    rating = data.get('rating')
    interest_prompt = data.get('interest_prompt')
    comment_text = data.get('comment')

    if not application_id or rating is None or not interest_prompt:
        return jsonify({'success': False, 'message': 'Application ID, Rating, and Interest Prompt are required.'}), 400

    # fix this when you wake up

    # if 'user_id' not in session:
    #     return jsonify({'success': False, 'message': 'You must be logged in to comment.'}), 403

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO comments (application_id, rating, interest_prompt, comment)
            VALUES (%s, %s, %s, %s)
        """, (application_id, rating, interest_prompt, comment_text))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': 'Comment added successfully.'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# GET COMMENTS FROM DB
@app.route('/get_comments', methods=['GET'])
def get_comments():
    application_id = request.args.get('application_id')

    if not application_id:
        return jsonify({'success': False, 'message': 'Application ID is required.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, application_id, rating, interest_prompt, comment 
            FROM comments WHERE application_id = %s
        """, (application_id,))

        comments = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'comments': comments})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# UPDATING A COMMENT IN THE DB
@app.route('/comment', methods=['PUT'])
def update_comment():
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No data provided.'}), 400

    comment_id = data.get('comment_id')
    rating = data.get('rating')
    interest_prompt = data.get('interest_prompt')
    updated_comment = data.get('comment')

    if not comment_id or rating is None or not interest_prompt:
        return jsonify({'success': False, 'message': 'Comment ID, Rating, and Interest Prompt are required.'}), 400

    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'You must be logged in to update a comment.'}), 403

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
            UPDATE comments SET rating = %s, interest_prompt = %s, comment = %s WHERE id = %s
        """, (rating, interest_prompt, updated_comment, comment_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': 'Comment updated successfully.'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# DELETING A COMMENT
@app.route('/delete_comment', methods=['POST'])
def delete_comment():
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No data provided.'}), 400

    comment_id = data.get('comment_id')

    if not comment_id:
        return jsonify({'success': False, 'message': 'Comment ID is required.'}), 400

    if 'user_id' not in session:
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

# SUBMITTING A RATING (WITHOUT A COMMENT)
@app.route('/submit_rating', methods=['POST'])
def submit_rating():
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No data provided.'}), 400

    application_id = data.get('application_id')
    rating = data.get('rating')

    if not application_id or rating is None:
        return jsonify({'success': False, 'message': 'Application ID and Rating are required.'}), 400

    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'You must be logged in to submit a rating.'}), 403

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO ratings (application_id, rating)
            VALUES (%s, %s)
        """, (application_id, rating))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': 'Rating submitted successfully.'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500



if __name__ == '__main__':
    app.run(debug=True)
