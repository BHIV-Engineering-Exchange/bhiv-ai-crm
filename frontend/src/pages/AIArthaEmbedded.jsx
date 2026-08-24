import React, { useEffect, useRef } from 'react';
import { ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import Button from '../components/common/ui/Button';
import Badge from '../components/common/ui/Badge';
import { useAuth } from '@/context/MongoAuthContext';

const AI_ARTHA_DASHBOARD_URL = import.meta.env.VITE_ARTHA_URL || 'https://artha.blackholeinfiverse.com/';

export const AIArthaEmbedded = () => {
  const { user, token } = useAuth();
  const iframeRef = useRef(null);

  const currentToken = token || localStorage.getItem('token') || '';
  const authQuery = currentToken
    ? `?embeddedToken=${encodeURIComponent(currentToken)}&tenant=tenant_bright_connection&embedded=true`
    : '?embedded=true';
  const iframeSrc = `${AI_ARTHA_DASHBOARD_URL}${authQuery}`;

  const handleOpenInNewTab = () => {
    const targetUrl = currentToken
      ? `${AI_ARTHA_DASHBOARD_URL}?embeddedToken=${encodeURIComponent(currentToken)}&tenant=tenant_bright_connection`
      : AI_ARTHA_DASHBOARD_URL;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleReloadFrame = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeSrc;
    }
  };

  // PostMessage bridge: Send auth token to embedded Artha iframe on load
  useEffect(() => {
    const handleIframeLoad = () => {
      if (iframeRef.current && iframeRef.current.contentWindow && currentToken) {
        try {
          iframeRef.current.contentWindow.postMessage(
            {
              type: 'SETU_AUTH_SYNC',
              token: currentToken,
              user: user ? { email: user.email, name: user.name, role: user.role } : null,
              tenantId: 'tenant_bright_connection'
            },
            '*'
          );
        } catch (e) {
          console.warn('PostMessage to Artha iframe failed:', e);
        }
      }
    };

    const frameEl = iframeRef.current;
    if (frameEl) {
      frameEl.addEventListener('load', handleIframeLoad);
    }
    return () => {
      if (frameEl) {
        frameEl.removeEventListener('load', handleIframeLoad);
      }
    };
  }, [currentToken, user, iframeSrc]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-heading font-bold tracking-tight">AI Artha Dashboard</h1>
            <Badge variant="outline" className="flex items-center gap-1 border-primary/40 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Financial AI Engine
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Real-time dealer credit ledgers, financial summaries, and Tally insights
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReloadFrame}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Direct Tab
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/30 p-2 shadow-lg">
        <iframe
          ref={iframeRef}
          id="ai-artha-dashboard-frame"
          title="AI Artha Financial Dashboard"
          src={iframeSrc}
          className="w-full h-[calc(100vh-13rem)] min-h-[640px] rounded-lg bg-background border-0"
          loading="lazy"
          allow="fullscreen; clipboard-write; storage-access"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
};

export default AIArthaEmbedded;
