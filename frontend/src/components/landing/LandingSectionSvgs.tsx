import React from 'react';

const decorProps = { 'aria-hidden': true as const, focusable: false as const };

/** How it works — three-step journey connector (landing page only) */
export function HowItWorksJourneyArt({ className }: { className?: string }) {
    const gid = React.useId().replace(/:/g, '');
    const steps = ['01', '02', '03'];
    const xs = [80, 460, 840];
    return (
        <svg
            {...decorProps}
            viewBox="0 0 920 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id={`journey-grad-${gid}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#f58220" />
                </linearGradient>
            </defs>
            <path
                d="M80 50 C200 8 320 92 460 50 S740 8 840 50"
                stroke="#e2e8f0"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M80 50 C200 8 320 92 460 50 S740 8 840 50"
                stroke={`url(#journey-grad-${gid})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="8 12"
                fill="none"
                opacity="0.9"
                className="animate-journey-dash"
            />
            {xs.map((cx, i) => (
                <g key={cx}>
                    <circle cx={cx} cy={50} r="22" fill="#fff" stroke="#14b8a6" strokeWidth="2" />
                    <text
                        x={cx}
                        y={54}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#e06d10"
                        style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                        }}
                    >
                        {steps[i]}
                    </text>
                </g>
            ))}
        </svg>
    );
}

/** Maps API specialization ids (seed data) to a compact glyph for chips */
export type SpecialtyGlyphKind =
    | 'stethoscope'
    | 'heart'
    | 'brain'
    | 'eye'
    | 'tooth'
    | 'lungs'
    | 'belly'
    | 'bone'
    | 'kidney'
    | 'mind'
    | 'baby'
    | 'gyn'
    | 'skin'
    | 'leaf'
    | 'scan'
    | 'emergency'
    | 'pulse';

export function specializationIdToGlyphKind(id: string): SpecialtyGlyphKind {
    const s = id.toLowerCase();
    if (/cardio|heart/.test(s)) return 'heart';
    if (/neuro/.test(s)) return 'brain';
    if (/ophthal|optomet/.test(s)) return 'eye';
    if (/dent|orthodon|oral/.test(s)) return 'tooth';
    if (/pulmon|lung/.test(s)) return 'lungs';
    if (/gastro|hepat/.test(s)) return 'belly';
    if (/ortho|rheum|sport/.test(s)) return 'bone';
    if (/nephro|urolo/.test(s)) return 'kidney';
    if (/psych|therap/.test(s)) return 'mind';
    if (/pediat/.test(s)) return 'baby';
    if (/gyn|obstet|fertility/.test(s)) return 'gyn';
    if (/derm|cosmet|tricho/.test(s)) return 'skin';
    if (/ayurved|homeop|unani|siddha/.test(s)) return 'leaf';
    if (/radio|patho/.test(s)) return 'scan';
    if (/emergency|critical/.test(s)) return 'emergency';
    if (/onco|hemato|endo|diabet|surgeon|surgery|plast|vascul|general_surgeon|ent|otolaryng/.test(s))
        return 'pulse';
    return 'stethoscope';
}

const glyphStroke = {
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

/** 24×24 mini icon — pairs with specialization list from API */
export function SpecialtyChipGlyph({
    kind,
    className = 'h-4 w-4',
}: {
    kind: SpecialtyGlyphKind;
    className?: string;
}) {
    switch (kind) {
        case 'heart':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <path
                        {...glyphStroke}
                        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
                    />
                </svg>
            );
        case 'brain':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <path
                        {...glyphStroke}
                        d="M12 5C9 5 7 7.5 7 10v3c0 2 2 4 5 4s5-2 5-4v-3c0-2.5-2-5-5-5z"
                    />
                    <path {...glyphStroke} d="M10 9h4M10 12h3" opacity="0.55" />
                </svg>
            );
        case 'eye':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <ellipse cx="12" cy="12" rx="8" ry="5" {...glyphStroke} />
                    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'tooth':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <path
                        {...glyphStroke}
                        d="M12 3c-1.8 0-3.2 1.5-3.2 3.4 0 1.2-.3 2.4-.8 3.5-.3.7-.5 1.5-.5 2.3V20c0 .6.4 1 1 1h1.4c.3 0 .6-.2.7-.5l1.2-3.6 1.2 3.6c.1.3.4.5.7.5H14c.6 0 1-.4 1-1v-7.8c0-.8-.2-1.6-.5-2.3-.5-1.1-.8-2.3-.8-3.5C15.2 4.5 13.8 3 12 3z"
                    />
                </svg>
            );
        case 'lungs':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <path
                        {...glyphStroke}
                        d="M12 3v8M9 6C6 7 4 10 4 14v5a2 2 0 0 0 2 2h1c1.5 0 2.8-1 3.3-2.4l.6-1.6M15 6c3 1 5 4 5 8v5a2 2 0 0 1-2 2h-1c-1.5 0-2.8-1-3.3-2.4l-.6-1.6"
                    />
                </svg>
            );
        case 'belly':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <ellipse cx="12" cy="12" rx="7" ry="9" {...glyphStroke} />
                    <path {...glyphStroke} d="M12 8v8M9.5 10.5h5M9.5 13.5h5" opacity="0.5" />
                </svg>
            );
        case 'bone':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <line x1="9" y1="12" x2="15" y2="12" {...glyphStroke} />
                    <circle cx="7" cy="12" r="2.5" {...glyphStroke} />
                    <circle cx="17" cy="12" r="2.5" {...glyphStroke} />
                </svg>
            );
        case 'kidney':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <path
                        {...glyphStroke}
                        d="M8.5 6C6 7 4 10 4 13c0 4 3.5 7 7.5 7S17 18 17 14c0-3-2-6-4.5-7-1.3-.5-2.7-.5-4 0z"
                    />
                </svg>
            );
        case 'mind':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <path
                        {...glyphStroke}
                        d="M12 3a4 4 0 0 0-4 4v1a3 3 0 0 0 1 2.3V19a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-8.7a3 3 0 0 0 1-2.3V7a4 4 0 0 0-4-4z"
                    />
                    <path {...glyphStroke} d="M9 10h6M9 13h4" opacity="0.6" />
                </svg>
            );
        case 'baby':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <circle cx="12" cy="9" r="3.5" {...glyphStroke} />
                    <path {...glyphStroke} d="M7 20v-3c0-2 2-3.5 5-3.5s5 1.5 5 3.5v3" />
                </svg>
            );
        case 'gyn':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <circle cx="12" cy="8" r="3" {...glyphStroke} />
                    <path {...glyphStroke} d="M12 11v3M9 17h6" />
                </svg>
            );
        case 'skin':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <path
                        {...glyphStroke}
                        d="M4 8c3 0 3-2 6-2s3 2 6 2 3-2 6-2M4 8c0 4 2.5 6 4 8M20 8c0 4-2.5 6-4 8"
                    />
                    <path {...glyphStroke} d="M4 12c2.5 1.5 5 1.5 8 0 3 1.5 5.5 1.5 8 0" opacity="0.65" />
                </svg>
            );
        case 'leaf':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <path
                        {...glyphStroke}
                        d="M12 21c4-3 7-7 7-12A7 7 0 0 0 6 9c0 5 3 9 6 12z"
                    />
                    <path {...glyphStroke} d="M12 21V10" />
                </svg>
            );
        case 'scan':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <rect x="5" y="4" width="14" height="16" rx="2" {...glyphStroke} />
                    <path {...glyphStroke} d="M8 8h8M8 12h8M8 16h5" opacity="0.65" />
                </svg>
            );
        case 'emergency':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <circle cx="12" cy="12" r="8" {...glyphStroke} />
                    <path {...glyphStroke} d="M12 8.5v7M8.5 12h7" />
                </svg>
            );
        case 'pulse':
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <path {...glyphStroke} d="M3 12h4l2-7 4 14 3-7h5" />
                </svg>
            );
        case 'stethoscope':
        default:
            return (
                <svg {...decorProps} viewBox="0 0 24 24" className={className}>
                    <path
                        {...glyphStroke}
                        d="M6 4v6a6 6 0 0 0 12 0V4M6 10c0 4 2.5 6 6 6m4-14v2m-8-2v2M16 18a2 2 0 1 1-4 0"
                    />
                </svg>
            );
    }
}
