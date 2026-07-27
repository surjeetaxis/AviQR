import { View } from 'react-native';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { PermissionMatrixView } from '../../src/components/common/PermissionMatrixView.js';
import { Colors } from '../../src/theme/index.js';

export default function AdminPermissionsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Permissions" />
      <PermissionMatrixView />
    </View>
  );
}
