Scenario
You are a junior backend developer at “Productivity Inc.,” a startup building a new suite of productivity tools. Your first major assignment is to build the entire backend for their flagship product, TaskMaster. This API will be the engine that powers the entire application, handling user accounts, project management, and individual tasks.

This is a capstone project designed to synthesize the skills you have learned across multiple modules. You will plan and execute the development of a real-world, secure, and functional RESTful API from the ground up. Success will require careful planning, clean code, and a solid understanding of authentication and authorization principles.

This project emphasizes the DRY (Don’t Repeat Yourself) principle. You are strongly encouraged to reference, reuse, and adapt the code and patterns you have developed in the labs and lessons from previous modules.

Core Concepts Assessed
Node.js & Express: Server setup, modular routing, middleware implementation, and RESTful API design.
MongoDB & Mongoose: Complex schema design with relationships (ref), data validation, and advanced Mongoose queries for CRUD operations.
Authentication & Authorization: JWT-based user authentication (registration and login), password hashing with bcrypt, and multi-layered, ownership-based authorization rules.
Instructions
Phase 1: Planning and Setup (Foundation)
Plan Your API: Before writing any code, plan your data models and API endpoints. Think about the relationships between users, projects, and tasks. What information does each model need? What routes will you need to perform all the required actions? Creating a simple README.md to outline your API (e.g., POST /api/users/login, GET /api/projects, etc.) is highly recommended.
Project Initialization:
Create a new project directory and initialize it with npm.
Install all necessary dependencies: express, mongoose, bcrypt, jsonwebtoken, dotenv.
Create a .gitignore file to exclude node_modules and .env.
Environment Configuration: Create a .env file to store your MONGO_URI, PORT, and a secure JWT_SECRET.
Modular Structure: Design a clean, modular folder structure. All logic should be separated by concern. A suggested structure:
config/ (for database connection)
models/ (for Mongoose schemas)
routes/api/ (for different route files like userRoutes.js, projectRoutes.js, etc.)
utils/ (for authentication helpers)
server.js (main entry point)
Phase 2: Data Modeling (The Blueprint)
User Model: Define a userSchema that includes fields for username, email (must be unique), and password. It must include a pre-save hook to hash the password using bcrypt, as demonstrated in Module 418.
Project Model: Define a projectSchema. A project should have a name, a description, and, most importantly, a reference to the user who owns it. This is a critical field for authorization.

// Example field in projectSchema
user: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true
}
Task Model: Define a taskSchema. A task should have title, description, a status (e.g., ‘To Do’, ‘In Progress’, ‘Done’), and a reference to the project it belongs to.
Phase 3: Authentication API (The Gatekeeper)
User Routes: Create userRoutes.js.
Registration (POST /api/users/register): This endpoint should create a new user, ensuring the password gets hashed by the model’s pre-save hook.
Login (POST /api/users/login): This endpoint should find a user by their email, compare the provided password with the stored hash, and, if successful, generate and return a signed JSON Web Token (JWT).
Phase 4: Projects API (Managing the Big Picture)
Project Routes: Create projectRoutes.js.
Security First: All routes in this file must be protected by your authentication middleware. Only a logged-in user can perform any action on projects.
Full CRUD:
POST /api/projects: Create a new project. The owner’s ID must be taken from the req.user object (provided by the auth middleware) and saved with the new project.
GET /api/projects: Get all projects owned by the currently logged-in user.
GET /api/projects/:id: Get a single project by its ID. This must be protected by an ownership check—a user can only get a project they own.
PUT /api/projects/:id: Update a project. Also protected by an ownership check.
DELETE /api/projects/:id: Delete a project. Also protected by an ownership check.
Phase 5: Tasks API (The Nitty-Gritty)
Task Routes: Create taskRoutes.js.
Nested & Secure: The key here is that tasks are children of projects. This relationship must be reflected in your routes and your security model.
Full CRUD for Tasks:
POST /api/projects/:projectId/tasks: Create a new task for a specific project. Before creating the task, you must verify that the logged-in user owns the project specified by :projectId.
GET /api/projects/:projectId/tasks: Get all tasks for a specific project. This also requires an ownership check on the parent project.
PUT /api/tasks/:taskId: Update a single task. This is the most complex authorization check. You must:
Find the task by :taskId.
From the task, find its parent project.
Verify that the logged-in user owns that parent project.
DELETE /api/tasks/:taskId: Delete a single task. This requires the same complex authorization check as the update route.
Submission Instructions
Ensure your application runs without errors.
Test every endpoint thoroughly using an API client like Insomnia or Postman. Pay special attention to the security rules:
Try to access protected routes without a token.
Log in as User A and attempt to access data owned by User B. All such attempts should be rejected with a 403 Forbidden or similar status.

- API-Smoke-Test: Initializes environment configurations by defining a base URL, a standardized password, and generating randomized unique identifiers for testing inputs.Registers and logs in two separate test users to obtain unique JWT authentication tokens needed for isolation checks.Validates authorization gates by verifying that requests to protected routes without a valid token are rejected with a 401 Unauthorized status.Verifies core CRUD operations to ensure that authorized users can successfully create, read, update, and delete their own projects and tasks.Enforces multi-tenant data isolation by confirming that any cross-user access attempts to view or alter another user's data are blocked with a 403 Forbidden status.
-- I compiled the api-smoke-tests into api.test.js and installed dependencies with npm i --sav-dev jest and ran the automated tests.
- All tests passed, as shown in this screenshot: [](Jest_Test_Results.jpg)