import json
import logging
import os
import re
from contextlib import asynccontextmanager
from datetime import date
from decimal import Decimal
from pathlib import Path

import mysql.connector
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from google import genai
from google.genai import types
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

from database import get_connection
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
api_key = os.getenv("GEMINI_API_KEY", "").strip()
client = genai.Client(api_key=api_key) if api_key and api_key != "your_gemini_api_key" else None
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


BASE_DIR = Path(__file__).resolve().parent


class EmployeeInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=150)
    department: str = Field(min_length=2, max_length=60)
    designation: str = Field(min_length=2, max_length=100)
    salary: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    joining_date: date

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        if "@" not in value or "." not in value.rsplit("@", 1)[-1]:
            raise ValueError("Enter a valid email address")
        return value



class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def non_blank_message(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be blank.")
        return value


def require_ai():
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="AI is not configured. Add a valid GEMINI_API_KEY to your .env file and restart the server."
        )


def employee_query(sql, values=None, fetch=None):
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(sql, values or ())

        if fetch == "one":
            return cursor.fetchone()

        if fetch == "all":
            return cursor.fetchall()

        connection.commit()
        return cursor.lastrowid

    except mysql.connector.IntegrityError as error:
        if connection and connection.is_connected():
            connection.rollback()

        if error.errno == 1062:
            raise HTTPException(
                status_code=409,
                detail="An employee with this email already exists."
            ) from error

        raise HTTPException(
            status_code=400,
            detail="Database constraint violation."
        ) from error

    except mysql.connector.Error as error:
        if connection and connection.is_connected():
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Database operation failed."
        ) from error

    finally:
        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    connection = None

    try:
        connection = get_connection()
        connection.ping(reconnect=True, attempts=1, delay=0)
        logger.info("MySQL connection check succeeded.")
    except Exception:
        logger.warning("MySQL is not available during startup. Check your .env settings and start the database.")
    finally:
        if connection and connection.is_connected():
            connection.close()

    yield


app = FastAPI(
    title="Employee Management API",
    lifespan=lifespan
)

app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static"
)


@app.get("/")
def home():
    return FileResponse(BASE_DIR / "templates" / "index.html")


@app.get("/api/employees")
def list_employees():
    return employee_query(
        """
        SELECT employee_id, full_name, email, department,
               designation, salary, joining_date
        FROM employees
        ORDER BY employee_id DESC
        """,
        fetch="all"
    )


@app.get("/api/employees/{employee_id}")
def get_employee(employee_id: int):
    employee = employee_query(
        """
        SELECT employee_id, full_name, email, department,
               designation, salary, joining_date
        FROM employees
        WHERE employee_id = %s
        """,
        (employee_id,),
        fetch="one"
    )

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return employee


@app.post("/api/employees", status_code=201)
def create_employee(employee: EmployeeInput):
    employee_id = employee_query(
        """
        INSERT INTO employees
        (full_name, email, department, designation, salary, joining_date)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            employee.full_name,
            employee.email,
            employee.department,
            employee.designation,
            employee.salary,
            employee.joining_date
        )
    )

    return {
        "message": "Employee created successfully",
        "employee_id": employee_id
    }


@app.put("/api/employees/{employee_id}")
def update_employee(employee_id: int, employee: EmployeeInput):
    existing = employee_query(
        "SELECT employee_id FROM employees WHERE employee_id = %s",
        (employee_id,),
        fetch="one"
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee_query(
        """
        UPDATE employees
        SET full_name = %s,
            email = %s,
            department = %s,
            designation = %s,
            salary = %s,
            joining_date = %s
        WHERE employee_id = %s
        """,
        (
            employee.full_name,
            employee.email,
            employee.department,
            employee.designation,
            employee.salary,
            employee.joining_date,
            employee_id
        )
    )

    return {"message": "Employee updated successfully"}


@app.delete("/api/employees/{employee_id}", status_code=204)
def delete_employee(employee_id: int):
    existing = employee_query(
        "SELECT employee_id FROM employees WHERE employee_id = %s",
        (employee_id,),
        fetch="one"
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee_query(
        "DELETE FROM employees WHERE employee_id = %s",
        (employee_id,)
    )

    return Response(status_code=204)

# -------------------------- AI ASSISTANT --------------------------

@app.post("/api/chat")
def chat(request: ChatRequest):
    """General AI assistant for programming and application questions."""
    require_ai()
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=request.message,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are PeopleDesk's helpful AI assistant inside an employee management "
                    "application built with FastAPI, MySQL, HTML, CSS and JavaScript. "
                    "Explain concepts clearly and help users understand the application. "
                    "You do not have access to employee records and cannot perform employee operations. "
                    "Never claim otherwise. Keep answers practical and concise."
                ),
                temperature=0.4,
                max_output_tokens=800,
            ),
        )
        return {"reply": response.text or "I couldn't generate a response. Please try again."}
    except Exception:
        logger.exception("AI assistant request failed")
        raise HTTPException(status_code=502, detail="The AI request failed. Check your API key, model access, network and API account limits.")


# ---------------------- READ-ONLY EMPLOYEE AGENT ------------------

def search_employees_by_department(department: str):
    department = department.strip()
    if not department or len(department) > 60:
        raise ValueError("Department must contain 1 to 60 characters.")
    return employee_query(
        "SELECT employee_id, full_name, department, designation FROM employees "
        "WHERE LOWER(department) = LOWER(%s) ORDER BY full_name",
        (department,), fetch="all"
    )


def count_employees_by_department(department: str):
    department = department.strip()
    if not department or len(department) > 60:
        raise ValueError("Department must contain 1 to 60 characters.")
    result = employee_query(
        "SELECT COUNT(*) AS total FROM employees WHERE LOWER(department) = LOWER(%s)",
        (department,), fetch="one"
    )
    return {"department": department, "count": int(result["total"] if result else 0)}


@app.post("/api/agent")
def employee_agent(request: ChatRequest):
    """AI agent with tightly allowlisted, read-only department lookup tools."""
    require_ai()
    instructions = (
        "You are PeopleDesk's read-only employee operations agent. Use the supplied Python tools "
        "for real employee searches and counts. Never invent names, IDs or counts. "
        "You can only search and count by department. You cannot add, edit or delete employees. "
        "Do not reveal salary, email addresses or any fields beyond employee name, department "
        "and designation. If a request is outside these abilities, explain the limitation."
    )
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=request.message,
            config=types.GenerateContentConfig(
                system_instruction=instructions,
                tools=[search_employees_by_department, count_employees_by_department],
                temperature=0.2,
                max_output_tokens=1000,
            ),
        )
        return {"reply": response.text or "I couldn't complete that employee lookup. Please try again."}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Employee agent request failed")
        raise HTTPException(status_code=502, detail="The employee agent failed. Check your Gemini API key, model access, network and database configuration.")
