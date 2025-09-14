import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// --- Firebase Configuration ---
// IMPORTANT: Use the same configuration as in Profile.jsx
const firebaseConfig = {
  apiKey: "PLACEHOLDER",
  authDomain: "PLACEHOLDER",
  projectId: "PLACEHOLDER",
  storageBucket: "PLACEHOLDER",
  messagingSenderId: "PLACEHOLDER",
  appId: "PLACEHOLDER",
  measurementId: "PLACEHOLDER"
};

// --- Gemini API Configuration ---
const GEMINI_API_KEY = "PLACEHOLDER";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- React Component ---
export default function DoctorsReport({ onNavigate }) {
  const [userId, setUserId] = useState(null);
  const [report, setReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visitPurpose, setVisitPurpose] = useState(''); // New state for visit purpose
  const [statusMessage, setStatusMessage] = useState('Describe your visit purpose and generate your 90-day health summary.');

  // --- Authentication ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Main Function to Generate the Report ---
  const handleGenerateReport = async () => {
    if (isLoading || !userId) return;
    setIsLoading(true);
    setReport('');
    setStatusMessage('Gathering your health data...');

    try {
      // --- Step 1: Gather all necessary data ---
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      const userProfile = userDocSnap.exists() ? userDocSnap.data() : { personalHistory: 'Not provided.', familyHistory: 'Not provided.' };

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const logsQuery = query(
        collection(db, 'logs'),
        where('userId', '==', userId),
        where('createdAt', '>=', ninetyDaysAgo),
        orderBy('createdAt', 'asc') // chronological order
      );
      const logsSnapshot = await getDocs(logsQuery);
      let recentLogsText = 'No health events logged in the past 90 days.';
      if (!logsSnapshot.empty) {
        recentLogsText = logsSnapshot.docs.map(logDoc => {
            const log = logDoc.data();
            return `- ${log.logDate}: "${log.title}". Description: ${log.description}. (Reported Severity: ${log.severity}/10). ${log.imageUrl ? '[Photo available]' : ''}`;
        }).join('\n');
      }

      setStatusMessage('Generating summary with AI...');

      // Add visit purpose to the prompt if provided
      const visitPurposeText = visitPurpose ? `The patient's stated purpose for this doctor's visit is: "${visitPurpose}".` : '';

      // --- Step 2: Construct the Prompt for Gemini ---
      const prompt = `
        [SYSTEM PROMPT]
        Role: AI Medical Scribe.
        Goal: Generate a concise, objective clinical summary of a patient's self-reported data from the last 90 days, specifically filtering and presenting only information directly relevant to the stated purpose of the doctor's visit. The output is for a physician.
        Output Format:
          1.  Title: Patient Health Summary
          2.  Reports from: [Start Date] - [End Date]
          3.  Chronological Log (From furthest to most recent, *filtered by relevance to visit purpose*):
              YYYY-MM-DD: - [Bulleted list of patient's objective reports and direct quotes for symptoms.]

        Critical Rules:
          1.  Objective Data Only: Transcribe facts. DO NOT analyze, interpret, diagnose, or offer suggestions.
          2.  90-Day Window: Exclude all data older than 90 days from the report generation date.
          3.  Relevance Filter: STRICTLY filter the 'Symptom & Activity Log' to include ONLY entries that are directly relevant to the 'Purpose of Visit'. If no purpose is stated, include all relevant logs.
          4.  Clinical Tone: Use professional, neutral language. Quote the patient's subjective descriptions where applicable (e.g., reports feeling "fatigued").

        [PATIENT DATA]
        - Patient Background:
          - Personal History: ${userProfile.personalHistory}
          - Family History: ${userProfile.familyHistory}
        - Purpose of Visit: ${visitPurposeText}
        - Symptom & Activity Log (Past 90 Days):
        ${recentLogsText}

        [INSTRUCTION]
        Generate the summary report based on the data above.
      `;
      
      // --- Step 3: Call the Gemini API ---
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorBody}`);
      }
      
      const result = await response.json();
      let aiReport = 'Could not generate report: Invalid AI response structure.';

      if (result && result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0 && result.candidates[0].content.parts[0].text) {
        aiReport = result.candidates[0].content.parts[0].text;
      } else {
        console.error("Unexpected AI response structure:", result);
      }
      setReport(aiReport);
      setStatusMessage('Report generated successfully.');

    } catch (error) {
      console.error("Error generating report: ", error);
      setStatusMessage('An error occurred. Please try again.');
      setReport('Could not generate the report due to an error.');
    } finally {
        setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report);
    setStatusMessage('Report copied to clipboard!');
    setTimeout(() => setStatusMessage('Report generated successfully.'), 2000);
  };

  return (
    <div className="bg-gray-50 min-h-screen flex justify-center p-4 font-sans">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-8">
        <button
          onClick={() => onNavigate('choice')}
          className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          &larr; Back to Choices
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Doctor's Summary</h1>
        <p className="text-gray-600 mb-6">Describe the purpose of your doctor's visit to get a tailored health summary.</p>
        
        {/* New: User Input for Visit Purpose */}
        <div className="mb-6">
          <label htmlFor="visitPurpose" className="block text-sm font-medium text-gray-700 mb-2">
            Purpose of Doctor's Visit (e.g., "check-up", "persistent headaches", "diabetes management"):
          </label>
          <input
            type="text"
            id="visitPurpose"
            value={visitPurpose}
            onChange={(e) => setVisitPurpose(e.target.value)}
            placeholder="e.g., annual check-up, follow-up on blood pressure, discuss fatigue"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isLoading}
          />
        </div>

        <div className="text-center mb-6">
            <button
                onClick={handleGenerateReport}
                disabled={isLoading || !userId}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
                {isLoading ? 'Generating...' : 'Generate Health Summary'}
            </button>
            <p className="text-sm text-gray-500 mt-2">{statusMessage}</p>
        </div>

        {/* Report Display Area */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 min-h-[300px] relative">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                {report || "Your report will appear here..."}
            </pre>
            {report && !isLoading && (
                <button 
                    onClick={copyToClipboard}
                    className="absolute top-4 right-4 px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300"
                >
                    Copy
                </button>
            )}
        </div>
      </div>
    </div>
  );
}

