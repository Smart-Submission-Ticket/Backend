# Smart Submission Ticket - Backend

## API Endpoints

### Student Registration

1. `POST /register/student/verify-email`

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

2. `POST /register/student/verify-otp`

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

3. `POST /register/student`

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
       "mobile": "1234567890",
       "abcId": "I2K21103412",
       "token": "jwt-token from /register/student/verify-otp"
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

1. `POST /register/teacher/verify-email`

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

2. `POST /register/teacher/verify-otp`

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

3. `POST /register/teacher`

   - Request Body:

     ```json
     {
       "email": "abc@gmail.com",
       "password": "password",
       "name": "John Doe",
       "token": "jwt-token from /register/teacher/verify-otp"
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

1 `POST /login`

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
    "message": "Logged in successfully",
    "role": "student/teacher",
    "user": {
      "email": "abc@gmail.com",
      "name": "John Doe", // for teacher
      "rollNo": "123456" // for student
    }
  }
  ```

2. `POST /login/student`

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

3. `POST /login/teacher`

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

### Forgot Password

1. `POST /login/forgot-password`

   - Request Body:

   ```json
   {
     "email": "abc@gmail.com"
   }
   ```

   - Response:

   ```json
   {
     "message": "OTP sent successfully"
   }
   ```

2. `POST /login/verify-otp`

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
     "token": "jwt-token for password reset"
   }
   ```

3. `POST /login/reset-password`

   - Request Body:

   ```json
   {
     "token": "jwt-token from /login/verify-otp",
     "password": "newpassword"
   }
   ```

   - Response:

   ```json
   {
     "message": "Password reset successfully"
   }
   ```

### Excel data

1. `POST /fetch/classes`

   - Will fetch all the classes and batches from google sheets.

2. `POST /fetch/students`

   - Will fetch all the students from google sheets.

3. `POST /fetch/curriculum`

   - Will fetch all the curriculum from google sheets.

4. `POST /fetch/attendance`

   - Will fetch all the attendance from google sheets.

5. `POST /fetch/class_coordinators`

   - Will fetch all the class coordinators from google sheets.

6. `POST /fetch/mentors`

   - Will fetch all the mentors from google sheets.

7. `POST /fetch/te_seminars`

   - Will fetch all the TE seminars from google sheets.

8. `POST /fetch/be_projects`

   - Will fetch all the BE projects from google sheets.

9. `POST /fetch/honors`

   - Will fetch all the honors from google sheets.

10. `POST /submit/classes`

    - Will fetch all the classes and batches from excel file.

    - Request (multipart/form-data):

      ```json
      {
        "file": "classes.xlsx"
      }
      ```

11. `POST /submit/students`

    - Will fetch all the students from excel file.

    - Request (multipart/form-data):

      ```json
      {
        "file": "students.xlsx"
      }
      ```

12. `POST /submit/curriculum`

    - Will fetch all the curriculum from excel file.

    - Request (multipart/form-data):

      ```json
      {
        "file": "curriculum.xlsx"
      }
      ```

13. `POST /submit/attendance`

    - Will fetch all the attendance from excel file.

    - Request (multipart/form-data):

      ```json
      {
        "file": "attendance.xlsx"
      }
      ```

14. `POST /submit/assignments`

    - Will fetch all the assignments from excel file.

    - Request (multipart/form-data):

      ```json
      {
        "subject": "OOP",
        "file": "assignments.xlsx"
      }
      ```

15. `POST /submit/utmarks`

    - Will fetch all the unit test marks from excel file.

    - Request (multipart/form-data):

      ```json
      {
        "subject": "OOP",
        "file": "utmarks.xlsx"
      }
      ```

16. `POST /submit/ticket`

    - WIll update ticket submission details.

    - Request Body:

    ```json
    {
      "academicYear": "2023 - 2024",
      "attendanceLabAsst": "Mrs S. L. Rane",
      "studentAcheivementCommittee": "Sheetal Patil Madam"
    }
    ```

    - Response:

    ```json
    {
      "message": "Ticket submission details updated."
    }
    ```

### Classes and Batches

1.  `GET /classes`

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

2.  `GET /classes/subjects`

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

3.  `GET /classes/assigned`

    - Will fetch all the batches, classes, mentors, class coordinators assigned to a teacher.

    - Request headers:

      - `x-auth-token`: "jwt-token for teacher authentication"

    - Response:

      ```json
      {
        "practicalBatches": [
          {
            "year": 3,
            "class": "TE09",
            "batch": "K9",
            "practical": "CCL"
          },
          {
            "year": 3,
            "class": "TE09",
            "batch": "L9",
            "practical": "CCL"
          }
        ],
        "theoryClasses": [
          {
            "year": 3,
            "class": "TE09",
            "theory": "CC"
          }
        ],
        "mentoringBatches": [
          {
            "year": 3,
            "class": "TE10",
            "batch": "N10"
          }
        ],
        "coordinatingClasses": [
          {
            "year": 3,
            "class": "TE09"
          }
        ]
      }
      ```

### Records

1.  `GET /records`

    - Will fetch all the records for a student.

    - Request headers:
      - `x-auth-token`: "jwt-token for student authentication"

2.  `GET /records/rollNo/:rollNo`

    - Will fetch all the records for a student with roll number.

    - Request headers:
      - `x-auth-token`: "jwt-token for teacher authentication"

3.  `GET /records/batch/:batch`

    - Will fetch all the records for a batch.

    - Request headers:
      - `x-auth-token`: "jwt-token for teacher authentication"

4.  `GET /records/class/:class`

    - Will fetch all the records for a class.

    - Request headers:
      - `x-auth-token`: "jwt-token for teacher authentication"

5.  `GET /records/batch/:batch/subject/:subject`

    - Will fetch all the records for a batch and subject.

    - Request headers:
      - `x-auth-token`: "jwt-token for teacher authentication"

6.  `GET /records/class/:class/subject/:subject`

    - Will fetch all the records for a class and subject.

    - Request headers:
      - `x-auth-token`: "jwt-token for teacher authentication"

7.  `GET /records/ticket`

    - Will fetch all the records related to ticket submission.

    - Response:

    ```json
    {
      "academicYear": "2023 - 2024",
      "attendanceLabAsst": "Mrs S. L. Rane",
      "studentAcheivementCommittee": "Sheetal Patil Madam"
    }
    ```

### Update Records

1. `POST /records/update/attendance`

   - Will update attendance for individual student.

   - Request headers:

     - `x-auth-token`: "jwt-token for teacher authentication"

   - Request Body:

   ```json
   {
     "attendance": [
       { "rollNo": "123", "attendance": 90, "attendanceAlternate": true },
       { "rollNo": "456", "attendance": 88, "attendanceAlternate": true }
     ]
   }
   ```

   - Response:

   ```json
   {
     "message": "Attendance updated.",
     "attendance": [
       { "rollNo": "123", "attendance": 90 },
       { "rollNo": "456", "attendanceAlternate": true }
     ]
   }
   ```

2. `POST /records/update/utmarks/:subject`

   - Will update unit test marks for individual student.

   - Request headers:

     - `x-auth-token`: "jwt-token for teacher authentication"

   - Request Body:

   ```json
   {
     "utmarks": [
       {
         "rollNo": "123",
         "ut1": 23,
         "ut2": 20,
         "ut1Alternate": true,
         "ut2Alternate": true
       },
       { "rollNo": "456", "ut1": 25 },
       { "rollNo": "789", "ut1Alternate": true }
     ]
   }
   ```

   - Response:

   ```json
   {
     "message": "UT marks updated.",
     "utmarks": [
       {
         "rollNo": "123",
         "ut1": 23,
         "ut2": 20,
         "ut1Alternate": true,
         "ut2Alternate": true
       },
       {
         "rollNo": "456",
         "ut1": 25,
         "ut2": 20,
         "ut1Alternate": true,
         "ut2Alternate": true
       },
       {
         "rollNo": "789",
         "ut1": 20,
         "ut2": 20,
         "ut1Alternate": true,
         "ut2Alternate": true
       }
     ]
   }
   ```

3. `POST /records/update/assignments/:subject`

   - Will update assignments for individual student.

   - Request headers:

     - `x-auth-token`: "jwt-token for teacher authentication"

   - Request Body:

   ```json
   {
     "assignments": [
       { "rollNo": "123", "allCompleted": true },
       { "rollNo": "456", "allCompleted": false }
     ]
   }
   ```

   - Response:

   ```json
   {
     "message": "Assignments updated.",
     "assignments": [
       { "rollNo": "123", "allCompleted": true },
       { "rollNo": "456", "allCompleted": false }
     ]
   }
   ```
