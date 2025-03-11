import React, { useEffect, useState } from 'react';
import Register from './Register';

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  // Check if we're logged in by hitting our server's /api/current_user
  useEffect(() => {
    fetch('http://localhost:3002/api/current_user', {
      credentials: 'include', // important for sending session cookies
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Login = redirect to server's /oauth/login
  const handleLogin = () => {
    window.location.href = 'http://localhost:3002/oauth/login';
  };

  // Logout = redirect to server's /oauth/logout
  const handleLogout = () => {
    window.location.href = 'http://localhost:3002/oauth/logout';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Canvas OAuth2 Test</h1>
      {user ? (
        <>
          <p>
            You are logged in as <strong>{user.name}</strong>
          </p>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <p>You are not logged in.</p>
          <button onClick={handleLogin}>Login with Canvas</button>
        </>
      )}

      <hr />

      {/* Toggle the register form */}
      <button onClick={() => setShowRegister(!showRegister)}>
        {showRegister ? 'Hide Register' : 'Register Here'}
      </button>

      {showRegister && <Register />}
    </div>
  );
}

export default App;
