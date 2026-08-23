import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient'
  });

  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // ==============================
      // SIGN UP
      // ==============================
      if (isSignup) {
        await api.post('/auth/signup', form);

        setIsSignup(false);

        setForm({
          name: '',
          email: '',
          password: '',
          role: 'patient'
        });

        alert('Signup successful! Please log in.');

        return;
      }

      // ==============================
      // LOGIN
      // ==============================
      const res = await api.post(
        '/auth/login',
        {
          email: form.email,
          password: form.password
        }
      );

      const token = res.data.token;
      const loggedInUser = res.data.user;

      // Save authentication information
      localStorage.setItem('token', token);
      localStorage.setItem(
        'user',
        JSON.stringify(loggedInUser)
      );

      // IMPORTANT:
      // Update React state immediately.
      // This prevents the app from redirecting
      // back to the login page.
      if (onLogin) {
        onLogin(loggedInUser);
      }

      // Navigate according to role
      navigate(
        `/${loggedInUser.role}`,
        { replace: true }
      );

    } catch (err) {
      console.error(
        'Login/Signup error:',
        err
      );

      setError(
        err.response?.data?.error ||
        'Something went wrong'
      );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: '90%',
          fontFamily: 'sans-serif',
          background: 'white',
          padding: 40,
          borderRadius: 16,
          boxShadow:
            '0 10px 40px rgba(0,0,0,0.1)'
        }}
      >

        <h2
          style={{
            textAlign: 'center',
            marginBottom: 24
          }}
        >
          {isSignup
            ? 'Create Account'
            : 'Welcome Back'}
        </h2>

        <form onSubmit={handleSubmit}>

          {/* Name only during signup */}
          {isSignup && (
            <input
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              required
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 12
              }}
            />
          )}

          {/* Email */}
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            style={{
              display: 'block',
              width: '100%',
              marginBottom: 12
            }}
          />

          {/* Password */}
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={{
              display: 'block',
              width: '100%',
              marginBottom: 12
            }}
          />

          {/* Role only during signup */}
          {isSignup && (
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 12
              }}
            >
              <option value="patient">
                Patient
              </option>

              <option value="doctor">
                Doctor
              </option>

              <option value="admin">
                Admin
              </option>
            </select>
          )}

          {/* Error */}
          {error && (
            <p
              style={{
                color: '#dc2626',
                fontSize: 14
              }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: 12,
              marginTop: 8
            }}
          >
            {isSignup
              ? 'Sign Up'
              : 'Login'}
          </button>

        </form>

        {/* Switch Login / Signup */}
        <p
          onClick={() => {
            setIsSignup(!isSignup);
            setError('');
          }}
          style={{
            cursor: 'pointer',
            color: '#2563eb',
            marginTop: 16,
            textAlign: 'center',
            fontSize: 14
          }}
        >
          {isSignup
            ? 'Already have an account? Login'
            : "Don't have an account? Sign up"}
        </p>

      </div>
    </div>
  );
}