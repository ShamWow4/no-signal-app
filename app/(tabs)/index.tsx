import React from 'react';
import Head from 'expo-router/head';
import CalendarScreen from '../../src/screens/CalendarScreen';

export default function CalendarTab() {
  return (
    <>
      <Head>
        <title>Nola Visual Arts | Professional AV Services</title>
        <meta name="description" content="Nola Visual Arts provides professional audiovisual services, event production, and technical support in New Orleans." />
      </Head>
      <CalendarScreen />
    </>
  );
}
