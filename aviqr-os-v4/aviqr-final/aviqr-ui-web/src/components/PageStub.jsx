import { Construction } from 'lucide-react';
import './PageStub.css';

export default function PageStub({ icon: Icon, title, description }) {
  return (
    <div className="page-stub">
      <div className="page-stub-icon">
        <Icon size={28} />
      </div>
      <h1 className="page-stub-title">{title}</h1>
      <p className="page-stub-desc">{description}</p>
      <div className="page-stub-badge">
        <Construction size={13} aria-hidden="true" />
        Coming soon — design ready, implementation in progress
      </div>
    </div>
  );
}
