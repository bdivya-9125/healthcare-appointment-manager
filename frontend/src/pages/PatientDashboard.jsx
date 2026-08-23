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

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Patient Dashboard</h2>
      <button onClick={connectCalendar}>Connect Google Calendar</button>
      <h3>Doctors</h3>
      {doctors.map(doc => (
        <div key={doc.id} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 8 }}>
          <b>{doc.specialisation}</b>
          <button onClick={() => viewSlots(doc.id)} style={{ marginLeft: 10 }}>View Slots</button>
        </div>
      ))}

      {selectedDoctor && (
        <div>
          <h3>Open Slots</h3>
          {slots.map(slot => (
            <div key={slot.id} style={{ marginBottom: 5 }}>
              {new Date(slot.start_time).toLocaleString()}
              <button onClick={() => holdSlot(slot.id)} style={{ marginLeft: 10 }}>Hold</button>
            </div>
          ))}
        </div>
      )}

      {selectedSlot && (
        <div style={{ marginTop: 20 }}>
          <h3>Enter Symptoms</h3>
          <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={3} style={{ width: '100%' }} />
          <button onClick={confirmBooking} style={{ marginTop: 10 }}>Confirm Booking</button>
        </div>
      )}

      {message && <p style={{ marginTop: 20, fontWeight: 'bold' }}>{message}</p>}
    </div>
  );
}