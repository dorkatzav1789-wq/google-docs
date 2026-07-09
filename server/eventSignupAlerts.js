// server/eventSignupAlerts.js
// התראה לאדמינים על אירועי עבודה שמתקרבים (יומיים ויום לפני) ואין להם אף עובד רשום
"use strict";

const { dbFunctions } = require("./supabase-database");
const { sendPushNotification } = require("./firebasePush");

// כמה ימים לפני האירוע לבדוק
const DAYS_BEFORE_LIST = [2, 1];

// תאריך (YYYY-MM-DD) בעוד X ימים, לפי שעון ישראל
function dateStrInDays(days) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
}

function formatEventLine(event) {
  const date = new Date(`${event.event_date}T00:00:00`).toLocaleDateString("he-IL");
  const time = event.start_time ? ` בשעה ${String(event.start_time).slice(0, 5)}` : "";
  const type = event.event_type ? ` (${event.event_type})` : "";
  return `"${event.event_name}"${type} בתאריך ${date}${time}`;
}

/**
 * בודק אירועים בעוד יומיים ובעוד יום שאין להם נרשמים, ושולח push לאדמינים.
 * לא נשלחת אותה התראה פעמיים (נבדק מול notifications_log).
 * @returns {Promise<{ checked: number, alertsSent: number }>}
 */
async function checkUpcomingEventsWithoutSignups() {
  const adminEmails = await dbFunctions.getAdminEmails();
  if (adminEmails.length === 0) {
    console.warn("⚠️ אין אדמינים פעילים - לא נשלחות התראות על אירועים");
    return { checked: 0, alertsSent: 0 };
  }

  let checked = 0;
  let alertsSent = 0;

  for (const daysBefore of DAYS_BEFORE_LIST) {
    const targetDate = dateStrInDays(daysBefore);
    const events = await dbFunctions.getEventsWithoutSignups(targetDate);
    checked += events.length;

    for (const event of events) {
      const alreadySent = await dbFunctions.wasEventNotificationSent(event.id, daysBefore);
      if (alreadySent) continue;

      const when = daysBefore === 1 ? "מחר" : "בעוד יומיים";
      try {
        const result = await sendPushNotification({
          title: `⚠️ אין נרשמים לאירוע ${when}`,
          body: `לאירוע ${formatEventLine(event)} עדיין לא נרשם אף עובד`,
          userEmail: adminEmails,
          data: { type: "event_signup_alert", event_id: String(event.id) },
          source: "event_signup_alert",
          eventId: event.id,
          daysBefore,
        });
        alertsSent += 1;
        console.log(
          `🔔 נשלחה התראת אירוע ללא נרשמים (${when}): "${event.event_name}" - sent=${result.sent}, failed=${result.failed}`
        );
      } catch (e) {
        console.error(
          `❌ שליחת התראה על אירוע "${event.event_name}" נכשלה:`,
          e?.message || e
        );
      }
    }
  }

  return { checked, alertsSent };
}

// בדיקה כל שעה כשהשרת רץ באופן רציף (לוקאלי / Render)
function startEventSignupAlertsScheduler() {
  const HOUR = 60 * 60 * 1000;

  const run = () =>
    checkUpcomingEventsWithoutSignups().catch((e) =>
      console.error("❌ בדיקת אירועים ללא נרשמים נכשלה:", e?.message || e)
    );

  // ריצה ראשונה קצת אחרי העלייה, ואז כל שעה
  setTimeout(run, 15 * 1000);
  setInterval(run, HOUR);
}

module.exports = { checkUpcomingEventsWithoutSignups, startEventSignupAlertsScheduler };
