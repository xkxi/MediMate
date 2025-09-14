import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import Profile from './Health_Companion_Part_1.js';
import CalendarLog from './Health_Companion_Part_2.js';
import ChoicePage from './ChoicePage.js';
import GeminiChat from './Health_Companion_Part_3.js';
import DoctorsReport from './Health_Companion_Part_4.js';
import HomePage from './HomePage.js';
import LoginPage from './LoginPage.js';
import RegisterPage from './RegisterPage.js';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCurrentUser(user);
            setUserData(userDoc.data());
          }
          setCurrentPage('choice');
        } else {
          setCurrentUser(null);
          setUserData(null);
          setCurrentPage('home');
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged: ", error);
        // Handle the error appropriately, e.g., show an error message to the user
      }
    });
    return () => unsubscribe();
  }, []);

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleLogin = (userId) => {
    setCurrentPage('choice');
  };

  const handleRegister = (userId) => {
    setCurrentPage('choice');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
      setCurrentPage('home');
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  return (
    <div>
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} userData={userData} />}
      {currentPage === 'login' && <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />}
      {currentPage === 'register' && <RegisterPage onRegister={handleRegister} onNavigate={handleNavigate} />}
      {currentUser && (
        <>
          {currentPage === 'profile' && <Profile onProfileSaved={() => handleNavigate('choice')} currentUserId={currentUser.uid} />}
          {currentPage === 'choice' && <ChoicePage onNavigate={handleNavigate} />}
          {currentPage === 'calendar' && <CalendarLog onNavigate={handleNavigate} />}
          {currentPage === 'chatbot' && <GeminiChat onNavigate={handleNavigate} />}
          {currentPage === 'report' && <DoctorsReport onNavigate={handleNavigate} />}
          <button onClick={handleLogout} className="absolute top-4 right-4 px-4 py-2 bg-red-500 text-white rounded-md">Logout</button>
        </>
      )}
    </div>
  );
}