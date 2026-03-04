async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload;
}

export const api = {
  getProviders() {
    return request("/api/providers");
  },
  addProvider(name) {
    return request("/api/providers", {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },
  deleteProvider(name) {
    return request(`/api/providers/${encodeURIComponent(name)}`, {
      method: "DELETE"
    });
  },
  getBills() {
    return request("/api/bills");
  },
  addBill(input) {
    return request("/api/bills", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updateBillStatus(id, status) {
    return request(`/api/bills/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },
  deleteBill(id) {
    return request(`/api/bills/${id}`, {
      method: "DELETE"
    });
  },
  getDashboard(year) {
    const query = year ? `?year=${encodeURIComponent(year)}` : "";
    return request(`/api/dashboard${query}`);
  }
};
