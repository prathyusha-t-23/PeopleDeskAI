# PeopleDesk — AI-Powered Employee Management System

PeopleDesk is a responsive employee management web application built using **FastAPI, MySQL, HTML, CSS and JavaScript**. It combines employee management operations with Gemini-powered AI assistance in a modern dashboard.

## Features

- **Employee Management (CRUD):** Create, view, update and delete employee records.
- **Smart Search:** Search employees by name, email, department, designation or ID.
- **Department Filtering:** Filter employees by department.
- **Dashboard Analytics:** View employee count, departments, average monthly salary and monthly joining statistics.
- **AI Assistant:** Get assistance with programming, FastAPI, MySQL and application-related questions.
- **AI Employee Operations Agent:** Search and count employees by department using natural-language queries.
- **Read-only AI Tools:** The employee agent uses restricted database tools and cannot modify employee records.
- **Responsive UI:** Works across desktop, tablet and mobile devices.

## Technology Stack

| Component | Technology |
|---|---|
| Backend | Python, FastAPI |
| Database | MySQL |
| Frontend | HTML, CSS, JavaScript |
| AI Integration | Google Gemini API |
| Python Environment | Virtual Environment |

## Project Structure

```text
PeopleDeskAI/
│
├── .gitignore
├── README.md
│
└── employee_management/
    ├── main.py
    ├── database.py
    ├── requirements.txt
    ├── schema.sql
    ├── .env.example
    │
    ├── static/
    │   ├── script.js
    │   └── style.css
    │
    └── templates/
        └── index.html
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/prathyusha-t-23/PeopleDeskAI.git
cd PeopleDeskAI/employee_management
```

### 2. Create and activate a virtual environment

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure MySQL

Make sure MySQL Server is installed and running.

Execute the SQL schema:

```bash
mysql -u root -p < schema.sql
```

This creates the `employee_db` database and the required `employees` table.

### 5. Configure environment variables

Copy `.env.example` to `.env` inside the `employee_management` folder.

Update the values with your own credentials:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=employee_db
```

Generate a Gemini API key using [Google AI Studio](https://aistudio.google.com/app/apikey).

**Never upload your actual `.env` file or API keys to GitHub.**

### 6. Run the application

```bash
uvicorn main:app --reload
```

Open the application:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/employees` | List employees |
| GET | `/api/employees/{employee_id}` | Get employee details |
| POST | `/api/employees` | Add an employee |
| PUT | `/api/employees/{employee_id}` | Update employee details |
| DELETE | `/api/employees/{employee_id}` | Delete an employee |
| POST | `/api/chat` | General AI assistant |
| POST | `/api/agent` | Employee operations agent |

## Security Considerations

- API keys and database credentials are stored in environment variables.
- The employee operations agent uses allowlisted, read-only database tools.
- Authentication and role-based access control should be implemented before public deployment.
- Employee information and salary data should not be exposed publicly.

## Future Enhancements

- User authentication and role-based access.
- Employee attendance and leave management.
- Advanced analytics and reporting.
- Additional AI-powered employee insights.

---

**Developed as a full-stack employee management project using FastAPI, MySQL and Google Gemini AI.**
