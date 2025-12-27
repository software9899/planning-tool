import { type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  type?: 'info' | 'warning' | 'error' | 'success';
  showButtons?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  type = 'info',
  showButtons = true,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm
}: ModalProps) {
  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return { icon: '✅', color: '#10b981' };
      case 'warning':
        return { icon: '⚠️', color: '#f59e0b' };
      case 'error':
        return { icon: '❌', color: '#ef4444' };
      default:
        return { icon: 'ℹ️', color: '#667eea' };
    }
  };

  const { icon, color } = getIconAndColor();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'modalFadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '32px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: '#1f2937',
              flex: 1
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            color: '#4b5563',
            fontSize: '15px',
            lineHeight: '1.6',
            marginBottom: showButtons ? '24px' : '0'
          }}
        >
          {children}
        </div>

        {/* Buttons */}
        {showButtons && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            {onConfirm && (
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  border: '2px solid #e5e7eb',
                  background: 'white',
                  color: '#6b7280',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: color,
                color: 'white',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: `0 2px 8px ${color}40`,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${color}60`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 2px 8px ${color}40`;
              }}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
