import { useState, useEffect } from 'react';
import api from '../api';

export default function PatientDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [symptoms, setSymptoms] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/patient/doctors').then(res => setDoctors(res.data.doctors));
  }, []);

  const viewSlots = async (doctorId) => {
    setSelectedDoctor(doctorId);
    const res = await api.get(`/patient/doctors/${doctorId}/slots`);
    setSlots(res.data.slots);
  };

  const holdSlot = async (slotId) => {
    try {
      await api.post(`/patient/slots/${slotId}/hold`);
      setSelectedSlot(slotId);
      setMessage('Slot held for 5 minutes. Enter symptoms and confirm.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to hold slot');
    }
  };

  const confirmBooking = async () => {
    try {
      const res = await api.post(`/patient/slots/${selectedSlot}/confirm`, { symptoms });
      setMessage('Booking confirmed! ID: ' + res.data.appointment.id);
      setSelectedSlot(null);
      setSymptoms('');
      viewSlots(selectedDoctor);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to confirm booking');
    }
  };

  const connectCalendar = async () => {
    const res = await api.get('/auth/google');
    window.open(res.data.authUrl, '_blank');
  };

  const cardStyle = { background: 'white', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Patient Dashboard</h2>
        <button onClick={connectCalendar} style={{ background: '#059669' }}>Connect Google Calendar</button>
      </div>

      <div style={cardStyle}>
        <h3>Doctors</h3>
        {doctors.map(doc => (
          <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <b>{doc.specialisation}</b>
            <button onClick={() => viewSlots(doc.id)}>View Slots</button>
          </div>
        ))}
      </div>

      {selectedDoctor && (
        <div style={cardStyle}>
          <h3>Open Slots</h3>
          {slots.map(slot => (
            <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span>{new Date(slot.start_time).toLocaleString()}</span>
              <button onClick={() => holdSlot(slot.id)}>Hold</button>
            </div>
          ))}
          {slots.length === 0 && <p style={{ color: '#94a3b8' }}>No open slots.</p>}
        </div>
      )}

      {selectedSlot && (
        <div style={cardStyle}>
          <h3>Enter Symptoms</h3>
          <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={3} style={{ width: '100%', marginBottom: 12 }} />
          <button onClick={confirmBooking}>Confirm Booking</button>
        </div>
      )}

      {message && <div style={{ ...cardStyle, background: '#eff6ff', color: '#1e40af', fontWeight: 600 }}>{message}</div>}
    </div>
  );
}