export function getToken() {
  return localStorage.getItem("token");
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function logout() {
  localStorage.removeItem("token");
}
