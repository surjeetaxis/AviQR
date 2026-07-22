/**
 * Button.test.js — the shared Button component
 * Renders, fires onPress, respects disabled/loading, applies variants.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/common/Button.js';

describe('Button', () => {
  it('renders its title', () => {
    const { getByText } = render(<Button title="Place Order" />);
    expect(getByText('Place Order')).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Tap me" onPress={onPress} />);
    fireEvent.press(getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Nope" onPress={onPress} disabled />);
    fireEvent.press(getByText('Nope'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner (not title) while loading', () => {
    const { queryByText } = render(<Button title="Saving" loading />);
    expect(queryByText('Saving')).toBeNull();
  });

  it('disables the underlying touchable while loading', () => {
    // Firing a raw press event directly on the TouchableOpacity instance (via
    // UNSAFE_root) bypasses RN's normal disabled-blocks-press handling in the
    // test renderer — assert the prop that actually governs the behavior instead.
    const { UNSAFE_root } = render(<Button title="Busy" onPress={jest.fn()} loading />);
    const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
    expect(touchable.props.disabled).toBe(true);
  });
});
