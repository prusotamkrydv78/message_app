export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://b-message-app.onrender.com";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include", // to send/receive refreshToken cookie
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const message = typeof payload === "string" ? payload : payload?.message || "Request failed";
    throw new Error(message);
  }
  return payload;
}

export const api = {
  register: (data) => request("/api/v1/auth/register", { method: "POST", body: data }),
  login: (data) => request("/api/v1/auth/login", { method: "POST", body: data }),
  refresh: () => request("/api/v1/auth/refresh", { method: "POST" }),
  logout: () => request("/api/v1/auth/logout", { method: "POST" }),
  me: (token) => request("/api/v1/auth/me", { token }),
  users: (token, q = "") => request(`/api/v1/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, { token }),
  conversations: (token) => request("/api/v1/conversations", { token }),
  startConversation: (token, userId) => request("/api/v1/conversations", { method: "POST", token, body: { userId } }),
  messagesWith: (token, userId) => request(`/api/v1/messages/with/${encodeURIComponent(userId)}`, { token }),
};
