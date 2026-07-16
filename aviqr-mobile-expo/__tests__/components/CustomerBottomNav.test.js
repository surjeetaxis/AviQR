/**
 * CustomerBottomNav.test.js — floating pill nav (mobile port of the web
 * customer portal's CustomerPortalShell nav)
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CustomerBottomNav, NAV_TABS } from '../../src/components/common/CustomerBottomNav.js';

describe('CustomerBottomNav', () => {
  it('renders all 5 tabs', () => {
    const { getByLabelText } = render(
      <CustomerBottomNav activeTab="home" onChangeTab={() => {}} />
    );
    NAV_TABS.forEach(tab => {
      expect(getByLabelText(tab.label)).toBeTruthy();
    });
  });

  it('calls onChangeTab with the pressed tab key', () => {
    const onChangeTab = jest.fn();
    const { getByLabelText } = render(
      <CustomerBottomNav activeTab="home" onChangeTab={onChangeTab} />
    );
    fireEvent.press(getByLabelText('Orders'));
    expect(onChangeTab).toHaveBeenCalledWith('orders');
  });

  it('shows the cart badge count when items are in the cart', () => {
    const { getByText } = render(
      <CustomerBottomNav activeTab="home" onChangeTab={() => {}} cartCount={3} />
    );
    expect(getByText('3')).toBeTruthy();
  });

  it('hides the cart badge when the cart is empty', () => {
    const { queryByText } = render(
      <CustomerBottomNav activeTab="home" onChangeTab={() => {}} cartCount={0} />
    );
    expect(queryByText('0')).toBeNull();
  });
});
