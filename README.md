# TaskFlow — Full-Stack Task Management System

TaskFlow is a task management application built using React, Spring Boot, and MySQL. It helps users create, view, edit, update, and delete tasks through a modern dashboard.

## Features

- Create and manage tasks
- Edit task details
- Set task priority and deadline
- Update task status
- Delete tasks with confirmation
- Store tasks in MySQL
- REST API integration
- Modern React dashboard

## Technology Stack

**Frontend:** React, Vite, JavaScript, CSS

**Backend:** Java, Spring Boot, Spring Data JPA, Maven, REST API

**Database:** MySQL

## Project Structure

```text
TaskFlow/
├── frontend/
├── backend/
├── database/
└── README.md
```

## Prerequisites

- Java JDK
- Maven
- Node.js and npm
- MySQL Server

## Database Setup

Create the database in MySQL:

```sql
CREATE DATABASE taskflow_db;
```

Configure the MySQL username and password in `backend/src/main/resources/application.properties`. Do not publish your actual password.

## Run the Backend

```powershell
cd backend
mvn spring-boot:run
```

Backend URL: `http://localhost:8080`

## Run the Frontend

Open a second terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Frontend URL: `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Get all tasks |
| GET | `/api/tasks/{id}` | Get one task |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/{id}` | Update a task |
| DELETE | `/api/tasks/{id}` | Delete a task |

## Author

**Rehan Iqbal Shaikh**

GitHub: https://github.com/Rehan-shaikh786
