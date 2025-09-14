export default function ChoicePage({ onNavigate }) {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-12 text-center">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-10">What would you like to do next?</h1>
        <div className="grid grid-cols-2 gap-8">
          <button
            onClick={() => onNavigate('calendar')}
            className="flex flex-col items-center justify-center p-8 text-white text-2xl font-bold rounded-lg shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 transition aspect-square"
            style={{ backgroundColor: '#95d9c3', '--tw-ring-color': '#95d9c3' }}
          >
            Health Calendar
          </button>
          <button
            onClick={() => onNavigate('chatbot')}
            className="flex flex-col items-center justify-center p-8 text-white text-2xl font-bold rounded-lg shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 transition aspect-square"
            style={{ backgroundColor: '#afbfeb', '--tw-ring-color': '#afbfeb' }}
          >
            Health Companion
          </button>
          <button
            onClick={() => onNavigate('report')}
            className="flex flex-col items-center justify-center p-8 text-white text-2xl font-bold rounded-lg shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 transition aspect-square"
            style={{ backgroundColor: '#e483b4', '--tw-ring-color': '#e483b4' }}
          >
            Report Generator
          </button>
          <button
            onClick={() => onNavigate('profile')}
            className="flex flex-col items-center justify-center p-8 text-white text-2xl font-bold rounded-lg shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 transition aspect-square"
            style={{ backgroundColor: '#ffc0be', '--tw-ring-color': '#ffc0be' }}
          >
            Personal/Family Health History
          </button>
        </div>
      </div>
    </div>
  );
}