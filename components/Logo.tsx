import React from 'react';

interface LogoProps {
    className?: string;
    size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            >
                {/* Hexagonal Shield Shape */}
                <path
                    d="M50 5L89 27.5V72.5L50 95L11 72.5V27.5L50 5Z"
                    fill="#050a10"
                    stroke="#10b981"
                    strokeWidth="4"
                />

                {/* Grid/Mesh Lines */}
                <path
                    d="M11 27.5L50 50M89 27.5L50 50M50 95L50 50"
                    stroke="#1e293b"
                    strokeWidth="2"
                />

                {/* Stylized Core - Neural/AI representation */}
                <circle cx="50" cy="50" r="15" fill="#10b981" fillOpacity="0.2" />
                <circle cx="50" cy="50" r="8" fill="#10b981" />

                {/* Accent dots */}
                <circle cx="50" cy="27.5" r="3" fill="#0ea5e9" />
                <circle cx="71.5" cy="61.25" r="3" fill="#0ea5e9" />
                <circle cx="28.5" cy="61.25" r="3" fill="#0ea5e9" />
            </svg>
            <span className="text-2xl font-bold tracking-tighter text-white font-mono">
                SECU<span className="text-cyber-accent">GRID</span>
            </span>
        </div>
    );
};

export default Logo;
