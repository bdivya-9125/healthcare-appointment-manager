import { useState, useEffect } from 'react';
import api from '../api';

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ user_id: '', specialisation: '', slot_duration_min: 30 });

  const loadDoctors = () => {
    api.get('/admin/doctors').then(res => setDoctors(res.data.doctors));
  };

  useEffect(() => { loadDoctors(); }, []);

  const createDoctor = async () => {
    try {
      await api.post('/admin/doctors', {
        ...form,
        working_hours: { mon: ["09:00", "17:00"], tue: ["09:00", "17:00"] }
      });
      alert('Doctor created');
      loadDoctors();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const generateSlots = async (id) => {
    await api.post(`/admin/doctors/${id}/generate-slots`);
    alert('Slots generated');
  };

  const cardStyle = { background: 'white', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <h2>Admin Dashboard</h2>

      <div style={cardStyle}>
        <h3>Create Doctor Profile</h3>
        <input placeholder="User ID" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} style={{ display: 'block', width: '100%', marginBottom: 10 }} />
        <input placeholder="Specialisation" value={form.specialisation} onChange={e => setForm({ ...form, specialisation: e.target.value })} style={{ display: 'block', width: '100%', marginBottom: 10 }} />
        <button onClick={createDoctor}>Create Doctor</button>
      </div>

      <div style={cardStyle}>
        <h3>Doctors</h3>
        {doctors.map(doc => (
          <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span>{doc.specialisation} (id: {doc.id})</span>
            <button onClick={() => generateSlots(doc.id)}>Generate Slots</button>
          </div>
        ))}
      </div>
    </div>
  );
}