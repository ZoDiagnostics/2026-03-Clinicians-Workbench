import React, { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { generateClinicalImpression, generateRecommendations, isGeminiConfigured } from '../lib/gemini';
import { Finding } from '../types/finding';

// BRD ZCW-BRD-0297 — Copilot Auto-Draft
// Generates clinical impression and recommendations from findings using Gemini AI

interface CopilotAutoDraftProps {
  findings: Finding[];
  studyType?: string;
  patientContext?: string;
  onAcceptImpression?: (text: string) => void;
  onAcceptRecommendations?: (text: string) => void;
}

const CopilotAutoDraft: React.FC<CopilotAutoDraftProps> = ({
  findings = [],
  studyType = 'capsule endoscopy',
  patientContext,
  onAcceptImpression,
  onAcceptRecommendations,
}) => {
  const [impressionText, setImpressionText] = useState('');
  const [recommendationsText, setRecommendationsText] = useState('');
  const [generatingImpression, setGeneratingImpression] = useState(false);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [impressionAccepted, setImpressionAccepted] = useState(false);
  const [recommendationsAccepted, setRecommendationsAccepted] = useState(false);

  const configured = isGeminiConfigured();

  // Build findings summary for the AI prompt
  const findingsSummary = findings.length > 0
    ? findings.map((f, i) =>
        `${i + 1}. ${f.classification || f.type || 'Finding'} in ${f.anatomicalRegion || f.region || 'unknown region'} (${
          f.provenance === 'ai_detected' ? 'AI-detected' : 'clinician-marked'
        }${f.aiConfidence || f.confidence ? `, confidence: ${f.aiConfidence || f.confidence}%` : ''})`
      ).join('\n')
    : 'No significant findings recorded.';

  const handleGenerateImpression = async () => {
    setGeneratingImpression(true);
    setError(null);
    setImpressionAccepted(false);
    try {
      const result = await generateClinicalImpression(findingsSummary, studyType, patientContext);
      setImpressionText(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate impression');
    } finally {
      setGeneratingImpression(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    setGeneratingRecommendations(true);
    setError(null);
    setRecommendationsAccepted(false);
    try {
      const result = await generateRecommendations(findingsSummary, impressionText, studyType);
      setRecommendationsText(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate recommendations');
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const handleAcceptImpression = () => {
    onAcceptImpression?.(impressionText);
    setImpressionAccepted(true);
  };

  const handleAcceptRecommendations = () => {
    onAcceptRecommendations?.(recommendationsText);
    setRecommendationsAccepted(true);
  };

  if (!configured) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center mb-3">
          <SparklesIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-bold text-gray-400">Copilot Auto-Draft</h2>
        </div>
        <p className="text-sm text-gray-500">
          AI drafting requires a Gemini API key. Add <code className="bg-gray-100 px-1 rounded text-xs">VITE_GEMINI_API_KEY</code> to your .env file to enable.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center mb-4">
        <SparklesIcon className="h-5 w-5 text-blue-500 mr-2" />
        <h2 className="text-lg font-bold">Copilot Auto-Draft</h2>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        {findings.length} finding{findings.length !== 1 ? 's' : ''} available for AI analysis
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Clinical Impression Section */}
      <div className="mb-4 p-3 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Clinical Impression</h3>
          {impressionAccepted && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Accepted</span>}
        </div>

        {impressionText ? (
          <>
            <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap bg-blue-50 border border-blue-100 rounded p-2">{impressionText}</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleAcceptImpression}
                disabled={impressionAccepted}
                className={`px-3 py-1 text-xs font-semibold rounded ${impressionAccepted ? 'bg-green-100 text-green-600' : 'text-white bg-green-500 hover:bg-green-600'}`}
              >
                {impressionAccepted ? '✓ Accepted' : 'Accept'}
              </button>
              <button
                onClick={handleGenerateImpression}
                disabled={generatingImpression}
                className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Regenerate
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={handleGenerateImpression}
            disabled={generatingImpression}
            className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:text-gray-400 disabled:bg-gray-50"
          >
            {generatingImpression ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span> Generating...
              </span>
            ) : (
              'Generate Clinical Impression'
            )}
          </button>
        )}
      </div>

      {/* Recommendations Section */}
      <div className="p-3 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Recommendations</h3>
          {recommendationsAccepted && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Accepted</span>}
        </div>

        {recommendationsText ? (
          <>
            <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap bg-blue-50 border border-blue-100 rounded p-2">{recommendationsText}</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleAcceptRecommendations}
                disabled={recommendationsAccepted}
                className={`px-3 py-1 text-xs font-semibold rounded ${recommendationsAccepted ? 'bg-green-100 text-green-600' : 'text-white bg-green-500 hover:bg-green-600'}`}
              >
                {recommendationsAccepted ? '✓ Accepted' : 'Accept'}
              </button>
              <button
                onClick={handleGenerateRecommendations}
                disabled={generatingRecommendations}
                className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Regenerate
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={handleGenerateRecommendations}
            disabled={generatingRecommendations || !impressionText}
            className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:text-gray-400 disabled:bg-gray-50"
          >
            {generatingRecommendations ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span> Generating...
              </span>
            ) : !impressionText ? (
              'Generate impression first'
            ) : (
              'Generate Recommendations'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default CopilotAutoDraft;
