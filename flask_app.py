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


        # If rating is 4 or more, insert without `interest_prompt` and `comment`
        if rating >= 4:
            cursor.execute("""
                            INSERT INTO comments (application_id, rating, faculty_id, interest_prompt, comment)
                            VALUES (%s, %s, %s, NULL, NULL)
                    """, (application_id, rating, user_id))
        else:
            # Otherwise, insert with `interest_prompt` and `comment`
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

    user_id = session.get("faculty_id")
    comment_id = data.get('comment_id')
    rating = data.get('rating')
    interest_prompt = data.get('interest_prompt')
    updated_comment = data.get('comment')

    if not comment_id or rating is None or not interest_prompt:
        return jsonify({'success': False, 'message': 'Comment ID, Rating, and Interest Prompt are required.'}), 400

    # if 'user_id' not in session:
    #     return jsonify({'success': False, 'message': 'You must be logged in to update a comment.'}), 403

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

# DELETING A COMMENT
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

        # Check if the record exists
        cursor.execute("SELECT id FROM comments WHERE application_id = %s", (application_id,))
        existing_comment = cursor.fetchone()

        if existing_comment:
            # If the record exists, update it
            cursor.execute("UPDATE comments SET rating = %s WHERE application_id = %s", (rating, application_id))
        else:
            # If the record does not exist, insert a new one
            cursor.execute("INSERT INTO comments (application_id, rating) VALUES (%s, %s)", (application_id, rating))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': 'Rating processed successfully.'})

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500




# PART ONE: RENDERING THE PAGES

@app.route('/faculty_scheduling')
def faculty_scheduling():
    # if 'faculty_id' not in session:
    #     return "Unauthorized", 403  # Ensure only logged-in faculty can access
    return render_template('faculty_scheduling.html')

# Route to render Admin Dashboard
@app.route('/admin_dashboard')
def admin_dashboard():
    # if 'faculty_id' not in session:  # Adjust if you have admin authentication
    #     return "Unauthorized", 403
    return render_template('admin_dashboard.html')


# PART TWO: IMPLEMENTING BACKEND FUNCTIONALITIES FOR THE PAGES

# Fetch shortlisted applicants (rating >= 4 or "yes" interest)
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


# Schedule interview
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


# Fetch scheduled interviews
@app.route('/get_scheduled_interviews')
def get_scheduled_interviews():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT 
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
    return jsonify([dict(row) for row in interviews])

if __name__ == '__main__':
    app.run(debug=True)
