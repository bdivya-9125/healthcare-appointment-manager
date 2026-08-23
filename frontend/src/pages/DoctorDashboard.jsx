import { useState, useEffect } from 'react';
import api from '../api';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState({});
  const [prescriptions, setPrescriptions] = useState({});

  const loadAppointments = () => {
    api.get('/doctor/appointments').then(res => setAppointments(res.data.appointments));
  };

  useEffect(() => { loadAppointments(); }, []);

  const completeVisit = async (id) => {
    try {
      await api.post(`/doctor/appointments/${id}/complete`, {
        notes: notes[id] || '',
        prescription: prescriptions[id] || '',
      });
      alert('Visit completed');
      loadAppointments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const urgencyColor = (u) => u === 'High' ? '#dc2626' : u === 'Medium' ? '#d97706' : '#059669';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <h2>Doctor Dashboard</h2>
      {appointments.map(appt => (
        <div key={appt.id} style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <b>{appt.patient_name}</b>
            {appt.pre_visit_summary?.urgency && (
              <span style={{ color: urgencyColor(appt.pre_visit_summary.urgency), fontWeight: 700 }}>
                {appt.pre_visit_summary.urgency} urgency
              </span>
            )}
          </div>
          <p style={{ color: '#64748b', margin: '4px 0' }}>{new Date(appt.start_time).toLocaleString()}</p>
          <p><b>Symptoms:</b> {appt.symptom_form}</p>
          <textarea
            placeholder="Enter visit notes..."
            onChange={e => setNotes({ ...notes, [appt.id]: e.target.value })}
            style={{ width: '100%', marginTop: 8, marginBottom: 8 }}
            rows={2}
          />
          <textarea
            placeholder="Enter prescription (e.g. Paracetamol 500mg, twice daily for 5 days)..."
            onChange={e => setPrescriptions({ ...prescriptions, [appt.id]: e.target.value })}
            style={{ width: '100%', marginTop: 8, marginBottom: 8 }}
            rows={2}
          />
          <button onClick={() => completeVisit(appt.id)}>Complete Visit</button>
        </div>
      ))}
      {appointments.length === 0 && <p style={{ color: '#94a3b8' }}>No confirmed appointments.</p>}
    </div>
  );
}