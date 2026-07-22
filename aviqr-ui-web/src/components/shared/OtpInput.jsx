import { useEffect, useRef } from 'react';

// Segmented OTP entry: one box per digit, auto-advances on type, backspace
// steps back, and pasting a full code fills every box at once. Calls
// onComplete(code) the moment the last digit lands, so callers can
// auto-verify instead of waiting for a separate submit click.
export default function OtpInput({ length = 6, value, onChange, onComplete, disabled, autoFocus = true }) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (nextDigits) => {
    const joined = nextDigits.join('');
    onChange(joined);
    if (joined.length === length && !nextDigits.includes('')) onComplete?.(joined);
  };

  const handleChange = (idx, e) => {
    const raw = e.target.value.replace(/\D/g, '');

    if (raw.length > 1) {
      // Pasted (or autofilled) code — spread across boxes from this index on
      const next = digits.slice();
      raw.slice(0, length - idx).split('').forEach((c, i) => { next[idx + i] = c; });
      commit(next);
      inputsRef.current[Math.min(idx + raw.length, length - 1)]?.focus();
      return;
    }

    const next = digits.slice();
    next[idx] = raw;
    commit(next);
    if (raw && idx < length - 1) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = digits.slice();
      next[idx - 1] = '';
      commit(next);
      inputsRef.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="otp-box-row" role="group" aria-label="One-time password">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => (inputsRef.current[i] = el)}
          className={`otp-box${d ? ' filled' : ''}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length} // allows the whole pasted code to land in one box's onChange
          value={d}
          disabled={disabled}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
