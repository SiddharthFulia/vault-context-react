import '@testing-library/jest-dom';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { __resetBridgeForTests } from '../src/bridge';

afterEach(() => {
  cleanup();
  __resetBridgeForTests();
});

beforeEach(() => {
  window.localStorage.clear();
});
