from flask import Flask, render_template, request, redirect, url_for, jsonify
import os
import mysql.connector

app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Database Configuration (XAMPP MySQL)
# db_config = {
#     'host': 'localhost',
#     'port': 8080,
#     'user': 'root',
#     'password': '',
#     'database': 'applications_db'
# }

def get_db_connection():
    return mysql.connector.connect(
        host='ashesihiring.mysql.pythonanywhere-services.com',
        user='ashesihiring',
        password='beginninghiring2002',
        database="ashesihiring$default"
    )

@app.route('/')
def index():
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
