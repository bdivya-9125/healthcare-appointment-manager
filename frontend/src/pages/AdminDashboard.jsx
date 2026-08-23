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

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Admin Dashboard</h2>
      <h3>Create Doctor Profile</h3>
      <input placeholder="User ID" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} style={{ display: 'block', marginBottom: 5 }} />
      <input placeholder="Specialisation" value={form.specialisation} onChange={e => setForm({ ...form, specialisation: e.target.value })} style={{ display: 'block', marginBottom: 5 }} />
      <button onClick={createDoctor}>Create Doctor</button>

      <h3 style={{ marginTop: 20 }}>Doctors</h3>
      {doctors.map(doc => (
        <div key={doc.id} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 8 }}>
          {doc.specialisation} (id: {doc.id})
          <button onClick={() => generateSlots(doc.id)} style={{ marginLeft: 10 }}>Generate Slots</button>
        </div>
      ))}
    </div>
  );
}