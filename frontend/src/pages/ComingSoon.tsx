interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div style={{
      padding: '60px 30px',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{
        fontSize: '80px',
        marginBottom: '20px'
      }}>
        🚧
      </div>
      <h1 style={{
        fontSize: '32px',
        fontWeight: 700,
        color: '#1f2937',
        marginBottom: '12px'
      }}>
        {title}
      </h1>
      <p style={{
        fontSize: '16px',
        color: '#6b7280',
        marginBottom: '30px'
      }}>
        {description || 'This feature is currently under development and will be available soon.'}
      </p>
      <div style={{
        background: '#f0f9ff',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '40px'
      }}>
        <p style={{
          margin: 0,
          color: '#1e40af',
          fontWeight: 600
        }}>
          💡 In the meantime, you can use the Current Tasks, Backlog, Dashboard, and AI Agent features.
        </p>
      </div>
    </div>
  );
}
