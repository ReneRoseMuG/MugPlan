const AUTH_KEY = "mugplan.auth";
const USER_ROLE_KEY = "userRole";

export function isAuthenticated() {
  return window.localStorage.getItem(AUTH_KEY) === "1";
}

export function loginAsAdmin() {
  window.localStorage.setItem(AUTH_KEY, "1");
  window.localStorage.setItem(USER_ROLE_KEY, "ADMIN");
}

export function logout() {
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(USER_ROLE_KEY);
}
