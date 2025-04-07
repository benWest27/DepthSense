document.addEventListener("DOMContentLoaded", () => {
  // Function to handle login and navigate to the editor service
  function navigateToEditor(event) {
    console.log("Login form submitted"); // Debugging line
    event.preventDefault(); // Prevent form submission

    // Get username and password from the form inputs
    const username = document.getElementById("loginUsername").value; // changed from email to username
    const password = document.getElementById("loginPassword").value;

    // Call the auth_service login endpoint
    fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password }) // sending username instead of email
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

  const loginForm = document.getElementById("loginForm");
  const registrationForm = document.getElementById("registrationForm");

  // Remove event listener from loginForm and attach to loginBtn
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    console.log("Login button found, attaching event listener"); // Debugging line
    loginBtn.addEventListener("click", navigateToEditor);
  }

  // Function to handle registration
  function handleRegister(event) {
    console.log("Register form submitted"); // Debugging line
    event.preventDefault(); // Prevent form submission
    console.log("Handling registration"); // Debugging line
    const email = document.getElementById("email").value;
    const password = document.getElementById("registerPassword").value;
    const username = document.getElementById("registerUsername").value;
  
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
      })
      .finally(() => { debugger; });
  }

  function switchToRegisterForm() {
    console.log("Switching to registration form"); // Debugging line
    document.getElementById("formTitle").textContent = "Register";
    loginForm.style.visibility = "hidden";
    registrationForm.style.visibility = "visible";
  }

  // Function to switch back to the login form
  function switchToLoginForm() {
    console.log("Switching to login form"); // Debugging line
    document.getElementById("formTitle").textContent = "Login";
    loginForm.style.visibility = "visible";
    registrationForm.style.visibility = "hidden";
  }

  // Remove listener from registrationForm and attach to registerSubmitBtn
  const registerSubmitBtn = document.getElementById("registerSubmitBtn");
  if (registerSubmitBtn) {
    registerSubmitBtn.addEventListener("click", handleRegister);
  } else {
    console.error("Register submit button not found!"); // Debugging line
  }

  // Attach click event to toggle forms.
  document.getElementById("registerBtn").addEventListener("click", switchToRegisterForm);

  // Expose functions to the global scope
  window.switchToRegisterForm = switchToRegisterForm;
  window.switchToLoginForm = switchToLoginForm;

  console.log("Attaching event listeners for switching forms"); // Debugging line
});