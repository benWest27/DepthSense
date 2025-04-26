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

  // Render the login form for the selected role
  function showLoginForm(role) {
    selectedRole = role;
    document.getElementById("login-overlay").style.display = "block";
    document.getElementById("register-overlay").style.display = "none";
  }

  // Render the registration form for the selected role
  function showRegisterForm(role) {
    selectedRole = role;
    document.getElementById("register-overlay").style.display = "block";
    document.getElementById("login-overlay").style.display = "none";
  }

  // Attach event listeners to the login and register buttons
  document.querySelector(".login-button").addEventListener("click", () => {
    showLoginForm("viewer");
  });

  document.querySelector(".register-button").addEventListener("click", () => {
    showRegisterForm("viewer");
  });

  // Attach event listeners to the cancel buttons to hide the overlays
  document.querySelectorAll(".cancel-button").forEach(button => {
    button.addEventListener("click", () => {
      document.getElementById("login-overlay").style.display = "none";
      document.getElementById("register-overlay").style.display = "none";
    });
  });

  // Handle login form submission using id="login-button"
  const loginForm = document.querySelector("#login-overlay .login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const username = document.getElementById("login-username").value;
      const password = document.getElementById("login-password").value;
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
          redirectToRoleService(selectedRole || "viewer");
        })
        .catch(error => {
          alert("Login failed. Please check your credentials.");
        });
    });
  }

  // Handle registration form submission using id="register-button"
  const registerForm = document.querySelector("#register-overlay .register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const username = document.getElementById("register-username").value;
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role: selectedRole || "viewer" })
      })
        .then(response => {
          if (!response.ok) throw new Error("Registration failed");
          return response.json();
        })
        .then(() => {
          alert("Registration successful! Please log in.");
          showLoginForm(selectedRole || "viewer");
        })
        .catch(error => {
          alert("Registration failed. Please try again.");
        });
    });
  }

  // On load: check if already logged in and redirect, else show welcome
  const token = localStorage.getItem("jwt");
  if (token) {
    // Verify token with backend before redirecting
    fetch('/api/auth/verify', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(resp => {
        if (!resp.ok) throw new Error("Invalid token");
        return resp.json();
      })
      .then(data => {
        if (data && data.user && data.user.role) {
          redirectToRoleService(data.user.role);
        } else {
          localStorage.removeItem("jwt");
          renderWelcome();
        }
      })
      .catch(() => {
        localStorage.removeItem("jwt");
        renderWelcome();
      });
  } else {
    renderWelcome();
  }
});