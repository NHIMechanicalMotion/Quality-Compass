import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ActionTooltipProps {
  title: string;
  description?: string;
  badge?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const ActionTooltip: React.FC<ActionTooltipProps> = ({
  title,
  description,
  badge,
  position = 'bottom',
  delayMs = 180,
  disabled = false,
  className = '',
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const offset = 8;
    const padding = 150; // half of max tooltip width (280px / 2 + margin)

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = Math.max(20, rect.top - offset);
        left = Math.max(padding, Math.min(window.innerWidth - padding, rect.left + rect.width / 2));
        break;
      case 'bottom':
        top = Math.min(window.innerHeight - 80, rect.bottom + offset);
        left = Math.max(padding, Math.min(window.innerWidth - padding, rect.left + rect.width / 2));
        break;
      case 'left':
        top = Math.max(40, Math.min(window.innerHeight - 60, rect.top + rect.height / 2));
        left = Math.max(10, rect.left - offset);
        break;
      case 'right':
        top = Math.max(40, Math.min(window.innerHeight - 60, rect.top + rect.height / 2));
        left = Math.min(window.innerWidth - 290, rect.right + offset);
        break;
    }

    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);

    // If the click hit the wrapper div rather than the inner button/element, forward the click
    if (e.target === triggerRef.current && React.isValidElement(children)) {
      const childProps = children.props as any;
      if (typeof childProps?.onClick === 'function') {
        childProps.onClick(e);
      }
    }
  };

  useEffect(() => {
    if (!isVisible) return;

    const handleScrollOrResize = () => {
      setIsVisible(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Transform styles according to position
  const getTransformStyle = () => {
    switch (position) {
      case 'top':
        return 'translate(-50%, -100%)';
      case 'bottom':
        return 'translate(-50%, 0)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'right':
        return 'translate(0, -50%)';
    }
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`inline-flex items-center ${className}`}
    >
      {children}
      {isVisible &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: getTransformStyle(),
              zIndex: 99999,
            }}
            className="pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
            role="tooltip"
          >
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 shadow-2xl rounded-lg p-2.5 max-w-[280px] w-max text-left text-slate-100">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white tracking-wide">{title}</span>
                {badge && (
                  <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-[11px] text-slate-300 mt-1 leading-snug font-normal">
                  {description}
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
