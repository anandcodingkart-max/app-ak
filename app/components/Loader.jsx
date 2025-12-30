import React from "react";

const Loader = () => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner */}
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

        {/* Text */}
        <p className="text-sm font-medium text-gray-700">Processing...</p>
      </div>
    </div>
  );
};

export default Loader;
