import { Bell, ExternalLink } from 'lucide-react';
import { OFFICIAL_BUS_APP, OFFICIAL_BUS_APP_IOS, UKM_TRANSPORT_INFO } from '../data/shuttleData';

export default function AlertsPage() {
  return (
    <section className="empty">
      <div className="empty-icon"><Bell size={26} /></div>
      <b>Check live service in MyUKM Smart Bus</b>
      <p>QuickUKM displays published route information. For the assigned vehicle, live position and arrival estimates, check UKM’s bus tracker.</p>
      <div className="tracker-links">
        <a className="source-link" href={OFFICIAL_BUS_APP_IOS} target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> App Store
        </a>
        <a className="source-link" href={OFFICIAL_BUS_APP} target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Google Play
        </a>
      </div>
      <p><a href={UKM_TRANSPORT_INFO} target="_blank" rel="noreferrer">UKM transport information</a></p>
    </section>
  );
}
