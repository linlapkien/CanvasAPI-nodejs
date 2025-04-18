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
  const [userName, setUserName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [enrollmentType, setEnrollmentType] = useState('StudentEnrollment');
  // State for fetch list of user from Canvas
  const [canvasUsers, setCanvasUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

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
        setUserName(data.user.name);
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

      alert(`User ${userName} has been enrolled successfully!`);
    } catch (error) {
      console.error(
        'Error enrolling user:',
        error.response?.data || error.message
      );
      alert('Failed to enroll user. Please check the User ID or Course ID.');
    }
  };

  // Function to fetch list of users from Canvas
  const handleFetchCanvasUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await axios.get('http://localhost:3002/api/users');
      setCanvasUsers(res.data.users);
      setShowUsers(true);
      console.log('Fetched List of users:', res.data.users);
    } catch (err) {
      console.error(
        'Error fetching Canvas users:',
        err.response?.data || err.message
      );
      alert('Failed to fetch users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const CANVAS_API_URL = 'http://localhost:3002/api/users'; // Node Canvas server API
  const CMS_CREATE_USER_URL = 'http://localhost:8000/api/user/create/'; // Django CMS endpoint

  // Function to sync users from Canvas to CMS
  const handleSyncCanvasUserstoCMS = async () => {
    try {
      const canvasRes = await axios.get(CANVAS_API_URL);
      const users = canvasRes.data.users;

      console.log('syncUser function - Fetched Canvas users:', users);

      for (const user of users) {
        const payload = {
          email: user.login_id,
          canvas_user_id: user.id,
          bio: null,
        };

        try {
          const res = await axios.post(CMS_CREATE_USER_URL, payload, {
            headers: {
              'Content-Type': 'application/json',
              // 'Authorization': 'Token your_token_here',
            },
          });

          console.log(`Synced user: ${user.name} (Canvas ID: ${user.id})`);
        } catch (err) {
          console.error(
            `Failed to sync ${user.name}:`,
            err.response?.data || err.message
          );
        }
      }

      console.log('All users sync complete!');
    } catch (error) {
      console.error(
        'Error fetching Canvas users:',
        error.response?.data || error.message
      );
    }
  };

  // Function to sync courses from Canvas to CMS
  const handleSyncCanvasCourseToCMS = async () => {
    try {
      const res = await axios.get(
        'http://localhost:3002/api/courses/all?state=available',
        { withCredentials: true }
      );

      const courses = res.data;
      console.log('Fetched Canvas courses:', courses);

      for (const course of courses) {
        const payload = {
          canvas_course_id: course.id,
          name: course.name,
          description: course.public_description || '',
          course_color: course.course_color || null,
          price: null, // default value or update manually later
          status:
            course.workflow_state === 'available' ? 'published' : 'unpublished',
        };

        try {
          await axios.post('http://localhost:8000/api/course/create/', payload);
          console.log(`Synced course: ${payload.name}`);
        } catch (err) {
          console.error(
            `Failed to sync course ${payload.name}`,
            err.response?.data || err.message
          );
        }
      }

      alert('Finished syncing all Canvas courses to Django CMS!');
    } catch (err) {
      console.error(
        'Error fetching courses from Canvas:',
        err.response?.data || err.message
      );
      alert('Failed to sync courses');
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

      <hr />
      {/* Fetch list of Canvas Users */}
      <h2>Fetch list of Canvas Users</h2>
      <button onClick={handleFetchCanvasUsers}>
        {loadingUsers ? 'Fetching Users...' : 'Fetch Canvas Users'}
      </button>

      {showUsers && canvasUsers.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Fetched Users from Canvas</h3>
          <ul>
            {canvasUsers.map((u) => (
              <li key={u.id}>
                Name: <strong>{u.name}</strong>, id: ({u.id}), gmail:{' '}
                {u.login_id}
              </li>
            ))}
          </ul>
        </div>
      )}
      <hr />
      {/* Sync Canvas Users to CMS */}
      <h2>Sync Canvas Users</h2>
      <button onClick={handleSyncCanvasUserstoCMS}>
        Sync Canvas Users to CMS
      </button>
      <hr />
      {/* Sync Courses from Canvas to CMS */}
      <h2>Sync Courses</h2>
      <button onClick={handleSyncCanvasCourseToCMS}>
        Sync All Canvas Courses to Django
      </button>
    </div>
  );
}

export default App;
