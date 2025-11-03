import React from 'react';

export type PaperAppProps = {
  topic: string;
  title?: string;
  authors?: string[];
  year?: string;
  venue?: string;
  summary?: string;
};

export const PaperApp = ({ topic, title, authors, year, venue, summary }: PaperAppProps) => {
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
        <div style={{ fontSize: 48, fontWeight: 700, color: '#333', marginBottom: 16 }}>{topic}</div>
        {title && <div style={{ fontSize: 36, fontWeight: 500, color: '#444', marginBottom: 8 }}>{title}</div>}
        {authors && authors.length > 0 && (
          <div style={{ fontSize: 28, color: '#666', fontStyle: 'italic', marginBottom: 8 }}>{authors.join(', ')}</div>
        )}
        {(year || venue) && (
          <div style={{ fontSize: 24, color: '#888', marginBottom: 16 }}>{[year, venue].filter(Boolean).join(' • ')}</div>
        )}
        {summary && <div style={{ fontSize: 28, color: '#444', lineHeight: 1.5 }}>{summary}</div>}
      </div>
    </div>
  );
};
