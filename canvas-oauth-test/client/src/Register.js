import React, { useState } from 'react';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Registering...');

    try {
      const res = await fetch('http://localhost:3002/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage(`User created in Canvas! ID: ${data.canvasUser.id}`);
        console.log('User created:', data);
        console.log('User created:', data.canvasUser);
      } else {
        setMessage(`Error: ${JSON.stringify(data.error)}`);
        console.log('Error:', data);
      }
    } catch (err) {
      setMessage(`Request failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Register New Canvas User</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Full Name: </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Email (unique_id): </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password: </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Register</button>
      </form>
      <p>{message}</p>
    </div>
  );
}

export default Register;
