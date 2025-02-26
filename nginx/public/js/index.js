// Function to navigate to the editor service
function navigateToEditor() {
    // Placeholder credentials for testing purposes.
    // Replace with real login data when available.
    const placeholderCredentials = {
      email: "test@example.com",
      password: "password123"
    };
  
    // Call the auth_service login endpoint
    fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(placeholderCredentials)
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
      // Now navigate to the editor UI
      window.location.href = '/editor';
    })
    .catch(error => {
      console.error("Error during authentication:", error);
      alert("Authentication failed. Please try again later.");
    });
  }
  
  // Attach the event listener to the login button
  document.getElementById('loginBtn').addEventListener('click', navigateToEditor);
  