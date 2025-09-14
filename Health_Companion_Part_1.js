import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase'; // Import db from the centralized firebase.js

export default function Profile({ onProfileSaved, currentUserId }) {
  const [personalHistory, setPersonalHistory] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Loading ---
  useEffect(() => {
    let isMounted = true; // Flag to track if the component is mounted

    const fetchProfile = async () => {
      if (!currentUserId) {
        if (isMounted) {
          setStatusMessage('Please log in to view your profile.');
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        if (isMounted) {
          setStatusMessage('Fetching your profile...');
        }
      }
      
      const userDocRef = doc(db, 'users', currentUserId);
      const userDocSnap = await getDoc(userDocRef);

      if (isMounted) {
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setPersonalHistory(userData.personalHistory || '');
          setFamilyHistory(userData.familyHistory || '');
          setStatusMessage('Profile loaded.');
        } else {
          setStatusMessage('Welcome! Please fill out your health history.');
        }
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false; // Set flag to false when component unmounts
    };
  }, [currentUserId]); // Re-run when currentUserId changes

  // --- Save Profile Data ---
  const handleSaveProfile = async () => {
    if (!currentUserId) {
      setStatusMessage('Error: User not authenticated.');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('Saving profile...');

    try {
      // Get a reference to the user's document path.
      // The `doc` function takes the db instance, collection name ('users'), and document ID (currentUserId).
      const userDocRef = doc(db, 'users', currentUserId);
      
      // Use `setDoc` to create or overwrite the document with the new data.
      // The `merge: true` option prevents overwriting other fields if they exist.
      await setDoc(userDocRef, {
        personalHistory: personalHistory,
        familyHistory: familyHistory,
        updatedAt: new Date().toISOString() // Good practice to store a timestamp
      }, { merge: true });

      setStatusMessage('Profile saved successfully!');
      if (onProfileSaved) {
        onProfileSaved();
      }
    } catch (error) {
      console.error("Error saving profile: ", error);
      setStatusMessage('Error: Could not save profile.');
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">My Health Profile</h1>
        <p className="text-gray-600 mb-6">To get the most accurate insights, please be as detailed as possible. Include dates, medication names, and specific conditions.</p>
        
        <div className="space-y-6">
          {/* Personal Health History Input */}
          <div>
            <label htmlFor="personalHistory" className="block text-sm font-medium text-gray-700 mb-1">My Personal Health History</label>
            <textarea
              id="personalHistory"
              rows="6"
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="e.g., Allergic to penicillin. Diagnosed with asthma in 2010. Currently taking Albuterol as needed."
              value={personalHistory}
              onChange={(e) => setPersonalHistory(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Family Health History Input */}
          <div>
            <label htmlFor="familyHistory" className="block text-sm font-medium text-gray-700 mb-1">My Family's Health History</label>
            <textarea
              id="familyHistory"
              rows="6"
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="e.g., Father has Type 2 diabetes. Mother has a history of high blood pressure."
              value={familyHistory}
              onChange={(e) => setFamilyHistory(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Save Button and Status Message */}
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-gray-500">{statusMessage}</p>
          <button
            onClick={handleSaveProfile}
            disabled={isLoading || !currentUserId}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

