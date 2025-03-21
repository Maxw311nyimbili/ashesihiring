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
            (username, email, hashed_password, base64.urlsafe_b64encode(salt).decode())
        )
        conn.commit()
        conn.close()

        return redirect(url_for('faculty_login'))

    return render_template('faculty_signup.html')



@app.route('/faculty_login', methods=['GET', 'POST'])
def faculty_login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, password_hash, salt FROM faculty_users WHERE email = %s", (email,))
        faculty = cursor.fetchone()

        if faculty:
            faculty_id, username, stored_hash, salt = faculty
            if verify_password(password, stored_hash, base64.urlsafe_b64decode(salt)):
                session['faculty_logged_in'] = True
                session['faculty_id'] = faculty_id
                session['faculty_username'] = username
                return redirect(url_for('faculty_dashboard'))

        return "Invalid login credentials"

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
    return render_template('index.html')

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

@app.route('/api/candidates')
def get_candidates():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id, first_name, last_name, course_interests, cv_path, cover_letter_path, transcript_path FROM applicants")
        applicants = cursor.fetchall()

        candidates = []
        base_url = "https://ashesihiring.pythonanywhere.com/static/uploads/"
        for applicant in applicants:
            candidates.append({
                "name": f"{applicant['first_name']} {applicant['last_name']}",
                "summary": f"Interested in {applicant['course_interests']}.",
                "details": f"""
                    <a href='{base_url}{applicant['cv_path']}' target='_blank'>Resume</a> | 
                    <a href='{base_url}{applicant['cover_letter_path']}' target='_blank'>Cover Letter</a> | 
                    <a href='{base_url}{applicant['transcript_path']}' target='_blank'>Transcript</a>
                """
            })

        cursor.close()
        conn.close()
        return jsonify(candidates)

    except mysql.connector.Error as err:
        return jsonify({"error": str(err)})

if __name__ == '__main__':
    app.run(debug=True)
