import { useAuth } from '../context/AuthContext.jsx';
import { useOutlet } from '../context/OutletContext.jsx';

// Resolves the shopId a reused shop-owner page should operate on: the
// currently-managed hotel outlet's linked shop if inside an OutletProvider,
// otherwise the logged-in shop owner's own shopId (unchanged behavior).
export function useActiveShopId() {
  const { user } = useAuth();
  const outletCtx = useOutlet();
  return outletCtx?.outlet?.shopId || user?.shopId;
}
