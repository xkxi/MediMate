import React, { useState, useEffect } from 'react';
// Import Firebase services from Part 1 to avoid re-initialization
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, setDoc, query, where, onSnapshot, orderBy, deleteDoc } from 'firebase/firestore';

// --- React Component ---
export default function CalendarLog({ onNavigate }) {
  const [userId, setUserId] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [logs, setLogs] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(5);
  const [statusMessage, setStatusMessage] = useState('Ready to log.');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // --- Authentication ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        signInAnonymously(auth).catch((error) => {
            console.error("Anonymous sign-in failed in CalendarLog:", error);
            setStatusMessage('Error: Could not connect to the service.');
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Fetch Logs ---
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'logs'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc') // Order by creation date, most recent first
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(fetchedLogs);
    }, (error) => {
      console.error("Error fetching logs: ", error);
      setStatusMessage('Error: Could not fetch logs.');
    });

    return () => unsubscribe();
  }, [userId]);


  // --- Handle Form Submission ---
  const handleSaveLog = async () => {
    if (!userId || !title || !description) {
      setStatusMessage('Please fill in a title and description.');
      return;
    }
    setIsLoading(true);
    setStatusMessage('Saving log...');

    try {
      // Step 2: Save or Update the log data to Firestore
      const logData = {
        userId: userId,
        logDate: logDate,
        title: title,
        description: description,
        severity: severity,
        updatedAt: serverTimestamp() // Update timestamp on save/edit
      };

      if (editingLog) {
        // Update existing log
        const logDocRef = doc(db, 'logs', editingLog.id);
        await setDoc(logDocRef, logData, { merge: true });
        setStatusMessage('Log updated successfully!');
        setEditingLog(null); // Clear editing state
      } else {
        // Add a new document
        await addDoc(collection(db, 'logs'), {
          ...logData,
          createdAt: serverTimestamp() // Only set createdAt for new logs
        });
        setStatusMessage('Log saved successfully!');
      }
      
      // Reset form fields
      setTitle('');
      setDescription('');
      setSeverity(5);
      // Logs are automatically updated by the useEffect listener

    } catch (error) {
      console.error("Error saving log: ", error);
      setStatusMessage('Error: Could not save log.');
    }
    setIsLoading(false);
  };

  // --- Handle Log Deletion ---
  const handleDeleteLog = async (logId) => {
    if (!userId || !logId) {
      setStatusMessage('Error: Cannot delete log without ID.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this health log? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setStatusMessage('Deleting log...');
    try {
      await deleteDoc(doc(db, 'logs', logId));
      setStatusMessage('Log deleted successfully!');
      // Logs are automatically updated by the useEffect listener
    } catch (error) {
      console.error("Error deleting log: ", error);
      setStatusMessage('Error: Could not delete log.');
    }
    setIsLoading(false);
  };

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday

  const generateCalendarDays = (month, year) => {
    const numDays = daysInMonth(month, year);
    const firstDay = firstDayOfMonth(month, year);
    const days = [];

    // Fill leading empty days
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Fill days of the month
    for (let i = 1; i <= numDays; i++) {
      days.push(i);
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prevMonth => {
      if (prevMonth === 0) {
        setCurrentYear(prevYear => prevYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => {
      if (prevMonth === 11) {
        setCurrentYear(prevYear => prevYear + 1);
        return 0;
      }
      return prevMonth + 1;
    });
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const calendarDays = generateCalendarDays(currentMonth, currentYear);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center p-4 font-sans">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => onNavigate('choice')}
            className="mr-4 p-2 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none"
          >
            &larr; Back to Choices
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{editingLog ? 'Edit Health Log' : 'New Health Log'}</h1>
        </div>
        
        <div className="space-y-4">
          {/* Date Input */}
          <div>
            <label htmlFor="logDate" className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              id="logDate"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
              disabled={isLoading}
            />
          </div>
          
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Concern / Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mole on back, Stomach pain"
              className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
              disabled={isLoading}
            />
          </div>
          
          {/* Description Input */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="description"
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe symptoms, feelings, or observations. Be specific!"
              className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
              disabled={isLoading}
            />
          </div>
          
          {/* Severity Slider */}
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700">Severity / Pain Level: {severity}</label>
            <input
              type="range"
              id="severity"
              min="1"
              max="10"
              value={severity}
              onChange={(e) => setSeverity(parseInt(e.target.value, 10))}
              className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isLoading}
            />
          </div>
          
        </div>

        {/* Save Button and Status */}
        <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-gray-500">{statusMessage}</p>
            <button
                onClick={handleSaveLog}
                disabled={isLoading || !userId}
                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Saving...' : (editingLog ? 'Update Log' : 'Save Log')}
            </button>
            {editingLog && (
              <button
                onClick={() => {
                  setEditingLog(null);
                  setTitle('');
                  setDescription('');
                  setSeverity(5);
                  setStatusMessage('Editing cancelled.');
                }}
                disabled={isLoading}
                className="ml-4 px-6 py-2 bg-gray-500 text-white font-semibold rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Cancel Edit
              </button>
            )}
        </div>
      </div>

      {/* Calendar Display */}
      <div className="w-full max-w-xl bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="px-3 py-1 bg-blue-500 text-white rounded-md">Previous</button>
          <h2 className="text-xl font-bold text-gray-800">{monthNames[currentMonth]} {currentYear}</h2>
          <button onClick={handleNextMonth} className="px-3 py-1 bg-blue-500 text-white rounded-md">Next</button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="font-semibold text-gray-700">{day}</div>
          ))}
          {calendarDays.map((day, index) => {
            const dateString = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
            const logsForDay = logs.filter(log => log.logDate === dateString);
            const hasLogs = logsForDay.length > 0;

            return (
              <div
                key={index}
                className={`p-2 rounded-md ${day ? 'bg-gray-100' : 'bg-gray-50'} ${hasLogs ? 'border-2 border-blue-500' : ''}`}
                onClick={() => day && setLogDate(dateString)}
              >
                {day}
                {hasLogs && (
                  <div className="text-xs text-blue-700 mt-1">
                    {logsForDay.map((log, i) => (
                      <span key={i} className="block truncate">{log.title}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Display Logs */}
      <div className="w-full max-w-xl bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your Health Logs</h2>
        {logs.length === 0 && !isLoading && <p className="text-gray-600">No logs yet. Add one above!</p>}
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="border border-gray-200 rounded-md p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800">{log.title}</h3>
                <span className="text-sm text-gray-500">{log.logDate}</span>
              </div>
              <p className="text-gray-700 mb-2">{log.description}</p>
              <p className="text-sm text-gray-600">Severity: {log.severity}/10</p>
              <div className="mt-3 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditingLog(log);
                    setLogDate(log.logDate);
                    setTitle(log.title);
                    setDescription(log.description);
                    setSeverity(log.severity);
                    setStatusMessage(`Editing log: ${log.title}`);
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white text-sm font-semibold rounded-md hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteLog(log.id)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-md hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
