document.addEventListener("DOMContentLoaded", () => {
  // Function to handle login and navigate to the editor service
  function navigateToEditor(event) {
    console.log("Login form submitted"); // Debugging line
    event.preventDefault(); // Prevent form submission

    // Get email and password from the form inputs
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Call the auth_service login endpoint
    fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Authentication failed");
        }
        return response.json();
      })
      .then(data => {
        // Save the token (assumes response is { token: "..." })
        localStorage.setItem("jwt", data.token);

        // Redirect to the editor UI
        window.location.href = '/editor';
      })
      .catch(error => {
        console.error("Error during authentication:", error);
        alert("Authentication failed. Please check your credentials and try again.");
      });
  }

  // Attach the event listener to the login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    console.log("Login form found, attaching event listener"); // Debugging line
    loginForm.addEventListener('submit', navigateToEditor);
  }

  // Function to handle registration
  function handleRegister(event) {
    console.log("Register form submitted"); // Debugging line
    event.preventDefault(); // Prevent form submission
    console.log("Handling registration"); // Debugging line
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const username = document.getElementById("username").value;
  
    fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Registration failed");
        }
        return response.json();
      })
      .then(() => {
        alert("Registration successful! Please log in.");
        switchToLoginForm();
      })
      .catch(error => {
        console.error("Error during registration:", error);
        alert("Registration failed. Please try again.");
      });
      
  }

  function switchToRegisterForm() {
    console.log("Switching to registration form"); // Debugging line
    const formTitle = document.getElementById("formTitle");
    const authForm = document.getElementById("authForm");

    formTitle.textContent = "Register";
    authForm.innerHTML = `
      <label class="input-label" for="username">Username</label>
      <div class="input-row">
        <input 
          id="username" 
          type="text" 
          name="username" 
          placeholder="Enter your username" 
          required 
          style="border: none; outline: none; background: transparent;" 
        />
      </div>
      <label class="input-label" for="email">Email</label>
      <div class="input-row">
        <input 
          id="email" 
          type="email" 
          name="email" 
          placeholder="Enter your email" 
          required 
          style="border: none; outline: none; background: transparent;" 
        />
      </div>
      <label class="input-label" for="password">Password</label>
      <div class="input-row">
        <input 
          id="password" 
          type="password" 
          name="password" 
          placeholder="Enter your password" 
          required 
          style="border: none; outline: none; background: transparent;" 
        />
      </div>
      <div class="button-group">
        <button 
          class="action-button btn-login" 
          type="button" 
          onclick="switchToLoginForm()">
          Back to Login
        </button>
        <button 
          class="action-button btn-register" 
          type="submit" 
          id="registerSubmitBtn">
          Register
        </button>
      </div>
    `;
  // Attach the handleRegister function to the form's submit event
  authForm.addEventListener("submit", handleRegister);
  }

  // Function to switch back to the login form
  function switchToLoginForm() {
    console.log("Switching to login form"); // Debugging line
    const formTitle = document.getElementById("formTitle");
    const authForm = document.getElementById("authForm");

    formTitle.textContent = "Login";
    authForm.innerHTML = `
      <label class="input-label" for="email">Email</label>
      <div class="input-row">
        <input 
          id="email" 
          type="email" 
          name="email" 
          placeholder="Enter your email" 
          required 
          style="border: none; outline: none; background: transparent;" 
        />
      </div>
      <label class="input-label" for="password">Password</label>
      <div class="input-row">
        <input 
          id="password" 
          type="password" 
          name="password" 
          placeholder="Enter your password" 
          required 
          style="border: none; outline: none; background: transparent;" 
        />
      </div>
      <div class="button-group">
        <button 
          class="action-button btn-register" 
          type="button" 
          id="registerBtn">
          Register
        </button>
        <button 
          class="action-button btn-login" 
          type="submit" 
          id="loginBtn">
          Login
        </button>
      </div>
    `;

    document.getElementById("registerBtn").addEventListener("click", switchToRegisterForm);
   // document.getElementById("authForm").addEventListener("submit", handleLogin);
  }
  // Expose functions to the global scope
  window.switchToRegisterForm = switchToRegisterForm;
  window.switchToLoginForm = switchToLoginForm;

  document.getElementById("registerBtn").addEventListener("click", switchToRegisterForm);
  console.log("Attaching event listeners for switching forms"); // Debugging line
});