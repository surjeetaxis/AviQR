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
    // StatusBadge intentionally shows a friendly label, not the raw enum
    // (e.g. COMPLETED -> "Done") — assert against that mapping, not the enum itself.
    const LABELS = { NEW: 'New', ACCEPTED: 'Accepted', PREPARING: 'Preparing', READY: 'Ready', COMPLETED: 'Done', CANCELLED: 'Cancelled' };
    Object.entries(LABELS).forEach(([status, label]) => {
      const { getByText } = render(<StatusBadge status={status} />);
      expect(getByText(label)).toBeTruthy();
    });
  });
});
