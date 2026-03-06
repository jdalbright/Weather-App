import React from 'react';
import {
    Sun,
    Moon,
    Cloud,
    CloudSun,
    CloudMoon,
    CloudRain,
    CloudLightning,
    CloudSnow,
    CloudFog,
    LucideProps
} from 'lucide-react';

interface IconProps extends LucideProps {
    size?: number | string;
}

const Defs = () => (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
            {/* Sun Gradient */}
            <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFF7A1" />
                <stop offset="50%" stopColor="#FFDE59" />
                <stop offset="100%" stopColor="#FF914D" />
            </radialGradient>

            {/* Moon Gradient */}
            <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF9D8" />
                <stop offset="55%" stopColor="#FDE68A" />
                <stop offset="100%" stopColor="#F4C95D" />
            </linearGradient>

            <radialGradient id="starGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFF7A1" />
                <stop offset="100%" stopColor="#FFDE59" />
            </radialGradient>

            {/* Cloud Gradients */}
            <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <linearGradient id="darkCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Drop Shadow for extra pop */}
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.15" />
            </filter>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#FFDE59" floodOpacity="0.4" />
            </filter>
            <filter id="nightGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#C7D2FE" floodOpacity="0.45" />
            </filter>
            <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#FFDE59" floodOpacity="0.65" />
            </filter>
        </defs>
    </svg>
);

const IconWrapper = ({ children, filter, className = "" }: { children: React.ReactNode, filter?: string, className?: string }) => (
    <div className={`relative inline-block ${className}`} style={{ filter: filter ? `url(#${filter})` : undefined }}>
        {children}
    </div>
);

export function JoySun({ size = 64, className = "", ...props }: IconProps) {
    return (
        <>
            <Defs />
            <IconWrapper filter="glow" className={className}>
                <Sun
                    size={size}
                    fill="url(#sunGrad)"
                    stroke="#FF914D"
                    strokeWidth={1.5}
                    {...props}
                />
            </IconWrapper>
        </>
    );
}

export function JoyMoon({ size = 64, className = "", ...props }: IconProps) {
    return (
        <>
            <Defs />
            <IconWrapper filter="nightGlow" className={className}>
                <Moon
                    size={size}
                    fill="url(#moonGrad)"
                    stroke="#F8E7A7"
                    strokeWidth={1.5}
                    {...props}
                />
            </IconWrapper>
        </>
    );
}

export function JoyCloudSun({ size = 64, className = "", ...props }: IconProps) {
    return (
        <>
            <Defs />
            <IconWrapper filter="shadow" className={className}>
                <CloudSun
                    size={size}
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    {...props}
                >
                    {/* Note: Standard Lucide components don't support partial fills easily via props, 
                        but we can target them with CSS if needed. For now, we'll use them as is. */}
                </CloudSun>
            </IconWrapper>
        </>
    );
}

export function JoyCloudMoon({ size = 64, className = "", ...props }: IconProps) {
    return (
        <>
            <Defs />
            <IconWrapper filter="nightGlow" className={className}>
                <CloudMoon
                    size={size}
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    {...props}
                />
            </IconWrapper>
        </>
    );
}

export function JoyCloud({ size = 64, className = "", ...props }: IconProps) {
    return (
        <>
            <Defs />
            <IconWrapper filter="shadow" className={className}>
                <Cloud
                    size={size}
                    fill="url(#cloudGrad)"
                    stroke="#CBD5E1"
                    strokeWidth={1.5}
                    {...props}
                />
            </IconWrapper>
        </>
    );
}

export function JoyRain({ size = 64, className = "", ...props }: IconProps) {
    return (
        <>
            <Defs />
            <IconWrapper filter="shadow" className={className}>
                <CloudRain
                    size={size}
                    fill="url(#darkCloudGrad)"
                    stroke="#38BDF8"
                    strokeWidth={1.5}
                    {...props}
                />
            </IconWrapper>
        </>
    );
}

export function JoyHeavyRain({ size = 64, className = "", ...props }: IconProps) {
    return (
        <>
            <Defs />
            <IconWrapper filter="shadow" className={className}>
                <CloudRain
                    size={size}
                    fill="url(#darkCloudGrad)"
                    stroke="#0284C7"
                    strokeWidth={2.5}
                    {...props}
                />
            </IconWrapper>
        </>
    );
}

export function JoySnow({ size = 64, className = "", ...props }: IconProps) {
    return (
        <>
            <Defs />
            <IconWrapper filter="shadow" className={className}>
                <CloudSnow
                    size={size}
                    fill="url(#cloudGrad)"
                    stroke="#BAE6FD"
                    strokeWidth={1.5}
                    {...props}
                />
            </IconWrapper>
        </>
    );
}

export function JoyLightning({ size = 64, className = "", ...props }: IconProps) {
    return (
        <>
            <Defs />
            <IconWrapper filter="glow" className={className}>
                <CloudLightning
                    size={size}
                    fill="url(#darkCloudGrad)"
                    stroke="#FFDE59"
                    strokeWidth={1.5}
                    {...props}
                />
            </IconWrapper>
        </>
    );
}

export function JoyFog({ size = 64, className = "", ...props }: IconProps) {
    return (
        <>
            <Defs />
            <IconWrapper filter="shadow" className={className}>
                <CloudFog
                    size={size}
                    fill="url(#cloudGrad)"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    {...props}
                />
            </IconWrapper>
        </>
    );
}
