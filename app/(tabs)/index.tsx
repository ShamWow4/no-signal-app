import React from 'react';
import Head from 'expo-router/head';
import CalendarScreen from '../../src/screens/CalendarScreen';

export default function CalendarTab() {
  return (
    <>
      <Head>
        <title>The Nola AV Newsletter</title>
        <meta name="description" content="A 501(c)(3) non-profit organization in New Orleans providing hands-on audiovisual workforce training, technical education, and industry career pathways." />
      </Head>
      <CalendarScreen />
    </>
  );
}
