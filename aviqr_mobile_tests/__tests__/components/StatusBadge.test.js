/**
 * StatusBadge.test.js — order/shop status pill rendering
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';

describe('StatusBadge', () => {
  it('renders the status label', () => {
    const { getByText } = render(<StatusBadge status="NEW" />);
    expect(getByText(/NEW/i)).toBeTruthy();
  });

  it('renders different statuses without crashing', () => {
    ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].forEach((s) => {
      const { getByText } = render(<StatusBadge status={s} />);
      expect(getByText(new RegExp(s, 'i'))).toBeTruthy();
    });
  });
});
