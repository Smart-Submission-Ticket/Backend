# Smart Submission Ticket - Backend

## API Endpoints

### Student Registration

1. `POST /api/register/student/verify-email`

   - Request Body:

     ```json
     {
       "email": "abc@gmail.com"
     }
     ```

   - Response:

     ```json
     {
       "message": "Registration OTP sent to email"
     }
     ```

2. `POST /api/register/student/verify-otp`

   - Request Body:

     ```json
     {
       "email": "abc@gmail.com",
       "otp": "123456"
     }
     ```

   - Response:

     ```json
     {
       "message": "OTP verified",
       "token": "jwt-token for student registration"
     }
     ```

3. `POST /api/register/student`

   - Request Body:

     ```json
     {
       "email": "abc@gmail.com",
       "password": "password",
       "name": "John Doe",
       "rollNo": "123456",
       "batch": "N9",
       "class": "TE09",
       "year": 3,
       "abcId": "I2K21103412",
       "token": "jwt-token from /api/register/student/verify-otp"
     }
     ```

   - Response:

     ```json
     {
       "message": "Student registered successfully"
     }
     ```

   - Response headers:
     - `x-auth-token`: "jwt-token for student authentication"

### Teacher Registration

1. `POST /api/register/teacher/verify-email`

   - Request Body:

     ```json
     {
       "email": "abc@gmail.com"
     }
     ```

   - Response:
     ```json
     {
       "message": "Registration OTP sent to email"
     }
     ```

2. `POST /api/register/teacher/verify-otp`

   - Request Body:

     ```json
     {
       "email": "abc@gmail.com",
       "otp": "123456"
     }
     ```

   - Response:
     ```json
     {
       "message": "OTP verified",
       "token": "jwt-token for teacher registration"
     }
     ```

3. `POST /api/register/teacher`

   - Request Body:

     ```json
     {
       "email": "abc@gmail.com",
       "password": "password",
       "name": "John Doe",
       "token": "jwt-token from /api/register/teacher/verify-otp"
     }
     ```

   - Response:
     ```json
     {
       "message": "Teacher registered successfully"
     }
     ```
   - Response headers:
     - `x-auth-token`: "jwt-token for teacher authentication"

### Login

1. `POST /api/login/student`

   - Request Body:

     ```json
     {
       "email": "abc@gmail.com",
       "password": "password"
     }
     ```

   - Response:
     ```json
     {
       "message": "Student logged in successfully"
     }
     ```
   - Response headers:
     - `x-auth-token`: "jwt-token for student authentication"

2. `POST /api/login/teacher`

   - Request Body:

     ```json
     {
       "email": "abc@gmail.com",
       "password": "password"
     }
     ```

   - Response:
     ```json
     {
       "message": "Teacher logged in successfully"
     }
     ```
   - Response headers:
     - `x-auth-token`: "jwt-token for teacher authentication"

### Excel data

1. `GET /api/fetch/classes`

   - Will fetch all the classes and batches from google sheets.

2. `GET /api/fetch/students`

   - Will fetch all the students from google sheets.

3. `GET /api/fetch/curriculum`

   - Will fetch all the curriculum from google sheets.

4. `GET /api/fetch/attendance`

   - Will fetch all the attendance from google sheets.

5. `POST /api/submit/classes`

   - Will fetch all the classes and batches from excel file.

   - Request (multipart/form-data):

     ```json
     {
       "file": "classes.xlsx"
     }
     ```

6. `POST /api/submit/students`

   - Will fetch all the students from excel file.

   - Request (multipart/form-data):

     ```json
     {
       "file": "students.xlsx"
     }
     ```

7. `POST /api/submit/curriculum`

   - Will fetch all the curriculum from excel file.

   - Request (multipart/form-data):

     ```json
     {
       "file": "curriculum.xlsx"
     }
     ```

8. `POST /api/submit/attendance`

   - Will fetch all the attendance from excel file.

   - Request (multipart/form-data):

     ```json
     {
       "file": "attendance.xlsx"
     }
     ```

9. `POST /api/submit/assignments`

   - Will fetch all the assignments from excel file.

   - Request (multipart/form-data):

     ```json
     {
       "subject": "OOP",
       "file": "assignments.xlsx"
     }
     ```

10. `POST /api/submit/utmarks`

    - Will fetch all the unit test marks from excel file.

    - Request (multipart/form-data):

      ```json
      {
        "subject": "OOP",
        "file": "utmarks.xlsx"
      }
      ```

### Classes and Batches

1.  `GET /api/classes`

    - Will fetch all the classes and batches.

    - Response:

    ```json
    {
      "2": {
        "SE09": ["E9", "F9", "G9", "H9"],
        "SE10": ["E10", "F10", "G10", "H10"],
        "SE11": ["E11", "F11", "G11", "H11"]
      },
      "3": {
        "TE09": ["K9", "L9", "M9", "N9"],
        "TE10": ["K10", "L10", "M10", "N10"],
        "TE11": ["K11", "L11", "M11", "N11"]
      },
      "4": {
        "BE09": ["P9", "Q9", "R9", "S9"],
        "BE10": ["P10", "Q10", "R10", "S10"],
        "BE11": ["P11", "Q11", "R11", "S11"]
      }
    }
    ```

2.  `GET /api/classes/subjects`

    - Will fetch all the subjects for a class and batch.

    - Response:

    ```json
    {
      "3": {
        "TE09": {
          "K9": {
            "theory": [
              {
                "title": "CNS",
                "teacher": "vrjaiswal@pict.edu"
              }
            ],
            "practical": [
              {
                "title": "CNSL",
                "noOfAssignments": 8,
                "teacher": "psshinde@pict.edu"
              }
            ]
          }
        }
      }
    }
    ```

### Records

1.  `GET /api/records`

    - Will fetch all the records for a student.

    - Request headers:
      - `x-auth-token`: "jwt-token for student authentication"

2.  `GET /api/records/rollNo/:rollNo`

    - Will fetch all the records for a student with roll number.

    - Request headers:
      - `x-auth-token`: "jwt-token for teacher authentication"

3.  `GET /api/records/batch/:batch`

    - Will fetch all the records for a batch.

    - Request headers:
      - `x-auth-token`: "jwt-token for teacher authentication"

4.  `GET /api/records/class/:class`

    - Will fetch all the records for a class.

    - Request headers:
      - `x-auth-token`: "jwt-token for teacher authentication"

5.  `GET /api/records/batch/:batch/subject/:subject`

    - Will fetch all the records for a batch and subject.

    - Request headers:
      - `x-auth-token`: "jwt-token for teacher authentication"

6.  `GET /api/records/class/:class/subject/:subject`

    - Will fetch all the records for a class and subject.

    - Request headers:
      - `x-auth-token`: "jwt-token for teacher authentication"
