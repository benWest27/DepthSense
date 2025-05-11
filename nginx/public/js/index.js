document.addEventListener("DOMContentLoaded", () => {
  console.log("nginx index.js: DOMContentLoaded event triggered");
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
    console.log("nginx index.js: redirectToRoleService called with role:", role);
    if (role === "admin" || role === "creator") {
      window.location.href = "/editor";
    } else if (role === "viewer") {
      window.location.href = "/viewer";
    }
  }

  // Utility: Show notification
  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000); // Automatically remove after 5 seconds
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
    console.log("nginx index.js: Login button clicked");
    showLoginForm("viewer");
  });

  document.querySelector(".register-button").addEventListener("click", () => {
    console.log("nginx index.js: Register button clicked");
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
      document.getElementById("login-overlay").style.display = "none";
      e.preventDefault();
      console.log("nginx index.js: Login form submitted");
      const username = document.getElementById("login-username").value;
      const password = document.getElementById("login-password").value;
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
        .then(response => {
          console.log("nginx index.js: Received login response", response.status);
          if (!response.ok) throw new Error("Authentication failed");
          return response.json();
        })
        .then(data => {
          console.log("nginx index.js: Login successful, token received");
          // Use the actual role from the response if available; otherwise decode from token.
          let actualRole;
          if(data.user && data.user.role) {
            actualRole = data.user.role;
          } else {
            console.warn("nginx index.js: user.role not in response, decoding from token");
            localStorage.setItem("jwt", data.token);
            actualRole = getUserRoleFromToken();
          }
          console.log("nginx index.js: actualRole from token:", actualRole);
          localStorage.setItem("jwt", data.token);
          redirectToRoleService(actualRole);
        })
        .catch(error => {
          console.error("nginx index.js: Login failed", error);
          showNotification("Login failed. Please check your credentials.", "error");
        });
    });
  }

  // Handle registration form submission using id="register-button"
  const registerForm = document.querySelector("#register-overlay .register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", function(e) {
      e.preventDefault();
      console.log("nginx index.js: Registration form submitted");
      const username = document.getElementById("register-username").value;
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role: selectedRole || "viewer" })
      })
        .then(response => {
          console.log("nginx index.js: Received registration response", response.status);
          if (!response.ok) throw new Error("Registration failed");
          return response.json();
        })
        .then(() => {
          console.log("nginx index.js: Registration successful");
          showNotification("Registration successful! Please log in.", "success");
          showLoginForm(selectedRole || "viewer");
        })
        .catch(error => {
          console.error("nginx index.js: Registration failed", error);
          showNotification("Registration failed. Please try again.", "error");
        });
      document.getElementById("register-overlay").style.display = "none";
    });
  }

});