import React, { useEffect, useState } from 'react';
import Register from './Register';
import ProfileForm from './components/ProfileForm';
import CourseList from './components/CourseList';
import axios from 'axios';

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showCourses, setShowCourses] = useState(false);
  const [userId, setUserId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [enrollmentType, setEnrollmentType] = useState('StudentEnrollment');

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

  // Function to enroll a user by user ID
  const handleEnroll = async () => {
    if (!userId || !courseId) {
      alert('Please enter both User ID and Course ID.');
      return;
    }

    try {
      const enrollRes = await axios.post(
        `http://localhost:3002/api/v1/courses/${courseId}/enrollments`,
        {
          user_id: userId,
          enrollment_type: enrollmentType, // e.g., "StudentEnrollment"
        }
      );

      alert(`User ${userId} has been enrolled successfully!`);
    } catch (error) {
      console.error(
        'Error enrolling user:',
        error.response?.data || error.message
      );
      alert('Failed to enroll user. Please check the User ID or Course ID.');
    }
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

          {/* ------------- Enroll User Section --------------- */}
          <hr />
          <h2>Enroll User</h2>
          <div>
            <input
              type="text"
              placeholder="Enter User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <input
              type="text"
              placeholder="Enter Course ID"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            />
            <select
              value={enrollmentType}
              onChange={(e) => setEnrollmentType(e.target.value)}
            >
              <option value="StudentEnrollment">Student</option>
              <option value="TeacherEnrollment">Teacher</option>
              <option value="TaEnrollment">TA</option>
              <option value="ObserverEnrollment">Observer</option>
            </select>
            <button onClick={handleEnroll}>Enroll</button>
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
