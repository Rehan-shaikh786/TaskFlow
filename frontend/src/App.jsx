
import { useEffect, useState } from "react";
import {
  createTask as createTaskApi,
  deleteTask as deleteTaskApi,
  getTasks,
  updateTask as updateTaskApi,
} from "./api";
import "./App.css";

const navigation = [
  { icon: "◫", label: "Overview" },
  { icon: "▦", label: "My Tasks" },
  { icon: "▤", label: "Projects" },
  { icon: "▥", label: "Calendar" },
];

function normalizeStatus(status) {
  const value = String(status || "TODO")
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

  if (value === "COMPLETED" || value === "DONE") {
    return "Completed";
  }

  if (value === "IN_PROGRESS" || value === "INPROGRESS") {
    return "In Progress";
  }

  return "To Do";
}

function statusToApi(status) {
  if (status === "Completed") return "COMPLETED";
  if (status === "In Progress") return "IN_PROGRESS";
  return "TODO";
}

function normalizePriority(priority) {
  const value = String(priority || "MEDIUM").toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dateLabel(dateValue) {
  if (!dateValue) return "Not set";

  const parts = String(dateValue).split("-");

  if (parts.length !== 3) {
    return String(dateValue);
  }

  const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function mapTask(task) {
  return {
    id: task.id,
    title: task.title || "",
    description: task.description || "",
    project: task.project || "Personal",
    priority: normalizePriority(task.priority),
    status: normalizeStatus(task.status),
    deadline: task.deadline || "",
    due: dateLabel(task.deadline),
  };
}

function toApiTask(task, status = task.status) {
  return {
    title: task.title.trim(),
    description: task.description || "",
    status: statusToApi(status),
    priority: task.priority.toUpperCase(),
    deadline: task.deadline || null,
  };
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [activeNav, setActiveNav] = useState("Overview");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [due, setDue] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTasks() {
      try {
        const data = await getTasks();

        if (active) {
          setTasks(data.map(mapTask));
          setApiError("");
        }
      } catch {
        if (active) {
          setApiError(
              "Could not connect to the backend. Check that Spring Boot and MySQL are running."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      active = false;
    };
  }, []);

  const completed = tasks.filter(
      (task) => task.status === "Completed"
  ).length;

  const inProgress = tasks.filter(
      (task) => task.status === "In Progress"
  ).length;

  const pending = tasks.filter(
      (task) => task.status === "To Do"
  ).length;

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.project.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
        filter === "All" || task.status === filter;

    const matchesPage =
        activeNav !== "My Tasks" || task.status !== "Completed";

    return matchesSearch && matchesFilter && matchesPage;
  });

  function openCreateForm() {
    setApiError("");
    setTitle("");
    setPriority("Medium");
    setDue("");
    setShowForm(true);
  }

  function startEditing(task) {
    setApiError("");

    setEditingTask({
      ...task,
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      due: task.deadline || "",
    });
  }

  async function addTask(event) {
    event.preventDefault();

    if (!title.trim() || saving) return;

    const newTask = {
      title: title.trim(),
      description: "",
      project: "Personal",
      priority,
      status: "To Do",
      deadline: due,
    };

    setSaving(true);
    setApiError("");

    try {
      const savedTask = await createTaskApi(toApiTask(newTask));

      setTasks((current) => [mapTask(savedTask), ...current]);
      setTitle("");
      setPriority("Medium");
      setDue("");
      setShowForm(false);
    } catch (error) {
      setApiError(error.message || "Failed to create task.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEditedTask(event) {
    event.preventDefault();

    if (!editingTask || !editingTask.title.trim() || saving) {
      return;
    }

    setSaving(true);
    setApiError("");

    const updatedData = {
      ...editingTask,
      title: editingTask.title.trim(),
      deadline: editingTask.due || "",
    };

    try {
      const savedTask = await updateTaskApi(
          editingTask.id,
          toApiTask(updatedData, editingTask.status)
      );

      setTasks((current) =>
          current.map((task) =>
              task.id === editingTask.id ? mapTask(savedTask) : task
          )
      );

      setEditingTask(null);
    } catch (error) {
      setApiError(error.message || "Failed to save task changes.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id, newStatus) {
    const task = tasks.find((item) => item.id === id);

    if (!task) return;

    setApiError("");

    try {
      const updatedTask = await updateTaskApi(
          id,
          toApiTask(task, newStatus)
      );

      setTasks((current) =>
          current.map((item) =>
              item.id === id ? mapTask(updatedTask) : item
          )
      );
    } catch (error) {
      setApiError(error.message || "Failed to update task status.");
    }
  }


  async function handleDeleteTask(id) {
    const task = tasks.find((item) => item.id === id);

    if (!task) return;

    const confirmed = window.confirm(
        `Are you sure you want to delete "${task.title}"?`
    );

    if (!confirmed) return;

    setApiError("");

    try {
      await deleteTaskApi(id);

      setTasks((current) =>
          current.filter((item) => item.id !== id)
      );
    } catch (error) {
      setApiError(error.message || "Failed to delete task.");
    }
  }


  return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">T</div>
            <span>
            Task<span className="brand-accent">Flow</span>
          </span>
          </div>

          <div className="workspace-label">WORKSPACE</div>

          <nav className="navigation">
            {navigation.map((item) => (
                <button
                    key={item.label}
                    className={`nav-item ${
                        activeNav === item.label ? "active" : ""
                    }`}
                    onClick={() => {
                      setActiveNav(item.label);
                      setFilter("All");
                    }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}

                  {item.label === "My Tasks" && (
                      <span className="nav-count">{tasks.length}</span>
                  )}
                </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="upgrade-card">
              <div className="upgrade-symbol">✦</div>
              <strong>Make every day count</strong>
              <p>Small steps lead to big results.</p>
            </div>

            <div className="profile">
              <div className="avatar">R</div>

              <div className="profile-info">
                <strong>Rehan Shaikh</strong>
                <span>Workspace member</span>
              </div>

              <span className="profile-dots">···</span>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div className="breadcrumb">
              Workspace <span>/</span> {activeNav}
            </div>

            <div className="topbar-right">
              <div className="online-indicator">
                <span />
                {loading
                    ? "Connecting..."
                    : apiError
                        ? "Connection issue"
                        : "Backend connected"}
              </div>

              <button
                  className="icon-button"
                  aria-label="Notifications"
              >
                ♧
              </button>

              <div className="avatar small-avatar">R</div>
            </div>
          </header>

          <section className="page-content">
            <div className="welcome-row">
              <div>
                <div className="eyebrow">
                  <span className="sparkle">✦</span>
                  YOUR PRODUCTIVITY SPACE
                </div>

                <h1>
                  {activeNav === "Overview"
                      ? "Good to see you, Rehan"
                      : activeNav}
                </h1>

                <p className="subtitle">
                  A little progress each day adds up to big results.
                </p>
              </div>

              <button
                  className="primary-button"
                  onClick={openCreateForm}
              >
                <span>＋</span> Create task
              </button>
            </div>

            {apiError && (
                <div
                    role="alert"
                    style={{
                      margin: "16px 0",
                      padding: "12px 16px",
                      border: "1px solid rgba(255, 100, 100, 0.4)",
                      borderRadius: "10px",
                      color: "#ffaaaa",
                      background: "rgba(255, 70, 70, 0.08)",
                    }}
                >
                  {apiError}
                </div>
            )}

            <section className="stats-grid">
              <article className="stat-card">
                <div className="stat-top">
                  <span>Total tasks</span>
                  <span className="stat-icon blue">▤</span>
                </div>
                <div className="stat-number">{tasks.length}</div>
                <div className="stat-foot">Tasks in your workspace</div>
                <div className="stat-line blue-line" />
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>In progress</span>
                  <span className="stat-icon purple">◷</span>
                </div>
                <div className="stat-number">{inProgress}</div>
                <div className="stat-foot">Keep the momentum going</div>
                <div className="stat-line purple-line" />
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>To do</span>
                  <span className="stat-icon orange">◴</span>
                </div>
                <div className="stat-number">{pending}</div>
                <div className="stat-foot">Ready for your attention</div>
                <div className="stat-line orange-line" />
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Completed</span>
                  <span className="stat-icon green">✓</span>
                </div>
                <div className="stat-number">{completed}</div>
                <div className="stat-foot">Wins worth celebrating</div>
                <div className="stat-line green-line" />
              </article>
            </section>

            <section className="progress-card">
              <div className="progress-heading">
                <div>
                  <div className="section-kicker">YOUR MOMENTUM</div>
                  <h2>Progress overview</h2>
                  <p>Every completed task is a step forward.</p>
                </div>

                <div className="progress-percentage">
                  {tasks.length
                      ? Math.round((completed / tasks.length) * 100)
                      : 0}
                  %
                  <span>completed</span>
                </div>
              </div>

              <div className="progress-track">
                <div
                    className="progress-fill"
                    style={{
                      width: `${
                          tasks.length
                              ? (completed / tasks.length) * 100
                              : 0
                      }%`,
                    }}
                />
              </div>

              <div className="progress-legend">
              <span>
                <i className="legend-dot green-dot" /> {completed} completed
              </span>
                <span>
                <i className="legend-dot purple-dot" /> {inProgress} in progress
              </span>
                <span>
                <i className="legend-dot orange-dot" /> {pending} to do
              </span>
              </div>
            </section>

            <section className="tasks-section">
              <div className="tasks-heading">
                <div>
                  <div className="section-kicker">STAY ON TRACK</div>
                  <h2>
                    {activeNav === "Overview" ? "Your tasks" : activeNav}
                  </h2>
                </div>

                <button
                    className="text-button"
                    onClick={() => setActiveNav("My Tasks")}
                >
                  View my tasks ↗
                </button>
              </div>

              <div className="task-toolbar">
                <div className="search-box">
                  <span>⌕</span>
                  <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search tasks or projects..."
                  />
                </div>

                <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="All">All statuses</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="task-list">
                <div className="task-list-header">
                  <span>TASK NAME</span>
                  <span>PRIORITY</span>
                  <span>STATUS</span>
                  <span>DUE DATE</span>
                  <span>ACTIONS</span>
                </div>

                {loading && (
                    <div className="empty-state">
                      <strong>Loading tasks...</strong>
                      <p>Fetching your tasks from the database.</p>
                    </div>
                )}

                {!loading &&
                    filteredTasks.map((task) => (
                        <article className="task-row" key={task.id}>
                          <div className="task-name-cell">
                      <span
                          className={`task-check ${
                              task.status === "Completed" ? "checked" : ""
                          }`}
                      >
                        {task.status === "Completed" ? "✓" : "·"}
                      </span>

                            <div className="task-name-info">
                              <strong>{task.title}</strong>
                              <span>{task.project}</span>
                            </div>
                          </div>

                          <div>
                      <span
                          className={`priority-badge ${task.priority.toLowerCase()}`}
                      >
                        {task.priority}
                      </span>
                          </div>

                          <div>
                            <select
                                aria-label={`Status for ${task.title}`}
                                className={`status-select ${task.status
                                    .toLowerCase()
                                    .replace(" ", "-")}`}
                                value={task.status}
                                onChange={(event) =>
                                    changeStatus(task.id, event.target.value)
                                }
                            >
                              <option value="To Do">To Do</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>

                          <div className="due-date">{task.due}</div>

                          <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                          >
                            <button
                                type="button"
                                className="edit-button"
                                onClick={() => startEditing(task)}
                                aria-label={`Edit ${task.title}`}
                                title="Edit task"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  border: "1px solid rgba(120, 150, 210, 0.25)",
                                  borderRadius: "9px",
                                  background: "rgba(90, 120, 190, 0.08)",
                                  color: "#a8c5ff",
                                  cursor: "pointer",
                                  fontSize: "17px",
                                }}
                            >
                              ✎
                            </button>

                            <button
                                type="button"
                                className="delete-button"
                                onClick={() => handleDeleteTask(task.id)}
                                aria-label={`Delete ${task.title}`}
                                title="Delete task"
                            >
                              ×
                            </button>
                          </div>
                        </article>
                    ))}

                {!loading && filteredTasks.length === 0 && (
                    <div className="empty-state">
                      <span>✦</span>
                      <strong>No tasks found</strong>
                      <p>Try another search or create a new task.</p>
                    </div>
                )}
              </div>
            </section>

            <footer className="footer">
            <span>
              TaskFlow <span className="footer-dot">·</span> Built for better days
            </span>
              <span>Stay focused. Keep moving. ✦</span>
            </footer>
          </section>
        </main>

        {showForm && (
            <div
                className="modal-backdrop"
                onClick={() => {
                  if (!saving) setShowForm(false);
                }}
            >
              <form
                  className="task-modal"
                  onSubmit={addTask}
                  onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-heading">
                  <div>
                    <div className="section-kicker">NEW ITEM</div>
                    <h2>Create a task</h2>
                  </div>

                  <button
                      type="button"
                      className="modal-close"
                      onClick={() => setShowForm(false)}
                      disabled={saving}
                  >
                    ×
                  </button>
                </div>

                <label>Task title</label>
                <input
                    required
                    maxLength={150}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="What needs to get done?"
                />

                <label>Priority</label>
                <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>

                <label>Due date</label>
                <input
                    type="date"
                    value={due}
                    onChange={(event) => setDue(event.target.value)}
                />

                <div className="modal-actions">
                  <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowForm(false)}
                      disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                      type="submit"
                      className="primary-button"
                      disabled={saving}
                  >
                    {saving ? "Saving..." : "Create task"}
                  </button>
                </div>
              </form>
            </div>
        )}

        {editingTask && (
            <div
                className="modal-backdrop"
                onClick={() => {
                  if (!saving) setEditingTask(null);
                }}
            >
              <form
                  className="task-modal"
                  onSubmit={saveEditedTask}
                  onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-heading">
                  <div>
                    <div className="section-kicker">UPDATE ITEM</div>
                    <h2>Edit task</h2>
                  </div>

                  <button
                      type="button"
                      className="modal-close"
                      onClick={() => setEditingTask(null)}
                      disabled={saving}
                  >
                    ×
                  </button>
                </div>

                <label>Task title</label>
                <input
                    required
                    maxLength={150}
                    value={editingTask.title}
                    onChange={(event) =>
                        setEditingTask({
                          ...editingTask,
                          title: event.target.value,
                        })
                    }
                    placeholder="Task title"
                />

                <label>Description</label>
                <textarea
                    value={editingTask.description}
                    onChange={(event) =>
                        setEditingTask({
                          ...editingTask,
                          description: event.target.value,
                        })
                    }
                    placeholder="Describe the task"
                    rows={3}
                />

                <label>Priority</label>
                <select
                    value={editingTask.priority}
                    onChange={(event) =>
                        setEditingTask({
                          ...editingTask,
                          priority: event.target.value,
                        })
                    }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>

                <label>Due date</label>
                <input
                    type="date"
                    value={editingTask.due}
                    onChange={(event) =>
                        setEditingTask({
                          ...editingTask,
                          due: event.target.value,
                        })
                    }
                />

                <div className="modal-actions">
                  <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setEditingTask(null)}
                      disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                      type="submit"
                      className="primary-button"
                      disabled={saving}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
        )}
      </div>
  );
}

export default App;
