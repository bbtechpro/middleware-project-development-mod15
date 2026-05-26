/**
 * Basic API smoke test for the README requirements.
 *
 * Expected:
 * - 401 for protected routes without a token
 * - 403 for cross-user access attempts
 * - CRUD behavior for users/projects/tasks using the specified routes
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

function ok(name, cond, details) {
  if (cond) {
    console.log("PASS", name);
  } else {
    console.log("FAIL", name, details || "");
  }
  return cond;
}

(async () => {
  const runId = mk();
  const emailA = `userA${runId}@example.com`;
  const emailB = `userB${runId}@example.com`;
  const usernameA = `UserA${runId}`;
  const usernameB = `UserB${runId}`;

  const results = { pass: 0, fail: 0 };

  const checks = [];
  const pushCheck = (name, cond, details) => {
    checks.push({ name, cond, details });
  };

  // 1) Register + Login
  await req("POST", "/users/register", {
    body: { username: usernameA, email: emailA, password: pass },
  });
  await req("POST", "/users/register", {
    body: { username: usernameB, email: emailB, password: pass },
  });

  const loginA = await req("POST", "/users/login", {
    body: { email: emailA, password: pass },
  });
  const loginB = await req("POST", "/users/login", {
    body: { email: emailB, password: pass },
  });

  if (loginA.status !== 200 || !loginA.data?.token) {
    console.error("LoginA failed:", loginA.status, loginA.data);
    process.exit(1);
  }
  if (loginB.status !== 200 || !loginB.data?.token) {
    console.error("LoginB failed:", loginB.status, loginB.data);
    process.exit(1);
  }

  const tokenA = loginA.data.token;
  const tokenB = loginB.data.token;

  // 2) Protected routes without token
  const noTokenProjects = await req("GET", "/projects");
  pushCheck("401 without token on GET /projects", noTokenProjects.status === 401, noTokenProjects.data);

  // 3) Projects CRUD + ownership checks
  const createPA = await req("POST", "/projects", {
    token: tokenA,
    body: { name: `ProjA${runId}`, description: `DescA${runId}` },
  });
  const createPB = await req("POST", "/projects", {
    token: tokenB,
    body: { name: `ProjB${runId}`, description: `DescB${runId}` },
  });

  if (createPA.status !== 201 || !createPA.data?._id) {
    console.error("createPA failed:", createPA.status, createPA.data);
    process.exit(1);
  }
  if (createPB.status !== 201 || !createPB.data?._id) {
    console.error("createPB failed:", createPB.status, createPB.data);
    process.exit(1);
  }

  const projectAId = createPA.data._id;
  const projectBId = createPB.data._id;

  const getProjectsA = await req("GET", "/projects", { token: tokenA });
  pushCheck("200 on A GET /projects", getProjectsA.status === 200 && Array.isArray(getProjectsA.data), getProjectsA.data);

  const getProjectAByA = await req("GET", `/projects/${projectAId}`, { token: tokenA });
  pushCheck(
    "200 on A GET own project",
    getProjectAByA.status === 200 && getProjectAByA.data?._id === projectAId,
    getProjectAByA.data
  );

  const updateProjectA = await req("PUT", `/projects/${projectAId}`, {
    token: tokenA,
    body: { name: `ProjAUpdated${runId}`, description: `DescAUpdated${runId}` },
  });
  pushCheck(
    "200 on A PUT own project",
    updateProjectA.status === 200 && updateProjectA.data?.name === `ProjAUpdated${runId}`,
    updateProjectA.data
  );

  const noTokenGetTasksA = await req("GET", `/projects/${projectAId}/tasks`);
  pushCheck("401 without token on GET tasks for projectA", noTokenGetTasksA.status === 401, noTokenGetTasksA.data);

  const noTokenCreateTaskA = await req("POST", `/projects/${projectAId}/tasks`, { body: { title: "NoAuth", description: "x" } });
  pushCheck(
    "401 without token on POST tasks for projectA",
    noTokenCreateTaskA.status === 401,
    noTokenCreateTaskA.data
  );

  const createTaskBByA = await req("POST", `/projects/${projectBId}/tasks`, {
    token: tokenA,
    body: { title: `BadTask${runId}`, description: "x", status: "To Do" },
  });
  pushCheck("403 on A POST tasks for projectB", createTaskBByA.status === 403, createTaskBByA.data);

  const getTasksBByA = await req("GET", `/projects/${projectBId}/tasks`, { token: tokenA });
  pushCheck("403 on A GET tasks for projectB", getTasksBByA.status === 403, getTasksBByA.data);

  const getProjectBByA = await req("GET", `/projects/${projectBId}`, { token: tokenA });
  pushCheck("403 on A GET projectB", getProjectBByA.status === 403, getProjectBByA.data);

  const updateProjectBByA = await req("PUT", `/projects/${projectBId}`, {
    token: tokenA,
    body: { name: "Hacked", description: "Nope" },
  });
  pushCheck("403 on A PUT projectB", updateProjectBByA.status === 403, updateProjectBByA.data);

  const deleteProjectBByA = await req("DELETE", `/projects/${projectBId}`, { token: tokenA });
  pushCheck("403 on A DELETE projectB", deleteProjectBByA.status === 403, deleteProjectBByA.data);

  // 4) Tasks CRUD for parent project + ownership checks
  const createTaskA = await req("POST", `/projects/${projectAId}/tasks`, {
    token: tokenA,
    body: { title: `TaskA${runId}`, description: "TDesc", status: "To Do" },
  });
  const createTaskB = await req("POST", `/projects/${projectBId}/tasks`, {
    token: tokenB,
    body: { title: `TaskB${runId}`, description: "TDesc", status: "In Progress" },
  });

  if (createTaskA.status !== 201 || !createTaskA.data?._id) {
    console.error("createTaskA failed:", createTaskA.status, createTaskA.data);
    process.exit(1);
  }
  if (createTaskB.status !== 201 || !createTaskB.data?._id) {
    console.error("createTaskB failed:", createTaskB.status, createTaskB.data);
    process.exit(1);
  }

  const taskAId = createTaskA.data._id;
  const taskBId = createTaskB.data._id;

  const getTasksA = await req("GET", `/projects/${projectAId}/tasks`, { token: tokenA });
  pushCheck("200 on A GET tasksA", getTasksA.status === 200, getTasksA.data);

  const updateTaskAByA = await req("PUT", `/tasks/${taskAId}`, {
    token: tokenA,
    body: { status: "Done" },
  });
  pushCheck("200 on A PUT own taskA", updateTaskAByA.status === 200, updateTaskAByA.data);

  const deleteTaskAByA = await req("DELETE", `/tasks/${taskAId}`, { token: tokenA });
  pushCheck("200 on A DELETE own taskA", deleteTaskAByA.status === 200, deleteTaskAByA.data);

  const deletedTaskA = deleteTaskAByA.status === 200;

  const updateTaskBByA = await req("PUT", `/tasks/${taskBId}`, {
    token: tokenA,
    body: { status: "Done" },
  });
  pushCheck("403 on A PUT taskB", updateTaskBByA.status === 403, updateTaskBByA.data);

  const deleteTaskBByA = await req("DELETE", `/tasks/${taskBId}`, { token: tokenA });
  pushCheck("403 on A DELETE taskB", deleteTaskBByA.status === 403, deleteTaskBByA.data);

  // Cleanup (best-effort) as each owner
  if (!deletedTaskA) await req("DELETE", `/tasks/${taskAId}`, { token: tokenA });
  await req("DELETE", `/tasks/${taskBId}`, { token: tokenB });
  await req("DELETE", `/projects/${projectAId}`, { token: tokenA });
  await req("DELETE", `/projects/${projectBId}`, { token: tokenB });

  // Print results summary
  let failed = 0;
  for (const c of checks) {
    if (!c.cond) failed++;
    ok(c.name, c.cond, c.details);
  }

  if (failed > 0) {
    process.exit(1);
  }
})();

