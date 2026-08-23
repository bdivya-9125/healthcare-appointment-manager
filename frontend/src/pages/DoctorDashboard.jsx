import { useState, useEffect } from 'react';
import api from '../api';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState({});

  const loadAppointments = () => {
    api.get('/doctor/appointments').then(res => setAppointments(res.data.appointments));
  };

  useEffect(() => { loadAppointments(); }, []);

  const completeVisit = async (id) => {
    try {
      await api.post(`/doctor/appointments/${id}/complete`, { notes: notes[id] || '' });
      alert('Visit completed');
      loadAppointments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Doctor Dashboard</h2>
      {appointments.map(appt => (
        <div key={appt.id} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
          <p><b>Patient:</b> {appt.patient_name}</p>
          <p><b>Time:</b> {new Date(appt.start_time).toLocaleString()}</p>
          <p><b>Symptoms:</b> {appt.symptom_form}</p>
          {appt.pre_visit_summary?.urgency && (
            <p><b>Urgency:</b> {appt.pre_visit_summary.urgency}</p>
          )}
          <textarea
            placeholder="Enter visit notes..."
            onChange={e => setNotes({ ...notes, [appt.id]: e.target.value })}
            style={{ width: '100%', marginTop: 5 }}
            rows={2}
          />
          <button onClick={() => completeVisit(appt.id)} style={{ marginTop: 5 }}>Complete Visit</button>
        </div>
      ))}
      {appointments.length === 0 && <p>No confirmed appointments.</p>}
    </div>
  );
}