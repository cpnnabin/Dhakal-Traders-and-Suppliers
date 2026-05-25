import { useState } from 'react';

type CopyableContactProps = {
  href: string;
  value: string;
  displayValue?: string;
  label: string;
  className?: string;
  copyText?: string;
  copiedText?: string;
};

const CopyableContact = ({
  href,
  value,
  displayValue,
  label,
  className = '',
  copyText = 'Copy',
  copiedText = 'Copied',
}: CopyableContactProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className={`copy-contact ${className}${copied ? ' copied' : ''}`.trim()}
      onClick={handleCopy}
      aria-label={`${copyText} ${label}`}
      title={label}
    >
      <span className="copy-contact-icon" aria-hidden="true">{copied ? '✓' : '⧉'}</span>
      <span className="copy-contact-text">{displayValue ?? value}</span>
    </button>
  );
};

export default CopyableContact;