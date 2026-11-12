/** Original architecture sketch, drawn for this interface. Decorative teaching motif. */
export default function SystemIllustration() {
  return <svg className="fde-illustration" viewBox="0 0 360 244" fill="none" aria-hidden="true" focusable="false">
    <defs><pattern id="coach-dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#cdd6dc"/></pattern></defs>
    <rect x="12" y="4" width="336" height="236" rx="24" fill="url(#coach-dots)"/>
    <path d="M70 64h74M216 64h70v63M180 91v61M70 178h74M216 178h70v-27" stroke="#8b9bad" strokeWidth="1.5" strokeDasharray="4 5"/>
    <path d="m137 60 7 4-7 4m39 77 4 7 4-7m94-25 8 7 7-7" stroke="#8b9bad" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="26" y="37" width="90" height="54" rx="12" fill="#fff" stroke="#cad8e4"/><rect x="34" y="45" width="26" height="26" rx="7" fill="#e9f2f8"/>
    <path d="M41 52h12v10H41zm3 10v3m6-3v3" stroke="#527b9c" strokeWidth="1.4"/>
    <text x="70" y="58" fill="#24394d" fontSize="10" fontFamily="Inter, sans-serif">Customer</text><text x="70" y="73" fill="#6a7c8b" fontSize="9" fontFamily="Inter, sans-serif">a real goal</text>
    <rect x="142" y="29" width="78" height="70" rx="15" fill="#fff5ed" stroke="#edb38f"/>
    <path d="M170 49h21v17h-21zm-5 8h5m21 0h5m-16-13v5m0 17v5" stroke="#b34d20" strokeWidth="1.5" strokeLinecap="round"/>
    <text x="181" y="86" fill="#9e431d" textAnchor="middle" fontSize="10" fontFamily="Inter, sans-serif">Your system</text>
    <rect x="248" y="123" width="83" height="57" rx="12" fill="#edf4ef" stroke="#bdd1c2"/>
    <path d="m279 143 6 6 11-12" stroke="#5a8065" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="289" y="166" fill="#446650" textAnchor="middle" fontSize="10" fontFamily="Inter, sans-serif">Evidence</text>
    <rect x="139" y="153" width="84" height="51" rx="12" fill="#fff" stroke="#cad8e4"/>
    <path d="M169 167h22m-22 5h16" stroke="#6f879b" strokeWidth="1.5" strokeLinecap="round"/>
    <text x="181" y="190" fill="#445d72" textAnchor="middle" fontSize="10" fontFamily="Inter, sans-serif">Tools + data</text>
    <rect x="31" y="151" width="80" height="52" rx="12" fill="#fff" stroke="#cad8e4"/>
    <circle cx="59" cy="170" r="5" stroke="#6f879b" strokeWidth="1.5"/><path d="M50 184c0-8 18-8 18 0m9-15h8m-8 5h5" stroke="#6f879b" strokeWidth="1.5" strokeLinecap="round"/>
    <text x="71" y="224" fill="#718394" textAnchor="middle" fontSize="9" fontFamily="IBM Plex Mono, monospace">human judgment</text>
    <circle cx="286" cy="64" r="4" fill="#c9602d"/>
  </svg>;
}
