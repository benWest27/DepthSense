document.addEventListener("DOMContentLoaded", () => {
  // State
  let selectedRole = null;

  // Utility: Check if JWT exists and decode role
  function getUserRoleFromToken() {
    const token = localStorage.getItem("jwt");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch {
      return null;
    }
  }

  // Utility: Redirect based on role
  function redirectToRoleService(role) {
    if (role === "admin" || role === "creator") {
      window.location.href = "/editor";
    } else if (role === "viewer") {
      window.location.href = "/viewer";
    }
  }

  // Render the main welcome/role selection page
  function renderWelcome() {
    document.body.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-700" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <h1 class="text-4xl font-bold text-white mb-8">Welcome to ParaViz</h1>
        <div class="flex gap-6" style="display:flex;gap:24px;">
          <button id="select-admin" class="bg-white py-3 px-8 rounded-xl shadow-md text-indigo-600 font-semibold hover:bg-gray-100 transition">Admin</button>
          <button id="select-creator" class="bg-white py-3 px-8 rounded-xl shadow-md text-indigo-600 font-semibold hover:bg-gray-100 transition">Editor</button>
          <button id="select-viewer" class="bg-white py-3 px-8 rounded-xl shadow-md text-indigo-600 font-semibold hover:bg-gray-100 transition">Viewer</button>
        </div>
      </div>
    `;
    document.getElementById("select-admin").onclick = () => showLoginForm("admin");
    document.getElementById("select-creator").onclick = () => showLoginForm("creator");
    document.getElementById("select-viewer").onclick = () => showLoginForm("viewer");
  }

  // Render the login/register form for the selected role
  function showLoginForm(role) {
    selectedRole = role;
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-700" style="min-height:100vh;display:flex;align-items:center;justify-content:center;">
        <div class="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
          <h1 class="text-3xl font-bold text-center text-gray-700 mb-2">ParaViz</h1>
          <p class="text-center text-gray-500 mb-6">Login as <span style="text-transform:capitalize">${role}</span> to access your visualizations</p>
          <form id="loginForm">
            <div class="mb-4">
              <label for="loginUsername" class="block text-gray-700 mb-1">Username</label>
              <input type="text" id="loginUsername" class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="your username" required />
            </div>
            <div class="mb-6">
              <label for="loginPassword" class="block text-gray-700 mb-1">Password</label>
              <input type="password" id="loginPassword" class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" required />
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition">Log In</button>
          </form>
          <div class="text-center mt-6">
            <span class="text-sm text-gray-500">Don't have an account?</span>
            <button id="showRegister" class="text-sm text-indigo-600 hover:text-indigo-800 ml-2" style="background:none;border:none;cursor:pointer;">Register</button>
          </div>
          <div class="text-center mt-2">
            <button id="backToWelcome" class="text-xs text-gray-400 hover:text-gray-700" style="background:none;border:none;cursor:pointer;">Back</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("loginForm").onsubmit = handleLogin;
    document.getElementById("showRegister").onclick = () => showRegisterForm(role);
    document.getElementById("backToWelcome").onclick = renderWelcome;
  }

  // Render the registration form for the selected role
  function showRegisterForm(role) {
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-700" style="min-height:100vh;display:flex;align-items:center;justify-content:center;">
        <div class="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
          <h1 class="text-3xl font-bold text-center text-gray-700 mb-2">ParaViz</h1>
          <p class="text-center text-gray-500 mb-6">Register as <span style="text-transform:capitalize">${role}</span></p>
          <form id="registerForm">
            <div class="mb-4">
              <label for="registerUsername" class="block text-gray-700 mb-1">Username</label>
              <input type="text" id="registerUsername" class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="your username" required />
            </div>
            <div class="mb-4">
              <label for="registerEmail" class="block text-gray-700 mb-1">Email Address</label>
              <input type="email" id="registerEmail" class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="you@example.com" required />
            </div>
            <div class="mb-6">
              <label for="registerPassword" class="block text-gray-700 mb-1">Password</label>
              <input type="password" id="registerPassword" class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" required />
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition">Register</button>
          </form>
          <div class="text-center mt-2">
            <button id="backToLogin" class="text-xs text-gray-400 hover:text-gray-700" style="background:none;border:none;cursor:pointer;">Back</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("registerForm").onsubmit = handleRegister;
    document.getElementById("backToLogin").onclick = () => showLoginForm(role);
  }

  // Handle login form submission
  function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(response => {
        if (!response.ok) throw new Error("Authentication failed");
        return response.json();
      })
      .then(data => {
        localStorage.setItem("jwt", data.token);
        redirectToRoleService(selectedRole);
      })
      .catch(error => {
        alert("Login failed. Please check your credentials.");
      });
  }

  // Handle registration form submission
  function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById("registerUsername").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role: selectedRole })
    })
      .then(response => {
        if (!response.ok) throw new Error("Registration failed");
        return response.json();
      })
      .then(() => {
        alert("Registration successful! Please log in.");
        showLoginForm(selectedRole);
      })
      .catch(error => {
        alert("Registration failed. Please try again.");
      });
  }

  // On load: check if already logged in and redirect, else show welcome
  const userRole = getUserRoleFromToken();
  if (userRole) {
    redirectToRoleService(userRole);
  } else {
    renderWelcome();
  }
});