import React, { useEffect, useState } from 'react';
import Register from './Register';
import ProfileForm from './components/ProfileForm';
import CourseList from './components/CourseList';

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [userCourses, setUserCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [showCourses, setShowCourses] = useState(false);

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

  console.log('User:', user);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Canvas OAuth2 Test</h1>
      {user ? (
        <>
          <p>
            You are logged in as <strong>{user.name}</strong>
          </p>
          <button onClick={handleLogout}>Logout</button>
          {/*-------- Button to get profile --------*/}
          <div style={{ marginTop: '1rem' }}></div>

          {/*-------- Show profile if fetched --------*/}
          {user && (
            <div
              style={{
                marginTop: '1rem',
                border: '1px solid #ccc',
                padding: '1rem',
              }}
            >
              <h3>Profile Details</h3>
              <p>
                <strong>ID:</strong> {user.id}
              </p>
              <p>
                <strong>Name:</strong> {user.name}
              </p>
              <p>
                <strong>Pronoun:</strong> {user.pronouns}
              </p>
              <p>
                <strong>Short Name:</strong> {user.short_name}
              </p>
              <p>
                <strong>Sortable Name:</strong> {user.sortable_name}
              </p>
              <p>
                <strong>Timezone:</strong> {user.time_zone}
              </p>
              <p>
                <strong>Email/ Login_id:</strong> {user.login_id}
              </p>
              <img src={user.avatar_url} alt="Avatar" width="80" />
            </div>
          )}

          <ProfileForm user={user} />

          {/* ---------------- Courses Section ---------------------- */}
          <hr />
          <h2>Courses Section</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setShowCourses('user')} disabled={!user}>
              View My Courses
            </button>
            <button onClick={() => setShowCourses('all')}>
              View All Canvas Courses
            </button>
          </div>

          {/* Conditionally render course lists */}
          {showCourses === 'user' && user && (
            <>
              <h3 style={{ marginTop: '1rem' }}>My Courses</h3>
              <CourseList userId={user.id} />
            </>
          )}
          {showCourses === 'all' && (
            <>
              <h3 style={{ marginTop: '1rem' }}>All Canvas Courses</h3>
              <CourseList />
            </>
          )}
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
