import { useEffect, useRef, useState } from 'react';
import type { VaultModalRenderProps } from './types';

export function VaultModal(props: VaultModalRenderProps) {
  const { open, title, description, submitLabel, blocking, onSubmit, onCancel } = props;
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      // wait one tick so the input is in the DOM before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !blocking) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, blocking, onCancel]);

  if (!open) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      data-testid="vault-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !blocking) onCancel();
      }}
    >
      <div
        style={{
          width: 'min(420px, 92vw)',
          background: '#0a0a0e',
          color: '#f4f4f6',
          borderRadius: 14,
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <h2
          id="vault-modal-title"
          style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          {title}
        </h2>
        {description && (
          <p style={{ margin: '8px 0 16px', fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
            {description}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            ref={inputRef}
            data-testid="vault-modal-input"
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="paste your token"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'inherit',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 16,
              justifyContent: 'flex-end',
            }}
          >
            {!blocking && (
              <button
                type="button"
                data-testid="vault-modal-cancel"
                onClick={onCancel}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'inherit',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              data-testid="vault-modal-submit"
              disabled={value.trim().length === 0}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: 'linear-gradient(90deg, #f59e0b, #f43f5e)',
                border: 'none',
                color: '#0a0a0e',
                fontSize: 13,
                fontWeight: 600,
                cursor: value.trim() ? 'pointer' : 'not-allowed',
                opacity: value.trim() ? 1 : 0.6,
              }}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
