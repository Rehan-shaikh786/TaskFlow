
const API_BASE_URL = "http://localhost:8080/api/tasks";

async function request(url, options = {}) {
    let response;

    try {
        response = await fetch(url, options);
    } catch {
        throw new Error(
            "Cannot connect to the server. Make sure Spring Boot is running."
        );
    }

    if (!response.ok) {
        let message = `Request failed (${response.status})`;

        try {
            const data = await response.json();
            if (data.message) message = data.message;
            else if (data.error) message = data.error;
        } catch {
            if (response.status === 404) {
                message = "Task not found.";
            } else if (response.status >= 500) {
                message = "Server error. Please try again.";
            }
        }

        throw new Error(message);
    }

    if (response.status === 204) return null;

    return response.json();
}

export function getTasks() {
    return request(API_BASE_URL);
}

export function createTask(task) {
    return request(API_BASE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
    });
}

export function updateTask(id, task) {
    return request(`${API_BASE_URL}/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
    });
}

export function deleteTask(id) {
    return request(`${API_BASE_URL}/${id}`, {
        method: "DELETE",
    });
}
