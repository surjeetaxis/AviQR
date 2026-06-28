/**
 * OfflineBadge.test.js — shown when backend is unreachable
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';

describe('OfflineBadge', () => {
  it('renders the provided message', () => {
    const { getByText } = render(<OfflineBadge message="Backend offline — showing demo data" />);
    expect(getByText(/offline/i)).toBeTruthy();
  });
});
