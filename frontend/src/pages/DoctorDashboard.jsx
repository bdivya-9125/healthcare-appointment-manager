import { useState, useEffect } from 'react';
import api from '../api';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState({});
  const [prescriptions, setPrescriptions] = useState({});
  const [loading, setLoading] = useState(true);

  // ==========================================
  // LOAD APPOINTMENTS
  // ==========================================
  const loadAppointments = async () => {
    try {
      setLoading(true);

      const res = await api.get('/doctor/appointments');

      const data = res.data.appointments || [];

      console.log('Doctor appointments:', data);

      setAppointments(data);
    } catch (err) {
      console.error('Failed to load appointments:', err);

      alert(
        err.response?.data?.error ||
        'Failed to load appointments'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    loadAppointments();
  }, []);

  // ==========================================
  // PARSE AI SUMMARY
  // ==========================================
  const getPreVisitSummary = (summary) => {
    if (!summary) {
      return null;
    }

    // PostgreSQL JSON/JSONB may already arrive as object
    if (typeof summary === 'object') {
      return summary;
    }

    // Sometimes it can arrive as a JSON string
    if (typeof summary === 'string') {
      try {
        return JSON.parse(summary);
      } catch (err) {
        console.error(
          'Invalid pre_visit_summary JSON:',
          err
        );

        return null;
      }
    }

    return null;
  };

  // ==========================================
  // URGENCY COLOR
  // ==========================================
  const urgencyColor = (urgency) => {
    if (urgency === 'High') {
      return '#dc2626';
    }

    if (urgency === 'Medium') {
      return '#d97706';
    }

    return '#059669';
  };

  // ==========================================
  // COMPLETE VISIT
  // ==========================================
  const completeVisit = async (id) => {
    try {
      const noteText = notes[id] || '';
      const prescriptionText = prescriptions[id] || '';

      if (!noteText.trim()) {
        alert('Please enter visit notes before completing the visit.');
        return;
      }

      await api.post(
        `/doctor/appointments/${id}/complete`,
        {
          notes: noteText,
          prescription: prescriptionText
        }
      );

      alert('Visit completed successfully.');

      // Reload appointments
      await loadAppointments();

      // Clear entered values
      setNotes((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

      setPrescriptions((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

    } catch (err) {
      console.error(
        'Failed to complete visit:',
        err
      );

      alert(
        err.response?.data?.error ||
        'Failed to complete visit'
      );
    }
  };

  // ==========================================
  // LOADING SCREEN
  // ==========================================
  if (loading) {
    return (
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '40px 20px',
          fontFamily: 'sans-serif'
        }}
      >
        <h2>Doctor Dashboard</h2>

        <p
          style={{
            color: '#64748b',
            fontSize: 16
          }}
        >
          Loading appointments...
        </p>
      </div>
    );
  }

  // ==========================================
  // UI
  // ==========================================
  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'sans-serif'
      }}
    >
      <h2
        style={{
          color: '#1e3a8a',
          marginBottom: 24
        }}
      >
        Doctor Dashboard
      </h2>

      {/* =====================================
          APPOINTMENTS
      ===================================== */}

      {appointments.map((appt) => {
        const summary = getPreVisitSummary(
          appt.pre_visit_summary
        );

        return (
          <div
            key={appt.id}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              boxShadow:
                '0 4px 20px rgba(0,0,0,0.06)'
            }}
          >

            {/* =================================
                PATIENT + URGENCY
            ================================= */}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10
              }}
            >
              <b
                style={{
                  fontSize: 18,
                  color: '#111827'
                }}
              >
                {appt.patient_name}
              </b>

              {summary?.urgency && (
                <span
                  style={{
                    color: urgencyColor(
                      summary.urgency
                    ),
                    fontWeight: 700,
                    fontSize: 14
                  }}
                >
                  {summary.urgency} urgency
                </span>
              )}
            </div>

            {/* =================================
                APPOINTMENT TIME
            ================================= */}

            <p
              style={{
                color: '#64748b',
                margin: '6px 0 14px',
                fontSize: 16
              }}
            >
              {new Date(
                appt.start_time
              ).toLocaleString()}
            </p>

            {/* =================================
                SYMPTOMS
            ================================= */}

            <p
              style={{
                fontSize: 16,
                marginBottom: 16
              }}
            >
              <b>Symptoms:</b>{' '}
              {appt.symptom_form || 'Not provided'}
            </p>

            {/* =================================
                AI PRE-VISIT SUMMARY
            ================================= */}

            <div
              style={{
                background: '#f0f9ff',
                border:
                  '1px solid #bae6fd',
                borderRadius: 10,
                padding: 16,
                margin: '12px 0 18px'
              }}
            >

              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 14,
                  color: '#0369a1',
                  fontSize: 18
                }}
              >
                🤖 AI Pre-Visit Summary
              </h3>

              {summary ? (
                <div>

                  {/* URGENCY */}

                  {summary.urgency && (
                    <p>
                      <b>Urgency:</b>{' '}

                      <span
                        style={{
                          color: urgencyColor(
                            summary.urgency
                          ),
                          fontWeight: 700
                        }}
                      >
                        {summary.urgency}
                      </span>
                    </p>
                  )}

                  {/* CHIEF COMPLAINT */}

                  {summary.chief_complaint && (
                    <p>
                      <b>
                        Chief Complaint:
                      </b>{' '}

                      {summary.chief_complaint}
                    </p>
                  )}

                  {/* QUESTIONS */}

                  {Array.isArray(
                    summary.questions
                  ) &&
                    summary.questions.length > 0 && (
                      <div>
                        <b>
                          Suggested Questions
                          for Doctor:
                        </b>

                        <ol
                          style={{
                            marginTop: 8,
                            paddingLeft: 22
                          }}
                        >
                          {summary.questions.map(
                            (
                              question,
                              index
                            ) => (
                              <li
                                key={index}
                                style={{
                                  marginBottom: 6
                                }}
                              >
                                {question}
                              </li>
                            )
                          )}
                        </ol>
                      </div>
                    )}

                </div>
              ) : (
                <p
                  style={{
                    color: '#64748b',
                    marginBottom: 0
                  }}
                >
                  AI summary is not available
                  for this appointment.
                </p>
              )}

            </div>

            {/* =================================
                VISIT NOTES
            ================================= */}

            <textarea
              placeholder="Enter visit notes..."
              value={notes[appt.id] || ''}
              onChange={(e) =>
                setNotes({
                  ...notes,
                  [appt.id]: e.target.value
                })
              }
              rows={3}
              style={{
                width: '100%',
                marginTop: 8,
                marginBottom: 10,
                padding: 12,
                borderRadius: 8,
                border:
                  '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontSize: 16,
                resize: 'vertical'
              }}
            />

            {/* =================================
                PRESCRIPTION
            ================================= */}

            <textarea
              placeholder="Enter prescription (e.g. Paracetamol 500mg, twice daily for 5 days)..."
              value={
                prescriptions[appt.id] || ''
              }
              onChange={(e) =>
                setPrescriptions({
                  ...prescriptions,
                  [appt.id]:
                    e.target.value
                })
              }
              rows={3}
              style={{
                width: '100%',
                marginTop: 8,
                marginBottom: 14,
                padding: 12,
                borderRadius: 8,
                border:
                  '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontSize: 16,
                resize: 'vertical'
              }}
            />

            {/* =================================
                COMPLETE VISIT
            ================================= */}

            <button
              onClick={() =>
                completeVisit(appt.id)
              }
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '13px 22px',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer'
              }}
            >
              Complete Visit
            </button>

          </div>
        );
      })}

      {/* =====================================
          NO APPOINTMENTS
      ===================================== */}

      {appointments.length === 0 && (
        <p
          style={{
            color: '#94a3b8',
            fontSize: 16
          }}
        >
          No confirmed appointments.
        </p>
      )}

    </div>
  );
}