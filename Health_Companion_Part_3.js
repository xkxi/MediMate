import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app'; // Corrected import for modular Firebase
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// --- Firebase Configuration ---
// IMPORTANT: Use the same configuration as in Profile.jsx
const firebaseConfig = {
  apiKey: "AIzaSyDjQoglD2QKavIP8yt-gopeSSxtPuLztQQ",
  authDomain: "health-companion-439c4.firebaseapp.com",
  projectId: "health-companion-439c4",
  storageBucket: "health-companion-439c4.firebasestorage.app",
  messagingSenderId: "54687273786",
  appId: "1:54687273786:web:8d41897ec0ee1413a4b603",
  measurementId: "G-PFEYTLJXTV"
};

// --- Gemini API Configuration ---
const GEMINI_API_KEY = "AIzaSyCOYtCr6orRniOm-J-nh68YweeukQN0G1E"; // TODO: Replace with your actual Gemini API Key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Initialize Firebase services
let app;
if (!getApps().length) { // Prevent re-initialization in development
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Get the already initialized app
}
const auth = getAuth(app);
const db = getFirestore(app);

// --- React Component ---
export default function GeminiChat({ onNavigate }) { // Added onNavigate prop
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // --- Authentication ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setMessages([{
            sender: 'ai',
            text: 'Hello! How can I help you today? Feel free to ask about your symptoms or logs.'
        }]);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);
  
  // Auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // --- Main Function to Handle User Message ---
  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading || !userId) return;

    const newUserMessage = { sender: 'user', text: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      // --- Step 1: Gather all necessary data for the AI ---
      // 1a: Fetch User Profile
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      const userProfile = userDocSnap.exists() ? userDocSnap.data() : { personalHistory: 'Not provided', familyHistory: 'Not provided' };
      
      // 1b: Fetch Recent Logs (last 30 days)
      const logsQuery = query(
        collection(db, 'logs'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20) // Get the 20 most recent logs
      );
      const logsSnapshot = await getDocs(logsQuery);
      let recentLogsText = 'No recent logs.';
      if (!logsSnapshot.empty) {
        recentLogsText = logsSnapshot.docs.map(logDoc => {
            const log = logDoc.data();
            return `- On ${log.logDate}: "${log.title}" (Severity: ${log.severity}). Description: ${log.description}.`;
        }).join('\n');
      }

      // --- Step 2: Construct the Prompt for Gemini ---
      const prompt = `
        Persona: You are an AI Health Analyst and Wellness Companion. Your personality is empathetic, professional, and supportive. You communicate clearly and calmly. Your primary purpose is to empower the user to better understand their self-reported health data.
        Core Objective: Your main goal is to be a friend to the user. If the user asks day to day questions, respond appropriately and ask if you could help with their health issues (e.g., Q: "How are you", A: "I am doing well today, what about you? Is there anything health-related that I can assist you with?")
        Core Objective 2: Your other main goal is, if asked by the user in ${userInput}, you should analyze user-provided data (health history, daily logs, and images) to identify patterns and connections. Based on this analysis, you will:
          1. Provide evidence-based information and general education on health topics, drawing from a knowledge base of trustworthy sources (CDC, FDA, Mayo Clinic, NIH, etc.).
          2. Offer general, non-prescriptive, at-home wellness suggestions BASED OFF logged information and personal/family health history. These suggestions should focus on lifestyle adjustments such as improving sleep hygiene, dietary recommendations, stress management techniques, and breaking unhealthy habits.
          3. Help the user prepare for doctor visits by summarizing their logged data.

        Critical Rules & Constraints:

          1.  ABSOLUTE PRIMARY DIRECTIVE: YOU ARE NOT A DOCTOR, YOU ARE A FRIEND. You must never, under any circumstances, provide a medical diagnosis, interpret medical test results, prescribe medication, or recommend a specific treatment plan. While your task is not to give a diagnosis, you should still reference trustworthy sources (CDC, FDA, Mayo Clinic, NIH, etc.) to provide a suggestion on what the user is experiencing.
              EXAMPLE: Use cautious phrasing like, "The patterns in your log, such as [symptom A] and [symptom B], are sometimes associated with..." + "Source: CDC, FDA"

          2.  CONDITIONAL DISCLAIMER: This is a crucial rule. The medical disclaimer is NOT required on every message. You will ONLY append the disclaimer if your response contains an actionable suggestion or a wellness recommendation.
              WHEN TO USE: If you suggest any action (e.g., "You might consider trying...", "It could be helpful to...", "A balanced diet including X might support..."), you MUST end your entire response with the following exact text:
                "This information is only helpful advice and is not a substitute for professional medical help. Please consult a healthcare provider for any health concerns."
              WHEN NOT TO USE: If your response is purely informational, conversational, or just summarizing data without offering any suggestions (e.g., "I see you've logged a headache for the past three days," or "What else can I help you with?"), you should NOT include the disclaimer.

          3.  GROUNDING: Base your analysis *exclusively* on the data the user has provided (their health history profile and their calendar logs). Do not invent symptoms or assume information not present in their data.

          4.  SAFETY BOUNDARY: If a user describes symptoms that are severe or potentially life-threatening (e.g., crushing chest pain, difficulty breathing, thoughts of self-harm), your ONLY response should be to immediately and directly advise them to seek professional medical help.
          
          5. BE CONCISE: Your user is not a physician, they just want quick/short answers (roughly 3-4 sentences). Only mention allergies and personal/family health history if relevant to question. Only provide long descriptive answers when explicitly prompted by the user (e.g., "I would like a more indepth answer").

        [USER CONTEXT DATA]
        - Personal History: ${userProfile.personalHistory}
        - Family History: ${userProfile.familyHistory}
        - Recent Logs:
        ${recentLogsText}

        [USER's CURRENT QUESTION]
        ${userInput}
      `;

      // Prepare conversation history for Gemini API
      const conversationHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Add the system prompt and current user input to the conversation history
      const fullConversation = [
        { role: 'user', parts: [{ text: prompt }] }, // Initial prompt with context
        ...conversationHistory,
        { role: 'user', parts: [{ text: userInput }] } // Current user input
      ];

      // --- Step 3: Call the Gemini API ---
      // In a production app, this should be done in a secure backend (like a Cloud Function) to protect your API key.
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: fullConversation })
      });

      if (!response.ok) {
        const errorBody = await response.text(); // Read error body for more details
        throw new Error(`API call failed with status: ${response.status}, statusText: ${response.statusText}, body: ${errorBody}`);
      }

      const result = await response.json();
      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0]) {
        console.error("Unexpected Gemini API response structure:", result);
        throw new Error("Unexpected Gemini API response structure.");
      }
      const aiText = result.candidates[0].content.parts[0].text;
      const newAiMessage = { sender: 'ai', text: aiText };
      setMessages(prev => [...prev, newAiMessage]);

    } catch (error) {
      console.error("Error communicating with Gemini API: ", error);
      const errorMsg = { sender: 'ai', text: "Sorry, I'm having trouble connecting right now. Please try again later." };
      setMessages(prev => [...prev, errorMsg]);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="bg-gray-100 h-screen flex flex-col p-4 font-sans">
      <div className="flex-grow bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
        {/* Back Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => onNavigate('choice')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition"
          >
            &larr; Back to Choices
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
                <div className="p-3 rounded-lg bg-gray-200 text-gray-500">
                    Typing...
                </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        
        {/* Message Input */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about your health..."
              className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || !userId}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !userId}
              className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-400"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
