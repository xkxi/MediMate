import React from 'react';

export default function HomePage({ onNavigate, userData }) {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-5xl font-extrabold text-purple-900 mb-8">MEDIMATE</h1>
        {userData && <p className="text-2xl text-gray-700 mb-8">Welcome, {userData.username}!</p>}
        <div className="space-y-4">
          {!userData && (
            <>
              <button
                onClick={() => onNavigate('login')}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                Login
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
              >
                Create New User
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}