/**
 * Automated API integration suite using Jest.
 * Runs against a live or local target API server.
 */

const base = process.env.BASE_URL || "http://localhost:3000/api";
const mk = () => Math.floor(Date.now() + Math.random() * 1000);
const pass = process.env.PASSWORD || "Password123!";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {}),
  };
}

async function parseJsonSafe(res) {
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t };
  }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseJsonSafe(res);
  return { status: res.status, data };
}

describe("API Smoke Test Suite", () => {
  let runId;
  let tokenA, tokenB;
  let projectAId, projectBId;
  let taskAId, taskBId;

  // 1) Setup: Generate dynamic user profiles, register, and log them in
  beforeAll(async () => {
    runId = mk();
    const emailA = `userA${runId}@example.com`;
    const emailB = `userB${runId}@example.com`;
    const usernameA = `UserA${runId}`;
    const usernameB = `UserB${runId}`;

    // Register User A and User B
    await req("POST", "/users/register", {
      body: { username: usernameA, email: emailA, password: pass },
    });
    await req("POST", "/users/register", {
      body: { username: usernameB, email: emailB, password: pass },
    });

    // Authenticate User A
    const loginA = await req("POST", "/users/login", {
      body: { email: emailA, password: pass },
    });
    if (loginA.status !== 200 || !loginA.data?.token) {
      throw new Error(`Setup failed: LoginA failed with status ${loginA.status}`);
    }
    tokenA = loginA.data.token;

    // Authenticate User B
    const loginB = await req("POST", "/users/login", {
      body: { email: emailB, password: pass },
    });
    if (loginB.status !== 200 || !loginB.data?.token) {
      throw new Error(`Setup failed: LoginB failed with status ${loginB.status}`);
    }
    tokenB = loginB.data.token;
  });

  // 2) Best-effort teardown to leave database clean after execution
  afterAll(async () => {
    if (taskAId) await req("DELETE", `/tasks/${taskAId}`, { token: tokenA });
    if (taskBId) await req("DELETE", `/tasks/${taskBId}`, { token: tokenB });
    if (projectAId) await req("DELETE", `/projects/${projectAId}`, { token: tokenA });
    if (projectBId) await req("DELETE", `/projects/${projectBId}`, { token: tokenB });
  });

  // 2) Protected routes without token
  test("401 without token on GET /projects", async () => {
    const res = await req("GET", "/projects");
    expect(res.status).toBe(401);
  });

  // 3) Projects CRUD + ownership checks
  describe("Projects Module & Isolation", () => {
    test("200 on A GET /projects and successful creations", async () => {
      // Create Project A
      const createPA = await req("POST", "/projects", {
        token: tokenA,
        body: { name: `ProjA${runId}`, description: `DescA${runId}` },
      });
      expect(createPA.status).toBe(201);
      expect(createPA.data?._id).toBeDefined();
      projectAId = createPA.data._id;

      // Create Project B
      const createPB = await req("POST", "/projects", {
        token: tokenB,
        body: { name: `ProjB${runId}`, description: `DescB${runId}` },
      });
      expect(createPB.status).toBe(201);
      expect(createPB.data?._id).toBeDefined();
      projectBId = createPB.data._id;

      // User A gets their projects array
      const getProjectsA = await req("GET", "/projects", { token: tokenA });
      expect(getProjectsA.status).toBe(200);
      expect(Array.isArray(getProjectsA.data)).toBe(true);
    });

    test("200 on A GET own project", async () => {
      const getProjectAByA = await req("GET", `/projects/${projectAId}`, { token: tokenA });
      expect(getProjectAByA.status).toBe(200);
      expect(getProjectAByA.data?._id).toBe(projectAId);
    });

    test("200 on A PUT own project", async () => {
      const updateProjectA = await req("PUT", `/projects/${projectAId}`, {
        token: tokenA,
        body: { name: `ProjAUpdated${runId}`, description: `DescAUpdated${runId}` },
      });
      expect(updateProjectA.status).toBe(200);
      expect(updateProjectA.data?.name).toBe(`ProjAUpdated${runId}`);
    });

    test("401 without token on GET and POST tasks for projectA", async () => {
      const noTokenGetTasksA = await req("GET", `/projects/${projectAId}/tasks`);
      expect(noTokenGetTasksA.status).toBe(401);

      const noTokenCreateTaskA = await req("POST", `/projects/${projectAId}/tasks`, {
        body: { title: "NoAuth", description: "x" },
      });
      expect(noTokenCreateTaskA.status).toBe(401);
    });

    test("403 Cross-user protection blocks User A from accessing User B's project data", async () => {
      const createTaskBByA = await req("POST", `/projects/${projectBId}/tasks`, {
        token: tokenA,
        body: { title: `BadTask${runId}`, description: "x", status: "To Do" },
      });
      expect(createTaskBByA.status).toBe(403);

      const getTasksBByA = await req("GET", `/projects/${projectBId}/tasks`, { token: tokenA });
      expect(getTasksBByA.status).toBe(403);

      const getProjectBByA = await req("GET", `/projects/${projectBId}`, { token: tokenA });
      expect(getProjectBByA.status).toBe(403);

      const updateProjectBByA = await req("PUT", `/projects/${projectBId}`, {
        token: tokenA,
        body: { name: "Hacked", description: "Nope" },
      });
      expect(updateProjectBByA.status).toBe(403);

      const deleteProjectBByA = await req("DELETE", `/projects/${projectBId}`, { token: tokenA });
      expect(deleteProjectBByA.status).toBe(403);
    });
  });

  // 4) Tasks CRUD for parent project + ownership checks
  describe("Tasks Module & Isolation", () => {
    test("201 on task creations and 200 on GET tasksA", async () => {
      const createTaskA = await req("POST", `/projects/${projectAId}/tasks`, {
        token: tokenA,
        body: { title: `TaskA${runId}`, description: "TDesc", status: "To Do" },
      });
      expect(createTaskA.status).toBe(201);
      expect(createTaskA.data?._id).toBeDefined();
      taskAId = createTaskA.data._id;

      const createTaskB = await req("POST", `/projects/${projectBId}/tasks`, {
        token: tokenB,
        body: { title: `TaskB${runId}`, description: "TDesc", status: "In Progress" },
      });
      expect(createTaskB.status).toBe(201);
      expect(createTaskB.data?._id).toBeDefined();
      taskBId = createTaskB.data._id;

      const getTasksA = await req("GET", `/projects/${projectAId}/tasks`, { token: tokenA });
      expect(getTasksA.status).toBe(200);
    });

    test("200 on A PUT and DELETE own taskA", async () => {
      const updateTaskAByA = await req("PUT", `/tasks/${taskAId}`, {
        token: tokenA,
        body: { status: "Done" },
      });
      expect(updateTaskAByA.status).toBe(200);

      const deleteTaskAByA = await req("DELETE", `/tasks/${taskAId}`, { token: tokenA });
      expect(deleteTaskAByA.status).toBe(200);
      
      // Nullify reference so afterAll teardown doesn't double-delete
      taskAId = null; 
    });

    test("403 on A cross-user adjustments to taskB", async () => {
      const updateTaskBByA = await req("PUT", `/tasks/${taskBId}`, {
        token: tokenA,
        body: { status: "Done" },
      });
      expect(updateTaskBByA.status).toBe(403);

      const deleteTaskBByA = await req("DELETE", `/tasks/${taskBId}`, { token: tokenA });
      expect(deleteTaskBByA.status).toBe(403);
    });
  });
});
