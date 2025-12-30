export function requireAuthClient(redirectTo = "/login") {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }
  return false;
}
