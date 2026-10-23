import { BellRing, Bus, Info, X } from 'lucide-react';
import { LINE_BY_ID } from '../data/mockData';

export default function AlertsPage({
  alertsOn,
  onToggleAlerts,
  notifications,
  onDismiss,
  onClearAll,
  onSimulate,
}) {
  return (
    <>
      <section className="card master">
        <span className="master-icon">
          <BellRing size={20} />
        </span>
        <div className="master-body">
          <h3>Arrival Alerts</h3>
          <p>{alertsOn ? 'Get notified when your bus is near' : 'Alerts are paused'}</p>
        </div>
        <button
          className={`switch ${alertsOn ? 'on' : ''}`}
          role="switch"
          aria-checked={alertsOn}
          aria-label="Toggle arrival alerts"
          onClick={() => onToggleAlerts(!alertsOn)}
        />
      </section>

      <div className="demo-note">
        <Info size={14} />
        <span>
          Demo mode — these notifications are simulated for the prototype. No real push notifications
          or GPS tracking are used.
        </span>
      </div>

      <button className="simulate-btn" disabled={!alertsOn} onClick={onSimulate}>
        <BellRing size={15} /> Simulate a notification
      </button>

      <div className="list-head">
        <h2 className="section-title">Recent alerts</h2>
        {notifications.length > 0 && (
          <button className="clear-btn" onClick={onClearAll}>
            Clear all
          </button>
        )}
      </div>

      <div className={alertsOn ? '' : 'muted-list'}>
        {notifications.length === 0 && (
          <div className="empty">
            <div className="empty-icon">
              <BellRing size={26} />
            </div>
            <b>All caught up</b>
            <p>No alerts right now.</p>
          </div>
        )}
        {notifications.map((n) => {
          const line = n.lineId ? LINE_BY_ID[n.lineId] : null;
          const isArrival = n.kind === 'arrival';
          return (
            <article className="card notif-card" key={n.id}>
              <span
                className="notif-icon"
                style={
                  line
                    ? { background: `${line.color}1A`, color: line.color }
                    : { background: '#FEF3E2', color: '#B45309' }
                }
              >
                {isArrival ? <Bus size={17} /> : <Info size={17} />}
              </span>
              <div className="notif-body">
                <h4>{n.title}</h4>
                <p>{n.body}</p>
                <div className="notif-time">{n.time}</div>
              </div>
              <button className="notif-x" aria-label="Dismiss" onClick={() => onDismiss(n.id)}>
                <X size={14} />
              </button>
            </article>
          );
        })}
      </div>

      {!alertsOn && (
        <div className="demo-note" style={{ background: '#FEF3E2', color: '#9A6700' }}>
          <BellRing size={14} />
          <span>Alerts are paused — flip the switch above to resume simulated notifications.</span>
        </div>
      )}
    </>
  );
}
