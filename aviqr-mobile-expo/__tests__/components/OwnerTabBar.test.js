/**
 * OwnerTabBar.test.js — floating pill nav wired to React Navigation's
 * custom tabBar contract (state/descriptors/navigation)
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OwnerTabBar } from '../../src/components/common/OwnerTabBar.js';

function makeProps(activeIndex = 0) {
  const routes = ['dashboard', 'orders', 'menu', 'reports', 'settings'].map(name => ({ key: name, name }));
  const descriptors = {};
  routes.forEach(r => { descriptors[r.key] = { options: { title: r.name } }; });
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  return {
    state: { routes, index: activeIndex },
    descriptors,
    navigation: { navigate, emit },
  };
}

describe('OwnerTabBar', () => {
  it('renders all 5 tabs', () => {
    const props = makeProps();
    const { getByLabelText } = render(<OwnerTabBar {...props} />);
    ['dashboard', 'orders', 'menu', 'reports', 'settings'].forEach(name => {
      expect(getByLabelText(name)).toBeTruthy();
    });
  });

  it('navigates to the pressed tab', () => {
    const props = makeProps(0);
    const { getByLabelText } = render(<OwnerTabBar {...props} />);
    fireEvent.press(getByLabelText('reports'));
    expect(props.navigation.navigate).toHaveBeenCalledWith('reports');
  });

  it('shows the new-order badge on the inactive Orders tab', () => {
    const props = makeProps(0);
    const { getByText } = render(<OwnerTabBar {...props} newOrderCount={4} />);
    expect(getByText('4')).toBeTruthy();
  });
});
