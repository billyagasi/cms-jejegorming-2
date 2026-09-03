import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export default function Card({ hover = false, className = '', children, ...props }: CardProps) {
  return (
    <div className={`bento-card ${hover ? 'bento-card-hover' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}
