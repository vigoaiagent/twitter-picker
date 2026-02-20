'use client';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-700" />
        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-white font-medium">Scraping tweet interactions...</p>
        <p className="text-gray-400 text-sm mt-1">This may take 30-60 seconds</p>
      </div>
    </div>
  );
}
