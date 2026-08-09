import React from 'react';
import { Redirect } from 'expo-router';
import Head from 'expo-router/head';

export default function AboutRoute() {
  return (
    <>
      <Head>
        <title>About Nola Visual Arts</title>
        <meta name="description" content="Learn about Nola Visual Arts, our mission, and our team of AV professionals in New Orleans." />
      </Head>
      <Redirect href="/(tabs)" />
    </>
  );
}
