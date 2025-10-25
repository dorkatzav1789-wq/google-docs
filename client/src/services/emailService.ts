// שירות לשליחת מיילים
import emailjs from '@emailjs/browser';

// הגדרות EmailJS
const SERVICE_ID = 'service_eizn22h';
const TEMPLATE_ID = 'template_3z5ixmc';
const PUBLIC_KEY = 'cpfhJPUi5_WQtx3km';

export interface EmailData {
  to: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

export const emailService = {
  async sendEmail(to: string[], subject: string, body: string): Promise<void> {
    try {
      await Promise.all(
          to.map((addr) =>
              emailjs.send(
                  SERVICE_ID,
                  TEMPLATE_ID,
                  {
                    title: subject,              // {{title}} בתבנית (Subject)
                    name: 'מערכת התזכורות',     // {{name}} (From Name)
                    message: body,               // {{message}} (תוכן)
                    email: addr,                 // {{email}}  (Reply-To)
                    to_email: addr               // {{to_email}} (הנמען בפועל)
                  },
                  PUBLIC_KEY
              )
          )
      );

      console.log('מיילים נשלחו בהצלחה!', { to, subject });
    } catch (error) {
      console.error('שגיאה בשליחת מיילים:', error, { to, subject, body });
      throw error;
    }
  },


  // יצירת תוכן מייל לתזכורת
  createReminderEmail: (eventName: string, eventDate: string, specialNotes?: string, customMessage?: string): EmailData => {
    const eventDateFormatted = new Date(eventDate).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let body = `שלום,\n\n`;
    body += `זוהי תזכורת שהאירוע "${eventName}" מתקיים ב-${eventDateFormatted}.\n\n`;
    
    if (customMessage) {
      body += `הודעה מותאמת: ${customMessage}\n\n`;
    } else if (specialNotes) {
      body += `הערות מיוחדות: ${specialNotes}\n\n`;
    }
    
    body += `בברכה,\nמערכת התזכורות`;

    return {
      to: [], // יועבר מהתזכורת
      subject: `תזכורת: ${eventName} - ${eventDateFormatted}`,
      body,
      isHtml: false
    };
  },

  // שליחת תזכורת למייל
  sendReminderEmail: async (emailAddresses: string[], subject: string, message: string): Promise<boolean> => {
    const emailData: EmailData = {
      to: emailAddresses,
      subject: subject,
      body: message,
      isHtml: false
    };
    
    emailData.to = emailAddresses;
    
    try {
      await emailService.sendEmail(emailAddresses, emailData.subject, emailData.body);
      console.log('תזכורת נשלחה בהצלחה למיילים:', emailAddresses.join(', '));
      return true;
    } catch (error) {
      console.error('שגיאה בשליחת תזכורת למייל:', error);
      return false;
    }
  }
};

export default emailService;
