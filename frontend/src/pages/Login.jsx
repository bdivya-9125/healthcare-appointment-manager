import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignup) {
        await api.post('/auth/signup', form);
        setIsSignup(false);
        alert('Signup successful! Please log in.');
      } else {
        const res = await api.post('/auth/login', { email: form.email, password: form.password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate(`/${res.data.user.role}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>{isSignup ? 'Sign Up' : 'Login'}</h2>
      <form onSubmit={handleSubmit}>
        {isSignup && (
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }} />
        )}
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }} />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }} />
        {isSignup && (
          <select name="role" value={form.role} onChange={handleChange} style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
        )}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: 10 }}>{isSignup ? 'Sign Up' : 'Login'}</button>
      </form>
      <p onClick={() => setIsSignup(!isSignup)} style={{ cursor: 'pointer', color: 'blue', marginTop: 10 }}>
        {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign up"}
      </p>
    </div>
  );
}