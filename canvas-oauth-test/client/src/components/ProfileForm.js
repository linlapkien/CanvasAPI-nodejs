import React, { useState, useEffect } from 'react';

export default function ProfileForm() {
  const [field, setField] = useState('name');
  const [value, setValue] = useState('');
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState('');

  // Check if we're logged in by hitting our server's /api/current_user
  useEffect(() => {
    fetch(`${process.env.REACT_APP_BE_CANVAS_API_URL_BASE}/api/current_user`, {
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

  const handleSubmit = () => {
    fetch(
      `${process.env.REACT_APP_BE_CANVAS_API_URL_BASE}/api/profile/update`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
        credentials: 'include',
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMsg(`Error: ${data.error}`);
        } else {
          setMsg('Profile updated successfully!');
        }
      })
      .catch((err) => {
        setMsg('Update failed');
        console.error(err);
      });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Canvas Profile Update</h2>
      {user && <p>Logged in as User ID: {user.id}</p>}
      <div>
        <label>
          Field:
          <select value={field} onChange={(e) => setField(e.target.value)}>
            <option value="name">Name</option>
            <option value="time_zone">Time Zone</option>
            <option value="pronouns">Pronoun</option>
          </select>
        </label>
      </div>
      <div>
        <label>
          Value:
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
      </div>
      <button onClick={handleSubmit}>Update Profile</button>
      <p>{msg}</p>
    </div>
  );
}
