"use client";

import React from 'react';

type SpinnerButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

/**
 * A self-contained button component that directly implements the spinner
 * border effect, matching the sample code's structure precisely.
 */
const SpinnerButton: React.FC<SpinnerButtonProps> = ({ children, className = '', ...props }) => {
  const buttonClasses = `spinner-border btn ${className}`.trim();

  const buttonStyle = {
    borderRadius: 'var(--border-radius-btn)',
  };

  const contentStyle = {
    borderRadius: `calc(var(--border-radius-btn) - var(--border-size))`,
  };

  return (
    <button className={buttonClasses} style={buttonStyle} {...props}>
      {/* The inner element is now a <span> to match the sample code */}
      <span className="spinner-content" style={contentStyle}>
        {/* z-10 is a good practice to keep text above gradients */}
        <span className="relative z-10">
          {children}
        </span>
      </span>
    </button>
  );
};

export default SpinnerButton;