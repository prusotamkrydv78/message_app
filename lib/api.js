export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

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
  validatePhone: (token, countryCode, phoneNumber) => request(`/api/v1/users/validate-phone?countryCode=${encodeURIComponent(countryCode)}&phoneNumber=${encodeURIComponent(phoneNumber)}`, { token }),
  conversations: (token) => request("/api/v1/conversations", { token }),
  startConversation: (token, userId) => request("/api/v1/conversations", { method: "POST", token, body: { userId } }),
  acceptConversation: (token, conversationId) => request(`/api/v1/conversations/${conversationId}/accept`, { method: "PUT", token }),
  deleteConversation: (token, conversationId) => request(`/api/v1/conversations/${conversationId}`, { method: "DELETE", token }),
  messagesWith: (token, userId) => request(`/api/v1/messages/with/${encodeURIComponent(userId)}`, { token }),
};
