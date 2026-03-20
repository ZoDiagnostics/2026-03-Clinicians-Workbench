import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, useReport, useActiveProcedure, usePatients, updateReport } from '../lib/hooks';
import { ReportStatus, DeliveryMethod } from '../types/enums';
import { getReportSectionText } from '../types/report';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

// BRD ZCW-BRD-0076 — Digital Signature
// BRD ZCW-BRD-0077 — Delivery Methods
// BRD ZCW-BRD-0298 — Delivery Defaults

const SignDeliver: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const report = useReport(procedureId);
  const procedure = useActiveProcedure(procedureId);
  const allPatients = usePatients();

  const patient = procedure ? allPatients.find(p => p.id === procedure.patientId) : null;

  const [signing, setSigning] = useState(false);
  const [justSigned, setJustSigned] = useState(false); // Only true when user signs in this session
  const [deliveryMethods, setDeliveryMethods] = useState<Set<string>>(new Set());
  const [delivering, setDelivering] = useState(false);
  const [delivered, setDelivered] = useState(false);

  const canSign = role === 'clinician_auth' || role === 'clinician_admin';
  const wasAlreadySigned = report?.status === ReportStatus.SIGNED || report?.status === ReportStatus.AMENDED;
  const isSigned = justSigned || wasAlreadySigned;

  const handleSign = async () => {
    if (!report || !user || !procedure || signing) return;

    setSigning(true);
    try {
      // Update report status to signed
      await updateReport(report.id, {
        status: ReportStatus.SIGNED,
        signedBy: user.uid,
      });

      // Update procedure status to completed
      const procedureRef = doc(db, 'procedures', procedure.id);
      await updateDoc(procedureRef, {
        status: 'completed',
        signedAt: serverTimestamp(),
        signedBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      setJustSigned(true);
    } catch (err) {
      console.error('Failed to sign report:', err);
    } finally {
      setSigning(false);
    }
  };

  const toggleDeliveryMethod = (method: string) => {
    setDeliveryMethods(prev => {
      const next = new Set(prev);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return next;
    });
  };

  const handleDeliver = async () => {
    if (!report || deliveryMethods.size === 0 || delivering) return;

    setDelivering(true);
    try {
      await updateReport(report.id, {
        deliveryRecords: Array.from(deliveryMethods).map(m => ({
          id: crypto.randomUUID(),
          method: m as DeliveryMethod,
          recipient: patient?.email || 'on-file',
          deliveredAt: Timestamp.now(),
          status: 'queued' as const,
        })),
      });
      setDelivered(true);
    } catch (err) {
      console.error('Failed to record delivery:', err);
    } finally {
      setDelivering(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        {/* Navigation bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{patient ? `${patient.firstName} ${patient.lastName}` : 'Loading...'}</span>
            {patient?.mrn && <span className="text-xs text-gray-400">MRN: {patient.mrn}</span>}
          </div>
          <button onClick={() => navigate(`/report/${procedureId}`)} className="text-xs text-indigo-600 hover:text-indigo-800">&larr; Back to Report</button>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Sign & Deliver</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Report Preview */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Final Report Preview</h2>

                {!report ? (
                  <p className="text-gray-500">No report found for this procedure. Go back and generate a report first.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Patient info */}
                    <div className="border-b border-gray-200 pb-4">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase">Patient</h3>
                      <p className="text-lg font-medium">{patient ? `${patient.firstName} ${patient.lastName}` : '-'}</p>
                      <p className="text-sm text-gray-500">MRN: {patient?.mrn || '-'} | Study: {procedure?.studyType?.replace(/_/g, ' ') || '-'}</p>
                    </div>

                    {/* Findings */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Findings</h3>
                      <div className="bg-gray-50 rounded p-4 text-sm whitespace-pre-wrap">
                        {getReportSectionText(report.sections, 'findings') || 'No findings recorded.'}
                      </div>
                    </div>

                    {/* Clinical Impression */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Clinical Impression</h3>
                      <div className="bg-gray-50 rounded p-4 text-sm whitespace-pre-wrap">
                        {getReportSectionText(report.sections, 'impression') || 'No impression recorded.'}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Recommendations</h3>
                      <div className="bg-gray-50 rounded p-4 text-sm whitespace-pre-wrap">
                        {getReportSectionText(report.sections, 'recommendations') || 'No recommendations recorded.'}
                      </div>
                    </div>

                    {/* ICD/CPT Codes */}
                    {report.icdCodes && report.icdCodes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">ICD-10 Codes</h3>
                        <div className="flex flex-wrap gap-2">
                          {report.icdCodes.map((code: any, i: number) => (
                            <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              {code.code} — {code.description}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Signing & Delivery */}
              <div className="space-y-6">
                {/* E-Signature — BRD ZCW-BRD-0076 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold mb-4">E-Signature</h2>

                  {isSigned ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-green-800 font-medium">
                        {justSigned ? '✓ Report Signed Successfully' : 'Report Previously Signed'}
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {justSigned
                          ? `Signed by ${user?.displayName || user?.email} just now`
                          : `Signed by ${report?.signedBy || 'authorized clinician'}`
                        }
                      </p>
                      {wasAlreadySigned && !justSigned && (
                        <p className="text-xs text-gray-500 mt-2">
                          This report was signed in a previous session. To amend, create an addendum from the Report screen.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-4">
                        By signing, you attest that you have reviewed this report and confirm its accuracy.
                      </p>
                      {!canSign && (
                        <p className="text-sm text-red-600 mb-4">
                          Your role ({role}) does not have signing authority. Only authorized clinicians can sign.
                        </p>
                      )}
                      <button
                        onClick={handleSign}
                        disabled={signing || !canSign || !report}
                        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {signing ? 'Signing...' : 'Sign Report'}
                      </button>
                    </>
                  )}
                </div>

                {/* Delivery — BRD ZCW-BRD-0077, ZCW-BRD-0298 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold mb-4">Delivery Options</h2>

                  {delivered ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-green-800 font-medium">Delivery Recorded</p>
                      <p className="text-sm text-green-600 mt-1">{Array.from(deliveryMethods).join(', ')}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-4">
                        {[
                          { id: 'pdf_download', label: 'PDF Download' },
                          { id: 'email_referring', label: 'Email to Referring Physician' },
                          { id: 'email_patient', label: 'Email to Patient' },
                          { id: 'hl7_fhir', label: 'HL7/FHIR Integration' },
                          { id: 'print', label: 'Print' },
                        ].map(method => (
                          <label key={method.id} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={deliveryMethods.has(method.id)}
                              onChange={() => toggleDeliveryMethod(method.id)}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{method.label}</span>
                          </label>
                        ))}
                      </div>

                      <button
                        onClick={handleDeliver}
                        disabled={delivering || deliveryMethods.size === 0 || !isSigned}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {delivering ? 'Processing...' : !isSigned ? 'Sign report first' : `Deliver (${deliveryMethods.size} selected)`}
                      </button>
                    </>
                  )}
                </div>

                {/* Post-sign navigation */}
                {isSigned && (
                  <button
                    onClick={() => navigate(`/summary/${procedureId}`)}
                    className="w-full px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-900"
                  >
                    View Procedure Summary →
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SignDeliver;
