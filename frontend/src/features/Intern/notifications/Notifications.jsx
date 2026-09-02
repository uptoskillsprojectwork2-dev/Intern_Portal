import Icon from "../../shared/Icons/Icon.jsx";

const Notifications = () => {
  return (
    <section className="data-section notifications-section">
      {/* =========================================
          SECTION HEADER
      ========================================= */}
      <div className="section-header">
        <div>
          <p className="eyebrow">
            UPDATES
          </p>

          <h3>
            Notifications
          </h3>

          <p className="section-description">
            Stay updated with your certificate
            requests and internship activities.
          </p>
        </div>
      </div>

      {/* =========================================
          EMPTY NOTIFICATION STATE
      ========================================= */}
      <div className="empty-state">

        <div className="empty-state-icon">
          <Icon
            name="bell"
            size={21}
          />
        </div>

        <h3>
          You're all caught up
        </h3>

        <p>
          New updates will appear here.
        </p>

      </div>
    </section>
  );
};

export default Notifications;