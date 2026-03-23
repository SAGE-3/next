import React from 'react';

export type PaperAppProps = {
  topic: string;
  title?: string;
  authors?: string[];
  year?: string;
  venue?: string;
  summary?: string;
  abstract?: string;
  tldr?: string;
  citations?: number;
  url?: string;
  pdf_url?: string | null;
  source?: string;
};

export const PaperApp = ({
  topic,
  title,
  authors,
  year,
  venue,
  summary,
  abstract,
  tldr,
  citations,
  url,
  pdf_url,
  source,
}: PaperAppProps) => {
  const bodyText = abstract || tldr || summary;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <div
        style={{
          aspectRatio: '8.5/11',
          width: '100%',
          maxWidth: 850,
          maxHeight: 1100,
          background: 'white',
          borderRadius: 24,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          overflow: 'auto',
        }}
      >
        {/* 1. Title */}
        <div style={{ fontSize: 48, fontWeight: 700, color: '#333', marginBottom: 16 }}>{title || topic}</div>

        {/* 2. Year and Authors */}
        {(year || (authors && authors.length > 0)) && (
          <div style={{ fontSize: 28, color: '#666', fontStyle: 'italic', marginBottom: 8 }}>
            {[year, authors?.length ? authors.join(', ') : ''].filter(Boolean).join(' • ')}
          </div>
        )}

        {/* 3. Venue */}
        {venue && <div style={{ fontSize: 24, color: '#888', marginBottom: 16 }}>{venue}</div>}

        {/* 4. Abstract / TLDR */}
        {bodyText && <div style={{ fontSize: 28, color: '#444', lineHeight: 1.5 }}>{bodyText}</div>}

        {/* 5. Citations and Source */}
        {((citations != null && citations > 0) || source) && (
          <div style={{ fontSize: 22, color: '#666' }}>
            {[citations != null && citations > 0 ? `Citations: ${citations}` : '', source ? `Source: ${source}` : ''].filter(Boolean).join(' • ')}
          </div>
        )}

        {/* 6. URL and PDF URL */}
        {(url || pdf_url) && (
          <div style={{ fontSize: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', wordBreak: 'break-all' }}>
                Open paper
              </a>
            )}
            {pdf_url && (
              <a href={pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', wordBreak: 'break-all' }}>
                PDF
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
