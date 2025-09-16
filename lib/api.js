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
  acceptConversation: (token, conversationId) => request(`/api/v1/conversations/${encodeURIComponent(conversationId)}/accept`, { method: "POST", token }),
  deleteConversation: (token, conversationId) => request(`/api/v1/conversations/${encodeURIComponent(conversationId)}`, { method: "DELETE", token }),
  messagesWith: (token, userId) => request(`/api/v1/messages/with/${encodeURIComponent(userId)}`, { token }),
  // Call records
  callsWith: (token, userId) => request(`/api/v1/calls/with/${encodeURIComponent(userId)}`, { token }),
  createCall: (token, data) => request("/api/v1/calls", { method: "POST", token, body: data }),
  // Groups
  groups: (token) => request('/api/v1/groups', { token }),
  createGroup: (token, data) => request('/api/v1/groups', { method: 'POST', token, body: data }),
  groupDetails: (token, id) => request(`/api/v1/groups/${encodeURIComponent(id)}`, { token }),
  groupMessages: (token, id) => request(`/api/v1/group-messages/${encodeURIComponent(id)}`, { token }),
  sendGroupMessage: (token, id, text, clientId) => request(`/api/v1/group-messages/${encodeURIComponent(id)}`, { method: 'POST', token, body: { text, clientId } }),
  addGroupMembers: (token, id, memberIds) => request(`/api/v1/groups/${encodeURIComponent(id)}/members`, { method: 'POST', token, body: { memberIds } }),
  removeGroupMember: (token, id, userId) => request(`/api/v1/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE', token }),
  // Uploads
  uploadFiles: async (token, files) => {
    const form = new FormData();
    (files || []).forEach((f) => form.append('files', f));
    const res = await fetch(`${API_BASE}/api/v1/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
      credentials: 'include',
    });
    const contentType = res.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const message = typeof payload === 'string' ? payload : payload?.message || 'Upload failed';
      throw new Error(message);
    }
    return payload;
  },
  // Single-file upload with progress callback (0..1)
  uploadFile: (token, file, onProgress) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/v1/uploads`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (!onProgress || !e.lengthComputable) return;
      onProgress(Math.max(0, Math.min(1, e.loaded / e.total)));
    };
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText || '{}');
            resolve(resp);
          } catch (e) {
            resolve({ attachments: [] });
          }
        } else {
          reject(new Error(xhr.responseText || 'Upload failed'));
        }
      }
    };
    const form = new FormData();
    form.append('files', file);
    xhr.send(form);
  }),
};
