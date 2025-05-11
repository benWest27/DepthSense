document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const errorMessage = document.getElementById("error-message");

            try {
                const response = await fetch("http://localhost:5000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                
                if (response.ok && data.token) {
                    // Store JWT token
                    localStorage.setItem("jwt_token", data.token);
                    // Redirect to dashboard
                    window.location.href = "dashboard.html";
                } else {
                    errorMessage.textContent = data.error || "Invalid login credentials.";
                }
            } catch (error) {
                console.error("Login error:", error);
                errorMessage.textContent = "An error occurred. Please try again.";
            }
        });
    }
    
    const registerForm = document.getElementById("register-form");

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("username").value;
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const errorMessage = document.getElementById("error-message");

            try {
                const response = await fetch("http://localhost:5000/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();
                
                if (response.ok) {
                    showNotification("Registration successful! Redirecting to login...", "success");
                    window.location.href = "login.html";
                } else {
                    errorMessage.textContent = data.error || "Registration failed.";
                    showNotification(data.error || "Registration failed.", "error");
                }
            } catch (error) {
                console.error("Registration error:", error);
                errorMessage.textContent = "An error occurred. Please try again.";
                showNotification("An error occurred. Please try again.", "error");
            }
        });
    }
});
