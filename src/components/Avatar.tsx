import type { AvatarSpec } from '../case/types';

/** Locally generated illustrated portrait. Decorative details only; the name is the text alternative. */
export function Avatar({ spec, name, size = 64 }: { spec: AvatarSpec; name: string; size?: number }) {
  const { skin, hair, hairStyle, shirt, accent } = spec;
  const shade = 'rgba(0,0,0,0.12)';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`Portrait of ${name}`}>
      <circle cx="60" cy="60" r="60" fill="#f4ead3" />
      {/* back hair */}
      {hairStyle === 'long' && <path d="M30 58 Q28 30 60 24 Q92 30 90 58 L94 104 Q60 112 26 104 Z" fill={hair} />}
      {hairStyle === 'curly' && (
        <g fill={hair}>
          {[[34, 44], [44, 30], [60, 25], [76, 30], [86, 44], [90, 60], [30, 60], [88, 76], [32, 76]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="13" />)}
        </g>
      )}
      {hairStyle === 'waves' && <path d="M32 60 Q30 30 60 26 Q90 30 88 60 Q92 78 84 86 L36 86 Q28 78 32 60 Z" fill={hair} />}
      {/* body */}
      <path d="M18 120 Q22 88 60 84 Q98 88 102 120 Z" fill={shirt} />
      <path d="M48 86 L60 100 L72 86" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      {spec.lanyard && <path d="M46 88 Q60 112 74 88" fill="none" stroke="#d9a441" strokeWidth="3" />}
      {/* neck + head */}
      <rect x="51" y="70" width="18" height="18" rx="6" fill={skin} />
      <rect x="51" y="78" width="18" height="6" fill={shade} />
      <ellipse cx="60" cy="56" rx="22" ry="25" fill={skin} />
      <ellipse cx="38" cy="58" rx="4" ry="6" fill={skin} />
      <ellipse cx="82" cy="58" rx="4" ry="6" fill={skin} />
      {spec.earrings && (
        <g fill="#d9a441">
          <circle cx="38" cy="66" r="2.6" />
          <circle cx="82" cy="66" r="2.6" />
        </g>
      )}
      {/* front hair */}
      {hairStyle === 'short' && <path d="M37 52 Q36 28 60 28 Q86 28 83 52 Q78 40 64 40 Q50 44 37 52 Z" fill={hair} />}
      {hairStyle === 'crop' && <path d="M39 48 Q40 30 60 30 Q80 30 81 48 Q72 38 60 38 Q48 38 39 48 Z" fill={hair} />}
      {hairStyle === 'bun' && (
        <g fill={hair}>
          <circle cx="60" cy="24" r="10" />
          <path d="M37 54 Q36 30 60 30 Q84 30 83 54 Q76 40 60 40 Q44 40 37 54 Z" />
        </g>
      )}
      {hairStyle === 'long' && <path d="M37 56 Q38 32 60 32 Q82 32 83 56 Q74 42 60 42 Q50 42 37 56 Z" fill={hair} />}
      {hairStyle === 'curly' && <path d="M38 50 Q44 34 60 34 Q76 34 82 50 Q72 42 60 42 Q48 42 38 50 Z" fill={hair} />}
      {hairStyle === 'waves' && <path d="M37 54 Q40 32 60 32 Q80 32 83 54 Q74 40 62 42 Q50 38 37 54 Z" fill={hair} />}
      {/* face */}
      <ellipse cx="51" cy="58" rx="2.6" ry="3" fill="#22180f" />
      <ellipse cx="69" cy="58" rx="2.6" ry="3" fill="#22180f" />
      <path d="M46 51 Q51 48 56 51" stroke={hair === '#9a9a9a' ? '#6d6d6d' : hair} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M64 51 Q69 48 74 51" stroke={hair === '#9a9a9a' ? '#6d6d6d' : hair} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M58 60 Q60 66 62 64" stroke={shade} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M52 70 Q60 75 68 70" stroke="#7a3b2e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="46" cy="66" r="3.5" fill="#e07a5f" opacity="0.25" />
      <circle cx="74" cy="66" r="3.5" fill="#e07a5f" opacity="0.25" />
      {spec.beard && <path d="M40 64 Q42 84 60 86 Q78 84 80 64 Q76 76 60 77 Q44 76 40 64 Z" fill={hair} opacity="0.9" />}
      {spec.beard && <path d="M52 71 Q60 74 68 71" stroke="#f4ead3" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />}
      {spec.glasses && (
        <g fill="none" stroke="#2b2b2b" strokeWidth="2">
          <rect x="42" y="52" width="15" height="12" rx="4" />
          <rect x="63" y="52" width="15" height="12" rx="4" />
          <path d="M57 57 L63 57" />
        </g>
      )}
    </svg>
  );
}
