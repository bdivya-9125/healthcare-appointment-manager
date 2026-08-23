import { useState, useEffect } from 'react';
import api from '../api';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [notes, setNotes] = useState({});
  const [prescriptions, setPrescriptions] = useState({});

  // =====================================================
  // LOAD APPOINTMENTS
  // =====================================================
  const loadAppointments = async () => {
    try {
      const res = await api.get('/doctor/appointments');

      const apps = res.data.appointments || [];

      setAppointments(apps);

      // Load AI summaries separately.
      // This keeps the dashboard itself fast.
      apps.forEach(async (appt) => {
        try {
          const summaryRes = await api.get(
            `/doctor/appointments/${appt.id}/pre-visit-summary`
          );

          setSummaries((prev) => ({
            ...prev,
            [appt.id]: summaryRes.data.summary || null,
          }));
        } catch (err) {
          console.error(
            `Failed to load AI summary for appointment ${appt.id}:`,
            err.response?.data?.error || err.message
          );

          setSummaries((prev) => ({
            ...prev,
            [appt.id]: null,
          }));
        }
      });
    } catch (err) {
      console.error('Failed to load appointments:', err);

      alert(
        err.response?.data?.error ||
          'Failed to load appointments'
      );
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================
  useEffect(() => {
    loadAppointments();
  }, []);

  // =====================================================
  // COMPLETE VISIT
  // =====================================================
  const completeVisit = async (id) => {
    try {
      if (!notes[id]?.trim()) {
        alert('Please enter visit notes.');
        return;
      }

      await api.post(`/doctor/appointments/${id}/complete`, {
        notes: notes[id] || '',
        prescription: prescriptions[id] || '',
      });

      alert('Visit completed');

      // Remove completed appointment from current list
      setAppointments((prev) =>
        prev.filter((appt) => appt.id !== id)
      );

      // Clean up local state
      setSummaries((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

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
      console.error('Complete visit error:', err);

      alert(
        err.response?.data?.error ||
          'Failed to complete visit'
      );
    }
  };

  // =====================================================
  // URGENCY COLOR
  // =====================================================
  const urgencyColor = (urgency) => {
    if (urgency === 'High') return '#dc2626';
    if (urgency === 'Medium') return '#d97706';
    return '#059669';
  };

  // =====================================================
  // FORMAT SUMMARY
  // =====================================================
  const getSummary = (summary) => {
    if (!summary) return null;

    if (typeof summary === 'object') {
      return summary;
    }

    if (typeof summary === 'string') {
      try {
        return JSON.parse(summary);
      } catch (err) {
        console.error(
          'Invalid AI summary JSON:',
          err
        );
        return null;
      }
    }

    return null;
  };

  // =====================================================
  // UI
  // =====================================================
  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'sans-serif',
      }}
    >
      <h2
        style={{
          color: '#1e3a8a',
          marginBottom: 24,
        }}
      >
        Doctor Dashboard
      </h2>

      {appointments.map((appt) => {
        const summary = getSummary(
          summaries[appt.id]
        );

        return (
          <div
            key={appt.id}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              boxShadow:
                '0 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            {/* =================================================
                PATIENT + URGENCY
            ================================================= */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <b
                style={{
                  fontSize: 18,
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
                  }}
                >
                  {summary.urgency} urgency
                </span>
              )}
            </div>

            {/* =================================================
                APPOINTMENT TIME
            ================================================= */}
            <p
              style={{
                color: '#64748b',
                margin: '4px 0',
              }}
            >
              {new Date(
                appt.start_time
              ).toLocaleString()}
            </p>

            {/* =================================================
                SYMPTOMS
            ================================================= */}
            <p>
              <b>Symptoms:</b>{' '}
              {appt.symptom_form || 'Not provided'}
            </p>

            {/* =================================================
                AI PRE-VISIT SUMMARY
            ================================================= */}
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
                  fontSize: 18,
                }}
              >
                🤖 AI Pre-Visit Summary
              </h4>

              {/* Still loading */}
              {summaries[appt.id] === undefined && (
                <p
                  style={{
                    color: '#64748b',
                    margin: 0,
                  }}
                >
                  Generating AI summary...
                </p>
              )}

              {/* Failed / unavailable */}
              {summaries[appt.id] === null && (
                <p
                  style={{
                    color: '#64748b',
                    margin: 0,
                  }}
                >
                  AI summary is not available for
                  this appointment.
                </p>
              )}

              {/* Successfully generated */}
              {summary && (
                <>
                  {/* Urgency */}
                  {summary.urgency && (
                    <p>
                      <b>Urgency:</b>{' '}
                      <span
                        style={{
                          color: urgencyColor(
                            summary.urgency
                          ),
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
                  {Array.isArray(
                    summary.questions
                  ) &&
                    summary.questions.length > 0 && (
                      <div>
                        <b>
                          Suggested Questions for
                          Doctor:
                        </b>

                        <ol
                          style={{
                            marginTop: 8,
                            paddingLeft: 22,
                          }}
                        >
                          {summary.questions.map(
                            (question, index) => (
                              <li
                                key={index}
                                style={{
                                  marginBottom: 5,
                                }}
                              >
                                {question}
                              </li>
                            )
                          )}
                        </ol>
                      </div>
                    )}
                </>
              )}
            </div>

            {/* =================================================
                VISIT NOTES
            ================================================= */}
            <textarea
              placeholder="Enter visit notes..."
              value={notes[appt.id] || ''}
              onChange={(e) =>
                setNotes((prev) => ({
                  ...prev,
                  [appt.id]: e.target.value,
                }))
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
                resize: 'vertical',
              }}
              rows={3}
            />

            {/* =================================================
                PRESCRIPTION
            ================================================= */}
            <textarea
              placeholder="Enter prescription (e.g. Paracetamol 500mg, twice daily for 5 days)..."
              value={prescriptions[appt.id] || ''}
              onChange={(e) =>
                setPrescriptions((prev) => ({
                  ...prev,
                  [appt.id]: e.target.value,
                }))
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
                resize: 'vertical',
              }}
              rows={3}
            />

            {/* =================================================
                COMPLETE VISIT
            ================================================= */}
            <button
              onClick={() =>
                completeVisit(appt.id)
              }
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              Complete Visit
            </button>
          </div>
        );
      })}

      {/* =====================================================
          NO APPOINTMENTS
      ===================================================== */}
      {appointments.length === 0 && (
        <p
          style={{
            color: '#94a3b8',
          }}
        >
          No confirmed appointments.
        </p>
      )}
    </div>
  );
}