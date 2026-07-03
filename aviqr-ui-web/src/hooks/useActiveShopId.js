import { useAuth } from '../context/AuthContext.jsx';
import { useOutlet } from '../context/OutletContext.jsx';
import { useVendor } from '../context/VendorContext.jsx';

// Resolves the shopId a reused shop-owner page should operate on: the
// currently-managed hotel outlet's linked shop if inside an OutletProvider,
// the currently-managed mall vendor's linked shop if inside a VendorProvider,
// otherwise the logged-in shop owner's own shopId (unchanged behavior).
export function useActiveShopId() {
  const { user } = useAuth();
  const outletCtx = useOutlet();
  const vendorCtx = useVendor();
  return outletCtx?.outlet?.shopId || vendorCtx?.shopId || user?.shopId;
}
