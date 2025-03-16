from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import base64
import os
import mysql.connector

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
def submit():
    first_name = request.form.get('first-name')
    last_name = request.form.get('last-name')
    email = request.form.get('email')
    course_interests = ', '.join(request.form.getlist('courses'))  # Convert list to string

    cv_path = cover_letter_path = transcript_path = None

    # Check and save uploaded files
    if 'cv' in request.files:
        cv = request.files['cv']
        if cv.filename:
            cv_path = os.path.join(app.config['UPLOAD_FOLDER'], cv.filename)
            cv.save(cv_path)

    if 'cover_letter' in request.files:
        cover_letter = request.files['cover_letter']
        if cover_letter.filename:
            cover_letter_path = os.path.join(app.config['UPLOAD_FOLDER'], cover_letter.filename)
            cover_letter.save(cover_letter_path)

    if 'transcript' in request.files:
        transcript = request.files['transcript']
        if transcript.filename:
            transcript_path = os.path.join(app.config['UPLOAD_FOLDER'], transcript.filename)
            transcript.save(transcript_path)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Insert applicant details into MySQL
        cursor.execute("""
            INSERT INTO applicants (first_name, last_name, email, course_interests, cv_path, cover_letter_path, transcript_path)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (first_name, last_name, email, course_interests, cv_path, cover_letter_path, transcript_path))

        conn.commit()
        cursor.close()
        conn.close()

        print(f"Stored submission: {first_name} {last_name}, Email: {email}")
        print(f"CV Path: {cv_path}, Cover Letter Path: {cover_letter_path}, Transcript Path: {transcript_path}")

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    return redirect(url_for('index'))

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
