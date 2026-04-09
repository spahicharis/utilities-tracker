const TOKEN_STORAGE_KEY = "ut_token";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();

function buildUrl(path) {
  if (!API_BASE_URL) {
    return path;
  }
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return;
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function request(path, options = {}) {
  const { headers = {}, ...fetchOptions } = options;
  const token = getStoredToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers
    },
    ...fetchOptions
  });

  let payload;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new Event("ut:unauthorized"));
    }
    throw new Error(payload?.error || "Request failed.");
  }

  return payload;
}

export const api = {
  getProperties() {
    return request("/api/properties");
  },
  addProperty(name) {
    return request("/api/properties", {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },
  updateProperty(id, name) {
    return request(`/api/properties/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name })
    });
  },
  deleteProperty(id) {
    return request(`/api/properties/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },
  getProviders() {
    return request("/api/providers");
  },
  getPlaystationAccounts() {
    return request("/api/playstation-accounts");
  },
  addProvider(provider) {
    return request("/api/providers", {
      method: "POST",
      body: JSON.stringify(provider)
    });
  },
  addPlaystationAccount(input) {
    return request("/api/playstation-accounts", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updatePlaystationAccountStatus(id, status) {
    return request(`/api/playstation-accounts/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },
  addPlaystationGame(accountId, input) {
    return request(`/api/playstation-accounts/${encodeURIComponent(accountId)}/games`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  addPlaystationLibraryGame(input) {
    return request("/api/playstation-accounts/games", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updateProvider(name, provider) {
    return request(`/api/providers/${encodeURIComponent(name)}`, {
      method: "PATCH",
      body: JSON.stringify(provider)
    });
  },
  deletePlaystationAccount(id) {
    return request(`/api/playstation-accounts/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },
  deletePlaystationGame(accountId, gameId) {
    return request(`/api/playstation-accounts/${encodeURIComponent(accountId)}/games/${encodeURIComponent(gameId)}`, {
      method: "DELETE"
    });
  },
  deletePlaystationLibraryGame(gameId) {
    return request(`/api/playstation-accounts/games/${encodeURIComponent(gameId)}`, {
      method: "DELETE"
    });
  },
  deleteProvider(name) {
    return request(`/api/providers/${encodeURIComponent(name)}`, {
      method: "DELETE"
    });
  },
  getBills(propertyId) {
    const query = `?propertyId=${encodeURIComponent(propertyId)}`;
    return request(`/api/bills${query}`);
  },
  getSubscriptions(propertyId) {
    const query = `?propertyId=${encodeURIComponent(propertyId)}`;
    return request(`/api/subscriptions${query}`);
  },
  getVehicleRegistrations(propertyId) {
    const query = `?propertyId=${encodeURIComponent(propertyId)}`;
    return request(`/api/vehicle-registrations${query}`);
  },
  addBill(input) {
    return request("/api/bills", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  addSubscription(input) {
    return request("/api/subscriptions", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  addVehicleRegistration(input) {
    return request("/api/vehicle-registrations", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updateSubscription(id, input) {
    return request(`/api/subscriptions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  updateVehicleRegistration(id, input) {
    return request(`/api/vehicle-registrations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  deleteSubscription(id, propertyId) {
    return request(`/api/subscriptions/${encodeURIComponent(id)}?propertyId=${encodeURIComponent(propertyId)}`, {
      method: "DELETE"
    });
  },
  deleteVehicleRegistration(id, propertyId) {
    return request(`/api/vehicle-registrations/${encodeURIComponent(id)}?propertyId=${encodeURIComponent(propertyId)}`, {
      method: "DELETE"
    });
  },
  importBillsCsv(input) {
    return request("/api/bills/import", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updateBillStatus(id, status, propertyId) {
    return request(`/api/bills/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, propertyId })
    });
  },
  deleteBill(id, propertyId) {
    return request(`/api/bills/${id}?propertyId=${encodeURIComponent(propertyId)}`, {
      method: "DELETE"
    });
  },
  getDashboard(year, propertyId) {
    const query = new URLSearchParams();
    if (year) {
      query.set("year", year);
    }
    query.set("propertyId", propertyId);
    return request(`/api/dashboard?${query.toString()}`);
  }
};
