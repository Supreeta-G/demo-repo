import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 1);
    let end = Math.min(totalPages, currentPage + 1);

    // Adjust if near start
    if (currentPage === 1) {
      end = Math.min(3, totalPages);
    }
    // Adjust if near end
    if (currentPage === totalPages) {
      start = Math.max(1, totalPages - 2);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-3 mt-10">
      
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-all"
      >
        Prev
      </button>

      {/* Page Numbers */}
      <div className="flex gap-1">
        {pageNumbers.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-all
              ${currentPage === page 
                ? 'bg-fern text-white shadow-md' 
                : 'border border-gray-300 hover:bg-gray-50'}`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-all"
      >
        Next
      </button>

    </div>
  );
};

export default Pagination;