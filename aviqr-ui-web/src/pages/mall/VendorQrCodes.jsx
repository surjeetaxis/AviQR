import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { VendorProvider, useVendor } from '../../context/VendorContext.jsx';
import QRCodes from '../QRCodes.jsx';

// Standalone (no owner Sidebar) reuse of the shop-owner QR designer for a mall
// vendor — deliberately not the full DashboardLayout/Sidebar treatment hotel
// outlets get, since vendors don't have the rest of that route set registered
// here (mall already has its own vendor-management UI; this page is QR-only).
function VendorQrCodesInner() {
  const navigate = useNavigate();
  const { loading, error, shopId } = useVendor();

  return (
    <main className="layout-content">
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={() => navigate(-1)} aria-label="Back"
          style={{ background:'#F9FAFB', border:'1px solid #F0F0F0', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize:18, fontWeight:800, margin:0 }}>Vendor QR Codes</h1>
      </div>
      {loading ? (
        <p style={{ fontSize:13, color:'#9CA3AF' }}>Loading…</p>
      ) : error || !shopId ? (
        <p style={{ fontSize:13, color:'#DC2626' }}>Could not load this vendor.</p>
      ) : (
        <QRCodes />
      )}
    </main>
  );
}

export default function VendorQrCodes() {
  const { vendorId } = useParams();
  return (
    <VendorProvider vendorId={vendorId}>
      <VendorQrCodesInner />
    </VendorProvider>
  );
}
