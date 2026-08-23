import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/patient" element={user?.role === 'patient' ? <PatientDashboard /> : <Navigate to="/" />} />
        <Route path="/doctor" element={user?.role === 'doctor' ? <DoctorDashboard /> : <Navigate to="/" />} />
        <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;