'use client';
import { useEffect } from 'react';

// Evaluates the unchanged browser entry once, in the browser, after hydration. No cleanup: the
// runtime, controller and graph belong to the entry module, never to React.
export default function Boot({ entry }: { entry: 'app' | 'harness' }) {
  useEffect(() => { void (entry === 'app' ? import('../src/main.ts') : import('../harness/main.ts')); }, [entry]);
  return null;
}
