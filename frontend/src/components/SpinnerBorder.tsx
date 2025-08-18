import React from 'react';

// Define the props for our component using TypeScript
interface SpinnerBorderProps {
  /**
   * The content to be rendered inside the spinner border.
   */
  children: React.ReactNode;
  /**
   * Optional additional CSS classes to apply to the root element.
   */
  className?: string;
  /**
   * The HTML element type to render (e.g., 'div', 'button', 'a').
   * @default 'div'
   */
  as?: React.ElementType;
  /**
   * The required CSS variable that defines the border radius from your design system.
   */
  borderRadiusVar: '--border-radius-card' | '--border-radius-btn';
  /**
   * An optional override for the border-radius. Accepts any valid CSS radius value (e.g., '10px', '2rem').
   * If provided, this will be used instead of borderRadiusVar.
   */
  customBorderRadius?: string;
  /**
   * All other props (like onClick, href, id, aria-*) will be passed down
   * to the root element.
   */
  [key: string]: any;
}

/**
 * A reusable, polymorphic component that wraps its children with the
 * signature "flowing comet" animated border. It's designed to be flexible
 * and integrate seamlessly with a CSS variable-based design system.
 */
const SpinnerBorder: React.FC<SpinnerBorderProps> = ({
  children,
  className = '',
  as: Component = 'div',
  borderRadiusVar,
  customBorderRadius,
  ...rest // <-- IMPROVEMENT 1: Capture all other passed-in props
}) => {
  // Combine the base class with any additional classes
  const componentClassName = `spinner-border ${className}`.trim();

  // IMPROVEMENT 2: Allow for a custom override, otherwise use the design system variable.
  const finalBorderRadius = customBorderRadius ?? `var(${borderRadiusVar})`;

  // Define inline styles to dynamically set the border radius
  const wrapperStyle = {
    borderRadius: finalBorderRadius,
  };

  const contentStyle = {
    // The inner radius must also be calculated from the final value
    borderRadius: `calc(${finalBorderRadius} - var(--border-size))`,
  };

  return (
    // Render the component using the specified tag ('div', 'button', etc.)
    // and spread the rest of the props onto it.
    <Component
      className={componentClassName}
      style={wrapperStyle}
      {...rest} // <-- Apply all other props here
    >
      <div className="spinner-content" style={contentStyle}>
        {children}
      </div>
    </Component>
  );
};

export default SpinnerBorder;