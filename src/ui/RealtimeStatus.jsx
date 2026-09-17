import { useEffect, useState } from 'react';
import { Radio, WifiOff } from 'lucide-react';

const labels = {
  SUBSCRIBED: 'Tempo real ativo',
  CHANNEL_ERROR: 'Tempo real degradado',
  TIMED_OUT: 'Tempo real atrasado',
  CLOSED: 'Tempo real desligado',
  DISCONNECTED: 'Tempo real desligado',
};

export default function RealtimeStatus() {
  const [status, setStatus] = useState('DISCONNECTED');

  useEffect(() => {
    const handler = (event) => setStatus(event.detail?.status || 'DISCONNECTED');
    window.addEventListener('teconnect:realtime-status', handler);
    return () => window.removeEventListener('teconnect:realtime-status', handler);
  }, []);

  const healthy = status === 'SUBSCRIBED';
  return (
    <div className={`tc-realtime-status ${healthy ? 'healthy' : 'degraded'}`} title={labels[status] || status}>
      {healthy ? <Radio size={12} /> : <WifiOff size={12} />}
      <span>{labels[status] || status}</span>
    </div>
  );
}
