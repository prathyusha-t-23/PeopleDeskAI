# PeopleDesk — Employee Management System

A responsive AI-powered employee management dashboard built with FastAPI, MySQL, HTML, CSS and vanilla JavaScript. It combines employee CRUD, a general AI assistant and a read-only employee operations agent in one redesigned workspace.

## Features

- Create, view, update and delete employee records
- Search by employee name, email, department, job title or ID
- Filter the directory by department
- Live dashboard statistics (employee count, departments, average monthly salary and employees who joined this month)
- Responsive layout for desktop, tablet and mobile
- Form validation, loading states and success/error notifications
- AI Assistant for programming, FastAPI, MySQL and application questions
- Employee Operations Agent that can search and count employees by department
- Read-only, allowlisted AI database tools; the agent cannot modify employee records

## Requirements

- Python 3.10+
- MySQL Server

## Setup

1. Open this folder in VS Code and create a virtual environment:

   ```bash
   python -m venv .venv
   ```

2. Activate it:

   **Windows PowerShell**
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

   **macOS/Linux**
   ```bash
   source .venv/bin/activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Create the database and table by running `schema.sql` in MySQL Workbench or the MySQL command line:

   ```bash
   mysql -u root -p < schema.sql
   ```

5. Copy `.env.example` to `.env` and enter your own MySQL password and database settings. Do not commit `.env` to Git.

6. To enable AI features, create a Gemini API key at https://aistudio.google.com/app/apikey and add `GEMINI_API_KEY` to `.env`. The default model is `gemini-2.5-flash`. Without a key, employee CRUD continues to work and the AI endpoints show a clear configuration message.

7. Start the app from this folder:

   ```bash
   uvicorn main:app --reload
   ```

8. Open **http://127.0.0.1:8000**. API documentation is available at **http://127.0.0.1:8000/docs**.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/employees` | List employees |
| GET | `/api/employees/{employee_id}` | Get one employee |
| POST | `/api/employees` | Create employee |
| PUT | `/api/employees/{employee_id}` | Update employee |
| DELETE | `/api/employees/{employee_id}` | Delete employee |
| POST | `/api/chat` | General AI assistant |
| POST | `/api/agent` | Read-only employee operations agent |

## Notes

- Dashboard statistics are calculated from the employee records returned by the API; no additional database tables are required.
- The Google Fonts stylesheet is optional. If unavailable, the page falls back to system sans-serif fonts.
- AI calls require a valid Gemini API key, network access and model availability. Gemini API free-tier availability and limits depend on your region, model and current Google AI Studio terms.
- The employee agent is deliberately limited to department search/count and returns only employee name, department and designation.
- Before public deployment, add authentication and role-based access control. Employee and salary data should not be exposed publicly.
