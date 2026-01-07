export function requireAuthClient(redirectTo = "/login") {
  if (typeof window !== "undefined") {
    // Check for user profile as proof of session (soft check)
    // The actual API security is handled by HttpOnly cookies which React can't see.
    const user = localStorage.getItem("user");
    
    if (!user) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }
  return false;
}
