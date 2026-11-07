const API_URL = "/api/employees";
const form = document.getElementById("employeeForm");
const table = document.getElementById("employeeTable");
const employeeCount = document.getElementById("employeeCount");
const submitButton = document.getElementById("submitButton");
const cancelButton = document.getElementById("cancelButton");
const refreshButton = document.getElementById("refreshButton");
const searchInput = document.getElementById("searchInput");
const departmentFilter = document.getElementById("departmentFilter");
const toast = document.getElementById("toast");
let employees = [];
let editingEmployeeId = null;
let toastTimer;

function showMessage(text, type = "success") {
  toast.textContent = text;
  toast.className = `toast show ${type === "error" ? "error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

async function request(url, options = {}) {
  let response;
  try { response = await fetch(url, options); }
  catch { throw new Error("Could not connect to the server. Check that the API is running."); }
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail)) detail = data.detail.map(item => item.msg).join(" · ");
    } catch { /* Keep fallback message. */ }
    throw new Error(detail);
  }
  if (response.status === 204) return null;
  return response.json();
}

function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase() || "?";
}
function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function addCell(row, text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text ?? "—";
  if (className) cell.className = className;
  row.appendChild(cell);
  return cell;
}
function updateStats() {
  const departments = new Set(employees.map(e => e.department).filter(Boolean));
  const average = employees.length ? employees.reduce((sum, e) => sum + Number(e.salary || 0), 0) / employees.length : 0;
  const now = new Date();
  const addedThisMonth = employees.filter(e => {
    const d = new Date(`${String(e.joining_date).slice(0, 10)}T00:00:00`);
    return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  document.getElementById("totalEmployees").textContent = employees.length;
  document.getElementById("totalDepartments").textContent = departments.size;
  document.getElementById("averageSalary").textContent = formatCurrency(average);
  document.getElementById("newEmployees").textContent = addedThisMonth;
  const current = departmentFilter.value;
  const options = [...departments].sort((a, b) => a.localeCompare(b));
  departmentFilter.replaceChildren(new Option("All departments", ""));
  options.forEach(dept => departmentFilter.add(new Option(dept, dept)));
  departmentFilter.value = options.includes(current) ? current : "";
}
function renderEmployees() {
  const query = searchInput.value.trim().toLowerCase();
  const department = departmentFilter.value;
  const filtered = employees.filter(employee => {
    const searchable = [employee.full_name, employee.email, employee.department, employee.designation, employee.employee_id].join(" ").toLowerCase();
    return searchable.includes(query) && (!department || employee.department === department);
  });
  employeeCount.textContent = `${filtered.length} of ${employees.length} employees`;
  document.getElementById("tableSummary").textContent = filtered.length ? `Showing ${filtered.length} employee${filtered.length === 1 ? "" : "s"}` : "No matching records";
  table.replaceChildren();
  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "table-state";
    cell.textContent = employees.length ? "No employees match your search. Try another name or department." : "No employees yet. Add your first teammate using the form.";
    row.appendChild(cell); table.appendChild(row); return;
  }
  filtered.forEach(employee => {
    const row = document.createElement("tr");
    const person = document.createElement("td");
    const personWrap = document.createElement("div"); personWrap.className = "employee-cell";
    const avatar = document.createElement("span"); avatar.className = "employee-avatar"; avatar.textContent = initials(employee.full_name);
    const details = document.createElement("div");
    const name = document.createElement("div"); name.className = "employee-name"; name.textContent = employee.full_name;
    const email = document.createElement("div"); email.className = "employee-email"; email.textContent = employee.email;
    details.append(name, email); personWrap.append(avatar, details); person.appendChild(personWrap); row.appendChild(person);
    const deptCell = addCell(row, employee.department); const pill = document.createElement("span"); pill.className = "dept-pill"; pill.textContent = employee.department; deptCell.replaceChildren(pill);
    addCell(row, employee.designation);
    addCell(row, formatCurrency(employee.salary), "salary-cell");
    addCell(row, formatDate(employee.joining_date));
    const actionsCell = document.createElement("td"); const actions = document.createElement("div"); actions.className = "row-actions";
    const edit = document.createElement("button"); edit.type = "button"; edit.className = "row-action"; edit.textContent = "Edit"; edit.setAttribute("aria-label", `Edit ${employee.full_name}`); edit.addEventListener("click", () => editEmployee(employee.employee_id));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "row-action delete"; remove.textContent = "Delete"; remove.setAttribute("aria-label", `Delete ${employee.full_name}`); remove.addEventListener("click", () => deleteEmployee(employee.employee_id, employee.full_name));
    actions.append(edit, remove); actionsCell.appendChild(actions); row.appendChild(actionsCell); table.appendChild(row);
  });
}
async function loadEmployees() {
  refreshButton.disabled = true;
  refreshButton.textContent = "…";
  try {
    employees = await request(API_URL);
    updateStats(); renderEmployees();
  } catch (error) {
    employeeCount.textContent = "Unable to load records";
    table.replaceChildren();
    const row = document.createElement("tr"); const cell = document.createElement("td");
    cell.colSpan = 6; cell.className = "table-state"; cell.textContent = error.message;
    row.appendChild(cell); table.appendChild(row); showMessage(error.message, "error");
  } finally { refreshButton.disabled = false; refreshButton.textContent = "↻"; }
}
function getFormData() {
  return {
    full_name: document.getElementById("full_name").value.trim(),
    email: document.getElementById("email").value.trim(),
    department: document.getElementById("department").value,
    designation: document.getElementById("designation").value.trim(),
    salary: Number(document.getElementById("salary").value),
    joining_date: document.getElementById("joining_date").value
  };
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const employee = getFormData();
  if (!Number.isFinite(employee.salary) || employee.salary <= 0) { showMessage("Enter a valid salary greater than zero.", "error"); return; }
  submitButton.disabled = true; submitButton.textContent = editingEmployeeId === null ? "Adding…" : "Saving…";
  try {
    const isEditing = editingEmployeeId !== null;
    await request(isEditing ? `${API_URL}/${editingEmployeeId}` : API_URL, {
      method: isEditing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(employee)
    });
    showMessage(isEditing ? "Employee details updated." : "Employee added to your team.");
    resetForm(); await loadEmployees();
  } catch (error) { showMessage(error.message, "error"); }
  finally { submitButton.disabled = false; updateSubmitLabel(); }
});
async function editEmployee(id) {
  try {
    const employee = await request(`${API_URL}/${id}`);
    for (const key of ["full_name", "email", "department", "designation", "salary", "joining_date"]) {
      document.getElementById(key).value = String(employee[key] ?? "").slice(0, key === "joining_date" ? 10 : undefined);
    }
    editingEmployeeId = id;
    document.getElementById("formTitle").textContent = "Edit teammate";
    document.getElementById("formDescription").textContent = `Update details for ${employee.full_name}.`;
    cancelButton.classList.remove("hidden"); updateSubmitLabel();
    document.getElementById("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("full_name").focus();
  } catch (error) { showMessage(error.message, "error"); }
}
async function deleteEmployee(id, name) {
  if (!window.confirm(`Delete ${name} from the employee directory? This cannot be undone.`)) return;
  try {
    await request(`${API_URL}/${id}`, { method: "DELETE" });
    if (editingEmployeeId === id) resetForm();
    showMessage(`${name} has been deleted.`); await loadEmployees();
  } catch (error) { showMessage(error.message, "error"); }
}
function updateSubmitLabel() { submitButton.textContent = editingEmployeeId === null ? "＋ Add employee" : "Save changes"; }
function resetForm() {
  form.reset(); editingEmployeeId = null;
  document.getElementById("formTitle").textContent = "Add a teammate";
  document.getElementById("formDescription").textContent = "Create a new employee record.";
  cancelButton.classList.add("hidden"); updateSubmitLabel();
}
cancelButton.addEventListener("click", () => { resetForm(); showMessage("Changes discarded."); });
refreshButton.addEventListener("click", loadEmployees);
searchInput.addEventListener("input", renderEmployees);
departmentFilter.addEventListener("change", renderEmployees);
document.getElementById("currentYear").textContent = `© ${new Date().getFullYear()} PeopleDesk`;
loadEmployees();


// -------------------------- AI WORKSPACE --------------------------
function setupAiForm(formId, inputId, statusId, answerId, endpoint, submitId, idleLabel, loadingLabel) {
  const aiForm = document.getElementById(formId);
  const aiInput = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  const answer = document.getElementById(answerId);
  const button = document.getElementById(submitId);
  if (!aiForm || !aiInput || !status || !answer || !button) return;

  aiForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = aiInput.value.trim();
    if (!message) { aiInput.focus(); return; }
    button.disabled = true;
    button.textContent = loadingLabel;
    status.textContent = "Working on your request…";
    status.className = "ai-status";
    answer.hidden = true;
    answer.textContent = "";
    try {
      const data = await request(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      answer.textContent = data.reply || "The AI returned an empty response.";
      answer.hidden = false;
      status.textContent = "Response ready";
      status.className = "ai-status success";
    } catch (error) {
      status.textContent = error.message;
      status.className = "ai-status error";
    } finally {
      button.disabled = false;
      button.textContent = idleLabel;
    }
  });
}

setupAiForm("chat-form", "chat-message", "chat-status", "chat-answer", "/api/chat", "chat-submit", "Ask assistant ↗", "Thinking…");
setupAiForm("agent-form", "agent-message", "agent-status", "agent-answer", "/api/agent", "agent-submit", "Run agent ↗", "Working…");
