import { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('user') || 'null'
      );
    } catch {
      return null;
    }
  });

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route
          path="/"
          element={
            <Login onLogin={handleLogin} />
          }
        />

        {/* Patient */}
        <Route
          path="/patient"
          element={
            user?.role === 'patient'
              ? <PatientDashboard onLogout={handleLogout} />
              : <Navigate to="/" replace />
          }
        />

        {/* Doctor */}
        <Route
          path="/doctor"
          element={
            user?.role === 'doctor'
              ? <DoctorDashboard onLogout={handleLogout} />
              : <Navigate to="/" replace />
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            user?.role === 'admin'
              ? <AdminDashboard onLogout={handleLogout} />
              : <Navigate to="/" replace />
          }
        />

        {/* Unknown route */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;