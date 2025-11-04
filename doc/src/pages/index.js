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
      <img src="./img/logo.svg" alt="VectorNest Logo" style={{ width: '300px', marginBottom: '2rem' }} />
       <Link
        to={docsUrl}
        style={{
          padding: '1rem 2rem',
          backgroundColor: '#000000',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          marginBottom: '2rem'
        }}
      >
        View Documentation →
      </Link>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        <span className="vector-nest-title">VectorNest</span> Documentation
      </h1>
      <p style={{ fontSize: '1.2rem', maxWidth: '600px' }}>
        Welcome to the comprehensive technical documentation for 
        a modern, extensible web-based vector graphics editor.
      </p>
    </div>
  );
}
