type LoginResponse = {
  code?: string;
};

async function ensureOk(response: Response, context: string): Promise<Response> {
  if (response.ok) return response;
  const body = await response.text();
  throw new Error(`${context} failed with ${response.status}: ${body}`);
}

async function login(baseUrl: string, username: string, password: string): Promise<string> {
  const response = await ensureOk(
    await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      redirect: "manual",
    }),
    "login",
  );

  const payload = await response.json() as LoginResponse;
  if (payload.code && payload.code !== "OK") {
    throw new Error(`login rejected: ${payload.code}`);
  }

  const cookies = response.headers.getSetCookie?.() ?? [];
  const sessionCookie = cookies.map((value) => value.split(";")[0]).join("; ");
  if (!sessionCookie) {
    throw new Error("login did not return a session cookie");
  }
  return sessionCookie;
}

async function postJson<T>(baseUrl: string, cookie: string, path: string, body: unknown): Promise<T> {
  const response = await ensureOk(
    await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    }),
    path,
  );
  return response.json() as Promise<T>;
}

async function main() {
  const baseUrl = process.env.FT04_LOAD_BASE_URL ?? "http://127.0.0.1:4174";
  const username = process.env.FT04_LOAD_USER ?? "test-admin";
  const password = process.env.FT04_LOAD_PASSWORD ?? "test-admin-password";
  const tourId = Number(process.env.FT04_LOAD_TOUR_ID ?? "0");
  const employeeId = Number(process.env.FT04_LOAD_EMPLOYEE_ID ?? "0");
  const employeeVersion = Number(process.env.FT04_LOAD_EMPLOYEE_VERSION ?? "0");
  const selectedAppointmentIds = (process.env.FT04_LOAD_APPOINTMENT_IDS ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!Number.isInteger(tourId) || tourId < 1 || !Number.isInteger(employeeId) || employeeId < 1) {
    throw new Error("FT04_LOAD_TOUR_ID and FT04_LOAD_EMPLOYEE_ID must be set to positive integers");
  }

  const cookie = await login(baseUrl, username, password);
  const previewIterations = Number(process.env.FT04_LOAD_PREVIEW_ITERATIONS ?? "10");
  const executeIterations = Number(process.env.FT04_LOAD_EXECUTE_ITERATIONS ?? "3");

  const previewStart = performance.now();
  const previewResponses = await Promise.allSettled(
    Array.from({ length: previewIterations }, () =>
      postJson(baseUrl, cookie, `/api/tours/${tourId}/employees/cascade-add/preview`, { employeeId })),
  );
  const previewDurationMs = Math.round(performance.now() - previewStart);

  let executeResponses: PromiseSettledResult<unknown>[] = [];
  let executeDurationMs = 0;
  if (employeeVersion > 0 && selectedAppointmentIds.length > 0) {
    const executeStart = performance.now();
    executeResponses = await Promise.allSettled(
      Array.from({ length: executeIterations }, () =>
        postJson(baseUrl, cookie, `/api/tours/${tourId}/employees/cascade-add`, {
          employeeId,
          employeeVersion,
          selectedAppointmentIds,
        })),
    );
    executeDurationMs = Math.round(performance.now() - executeStart);
  }

  const summary = {
    preview: {
      iterations: previewIterations,
      succeeded: previewResponses.filter((result) => result.status === "fulfilled").length,
      failed: previewResponses.filter((result) => result.status === "rejected").length,
      durationMs: previewDurationMs,
    },
    execute: {
      iterations: executeResponses.length,
      succeeded: executeResponses.filter((result) => result.status === "fulfilled").length,
      failed: executeResponses.filter((result) => result.status === "rejected").length,
      durationMs: executeDurationMs,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
