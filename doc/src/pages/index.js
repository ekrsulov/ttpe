import React from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function Home() {
  const docsUrl = useBaseUrl('/docs/');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        Vectornest Documentation
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '600px' }}>
        Welcome to the comprehensive technical documentation for 
        a modern, extensible web-based vector graphics editor.
      </p>
      <Link
        to={docsUrl}
        style={{
          padding: '1rem 2rem',
          backgroundColor: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px',
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}
      >
        View Documentation →
      </Link>
    </div>
  );
}
