import { useState, useEffect } from 'react';
import api from '../api';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState({});
  const [prescriptions, setPrescriptions] = useState({});
  const [aiSummaries, setAiSummaries] = useState({});
  const [aiLoading, setAiLoading] = useState({});

  // ==========================================
  // LOAD APPOINTMENTS
  // ==========================================
  const loadAppointments = async () => {
    try {
      const res = await api.get('/doctor/appointments');

      const data = res.data.appointments || [];

      setAppointments(data);

      // Start AI requests AFTER appointments
      // have already been displayed.
      data.forEach((appointment) => {
        loadAISummary(appointment);
      });

    } catch (err) {
      console.error(
        'Failed to load appointments:',
        err
      );

      alert(
        err.response?.data?.error ||
        'Failed to load appointments'
      );
    }
  };


  // ==========================================
  // LOAD AI SUMMARY FOR ONE APPOINTMENT
  // ==========================================
  const loadAISummary = async (appointment) => {
    const id = appointment.id;

    // If already available from database
    if (appointment.pre_visit_summary) {
      let summary = appointment.pre_visit_summary;

      if (typeof summary === 'string') {
        try {
          summary = JSON.parse(summary);
        } catch {
          summary = null;
        }
      }

      if (summary) {
        setAiSummaries((prev) => ({
          ...prev,
          [id]: summary
        }));

        return;
      }
    }

    // No symptoms
    if (!appointment.symptom_form) {
      return;
    }

    setAiLoading((prev) => ({
      ...prev,
      [id]: true
    }));

    try {
      const res = await api.get(
        `/doctor/appointments/${id}/pre-visit-summary`
      );

      if (res.data.summary) {
        setAiSummaries((prev) => ({
          ...prev,
          [id]: res.data.summary
        }));
      }

    } catch (err) {
      console.error(
        `AI summary failed for appointment ${id}:`,
        err
      );

    } finally {
      setAiLoading((prev) => ({
        ...prev,
        [id]: false
      }));
    }
  };


  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    loadAppointments();
  }, []);


  // ==========================================
  // COMPLETE VISIT
  // ==========================================
  const completeVisit = async (id) => {
    try {
      await api.post(
        `/doctor/appointments/${id}/complete`,
        {
          notes: notes[id] || '',
          prescription: prescriptions[id] || ''
        }
      );

      alert('Visit completed');

      loadAppointments();

    } catch (err) {
      alert(
        err.response?.data?.error ||
        'Failed to complete visit'
      );
    }
  };


  // ==========================================
  // URGENCY COLOR
  // ==========================================
  const urgencyColor = (urgency) => {
    if (urgency === 'High') return '#dc2626';
    if (urgency === 'Medium') return '#d97706';

    return '#059669';
  };


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


      {/* =====================================
          APPOINTMENTS
      ===================================== */}

      {appointments.map((appt) => {

        const summary = aiSummaries[appt.id];

        return (
          <div
            key={appt.id}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              boxShadow:
                '0 4px 20px rgba(0,0,0,0.06)'
            }}
          >

            {/* PATIENT */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >

              <b>{appt.patient_name}</b>

              {summary?.urgency && (
                <span
                  style={{
                    color:
                      urgencyColor(
                        summary.urgency
                      ),
                    fontWeight: 700
                  }}
                >
                  {summary.urgency} urgency
                </span>
              )}

            </div>


            {/* TIME */}
            <p
              style={{
                color: '#64748b',
                margin: '4px 0'
              }}
            >
              {new Date(
                appt.start_time
              ).toLocaleString()}
            </p>


            {/* SYMPTOMS */}
            <p>
              <b>Symptoms:</b>{' '}
              {appt.symptom_form}
            </p>


            {/* =================================
                AI SUMMARY
            ================================= */}

            <div
              style={{
                background: '#f0f9ff',
                border:
                  '1px solid #bae6fd',
                borderRadius: 10,
                padding: 15,
                margin: '12px 0 16px'
              }}
            >

              <h4
                style={{
                  marginTop: 0,
                  color: '#0369a1'
                }}
              >
                AI Pre-Visit Summary
              </h4>


              {/* LOADING */}
              {aiLoading[appt.id] && (
                <p
                  style={{
                    color: '#64748b'
                  }}
                >
                  🤖 Generating AI summary...
                </p>
              )}


              {/* SUMMARY */}
              {!aiLoading[appt.id] &&
                summary && (
                  <>

                    {summary.urgency && (
                      <p>
                        <b>Urgency:</b>{' '}

                        <span
                          style={{
                            color:
                              urgencyColor(
                                summary.urgency
                              ),
                            fontWeight: 700
                          }}
                        >
                          {summary.urgency}
                        </span>
                      </p>
                    )}


                    {summary.chief_complaint && (
                      <p>
                        <b>
                          Chief Complaint:
                        </b>{' '}

                        {summary.chief_complaint}
                      </p>
                    )}


                    {Array.isArray(
                      summary.questions
                    ) &&
                      summary.questions.length >
                        0 && (
                        <div>

                          <b>
                            Suggested Questions
                            for Doctor:
                          </b>

                          <ol>
                            {summary.questions.map(
                              (
                                question,
                                index
                              ) => (
                                <li
                                  key={index}
                                  style={{
                                    marginBottom: 5
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


              {/* FAILED / EMPTY */}
              {!aiLoading[appt.id] &&
                !summary && (
                  <p
                    style={{
                      color: '#64748b'
                    }}
                  >
                    AI summary unavailable.
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
                marginBottom: 8,
                padding: 12,
                borderRadius: 8,
                border:
                  '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
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
                marginBottom: 8,
                padding: 12,
                borderRadius: 8,
                border:
                  '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
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
                padding: '12px 20px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Complete Visit
            </button>

          </div>
        );
      })}


      {/* NO APPOINTMENTS */}

      {appointments.length === 0 && (
        <p
          style={{
            color: '#94a3b8'
          }}
        >
          No confirmed appointments.
        </p>
      )}

    </div>
  );
}