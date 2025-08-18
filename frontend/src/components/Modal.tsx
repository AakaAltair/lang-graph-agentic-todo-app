"use client";

import React from 'react';
import SpinnerBorder from './SpinnerBorder';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  // If the modal is not open, render nothing.
  if (!isOpen) {
    return null;
  }

  // Prevent clicks inside the modal content from closing it.
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    // The Modal Wrapper/Backdrop
    // This div covers the entire screen and handles closing the modal.
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      {/* The Modal Content */}
      {/* We stop propagation here so clicks don't close the modal */}
      <div onClick={handleContentClick} className="w-full max-w-lg">
        {/* We reuse our SpinnerBorder for a consistent look */}
        <SpinnerBorder borderRadiusVar="--border-radius-card" className="card">
          <div className="card-text-content">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{title}</h2>
              <button 
                onClick={onClose} 
                className="text-gray-400 text-3xl leading-none hover:text-white transition-colors"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>
            {/* Modal Body */}
            <div>
              {children}
            </div>
          </div>
        </SpinnerBorder>
      </div>
    </div>
  );
};

export default Modal;