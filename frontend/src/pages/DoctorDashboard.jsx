import { useState, useEffect } from 'react';
import api from '../api';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState({});
  const [prescriptions, setPrescriptions] = useState({});

  const loadAppointments = () => {
    api.get('/doctor/appointments')
      .then(res => {
        setAppointments(res.data.appointments || []);
      })
      .catch(err => {
        console.error('Failed to load appointments:', err);
        alert(err.response?.data?.error || 'Failed to load appointments');
      });
  };

  useEffect(() => {
    loadAppointments();
  }, []);

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

  const urgencyColor = (u) => {
    if (u === 'High') return '#dc2626';
    if (u === 'Medium') return '#d97706';
    return '#059669';
  };

  // Handle both object and JSON-string formats
  const getPreVisitSummary = (summary) => {
    if (!summary) return null;

    if (typeof summary === 'object') {
      return summary;
    }

    if (typeof summary === 'string') {
      try {
        return JSON.parse(summary);
      } catch (err) {
        console.error('Invalid pre_visit_summary JSON:', err);
        return null;
      }
    }

    return null;
  };

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'sans-serif',
      }}
    >
      <h2>Doctor Dashboard</h2>

      {appointments.map((appt) => {
        const summary = getPreVisitSummary(appt.pre_visit_summary);

        return (
          <div
            key={appt.id}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            {/* Patient and urgency */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <b>{appt.patient_name}</b>

              {summary?.urgency && (
                <span
                  style={{
                    color: urgencyColor(summary.urgency),
                    fontWeight: 700,
                  }}
                >
                  {summary.urgency} urgency
                </span>
              )}
            </div>

            {/* Appointment time */}
            <p
              style={{
                color: '#64748b',
                margin: '4px 0',
              }}
            >
              {new Date(appt.start_time).toLocaleString()}
            </p>

            {/* Symptoms */}
            <p>
              <b>Symptoms:</b> {appt.symptom_form}
            </p>

            {/* AI Pre-Visit Summary */}
            {summary && (
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 10,
                  padding: 15,
                  margin: '12px 0 16px',
                }}
              >
                <h4
                  style={{
                    marginTop: 0,
                    marginBottom: 12,
                    color: '#0369a1',
                  }}
                >
                  AI Pre-Visit Summary
                </h4>

                {/* Urgency */}
                {summary.urgency && (
                  <p>
                    <b>Urgency:</b>{' '}
                    <span
                      style={{
                        color: urgencyColor(summary.urgency),
                        fontWeight: 700,
                      }}
                    >
                      {summary.urgency}
                    </span>
                  </p>
                )}

                {/* Chief complaint */}
                {summary.chief_complaint && (
                  <p>
                    <b>Chief Complaint:</b>{' '}
                    {summary.chief_complaint}
                  </p>
                )}

                {/* Suggested questions */}
                {Array.isArray(summary.questions) &&
                  summary.questions.length > 0 && (
                    <div>
                      <b>Suggested Questions for Doctor:</b>

                      <ol style={{ marginTop: 8 }}>
                        {summary.questions.map((question, index) => (
                          <li key={index} style={{ marginBottom: 5 }}>
                            {question}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
              </div>
            )}

            {/* If AI summary is missing */}
            {!summary && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 12,
                  margin: '12px 0 16px',
                  color: '#64748b',
                }}
              >
                AI pre-visit summary is not available for this
                appointment.
              </div>
            )}

            {/* Visit notes */}
            <textarea
              placeholder="Enter visit notes..."
              value={notes[appt.id] || ''}
              onChange={(e) =>
                setNotes({
                  ...notes,
                  [appt.id]: e.target.value,
                })
              }
              style={{
                width: '100%',
                marginTop: 8,
                marginBottom: 8,
                padding: 12,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              rows={3}
            />

            {/* Prescription */}
            <textarea
              placeholder="Enter prescription (e.g. Paracetamol 500mg, twice daily for 5 days)..."
              value={prescriptions[appt.id] || ''}
              onChange={(e) =>
                setPrescriptions({
                  ...prescriptions,
                  [appt.id]: e.target.value,
                })
              }
              style={{
                width: '100%',
                marginTop: 8,
                marginBottom: 8,
                padding: 12,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              rows={3}
            />

            {/* Complete visit */}
            <button
              onClick={() => completeVisit(appt.id)}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Complete Visit
            </button>
          </div>
        );
      })}

      {appointments.length === 0 && (
        <p style={{ color: '#94a3b8' }}>
          No confirmed appointments.
        </p>
      )}
    </div>
  );
}