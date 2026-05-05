declare const google: any;

const CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export const getAccessToken = (): Promise<string> => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return Promise.resolve(cachedToken);
  }

  return new Promise((resolve, reject) => {
    try {
      if (typeof google === 'undefined') {
        reject(new Error('Google Identity Services library not loaded. Please ensure you are online and refresh.'));
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.access_token) {
            cachedToken = response.access_token;
            // Access tokens typically expire in 3600 seconds. We'll be conservative and say 50 minutes.
            tokenExpiry = Date.now() + 50 * 60 * 1000;
            resolve(response.access_token);
          } else {
            reject(new Error('Failed to get access token: ' + (response.error || 'Unknown error')));
          }
        },
      });
      client.requestAccessToken();
    } catch (error) {
      reject(error);
    }
  });
};

interface EmailPayload {
  to: string;
  subject: string;
  body: string; // HTML supported
}

const createEmail = ({ to, subject, body }: EmailPayload): string => {
  const utf8Subject = `=?utf-8?B?${btoa(encodeURIComponent(subject).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))))}?=`;
  const messageParts = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    body,
  ];
  const message = messageParts.join('\r\n');

  // The Gmail API expects a base64url encoded string.
  return btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const sendGmailEmail = async (payload: EmailPayload): Promise<void> => {
  const token = await getAccessToken();
  const raw = createEmail(payload);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gmail API error: ${errorData.error?.message || response.statusText}`);
  }
};

export const formatBriefingEmail = (
  userEmail: string,
  major: string,
  tomorrowEvents: any[],
  pendingReviews: any[],
  drafts: number,
  unfinishedSprints: any[]
) => {
  const majorCourses = pendingReviews.filter(m => m.category === 'Major Course');
  const minorCourses = pendingReviews.filter(m => m.category === 'Minor Course');

  const header = `
    <div style="background-color: #000; color: #D4AF37; padding: 20px; text-align: center; font-family: sans-serif; border-bottom: 2px solid #D4AF37;">
      <h1 style="margin: 0; font-style: italic;">Opusequ</h1>
      <p style="margin: 5px 0 0; font-size: 10px; letter-spacing: 4px; font-weight: bold; text-transform: uppercase;">Balance your Hustle | ${major}</p>
    </div>
  `;

  let content = `<div style="padding: 20px; font-family: sans-serif; color: #333; line-height: 1.6;">`;
  content += `<p style="font-size: 16px;">Here is your daily production goal summary.</p>`;

  if (tomorrowEvents.length > 0) {
    content += `<h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 5px;">📅 Schedules & Deadlines (Next 24h)</h3><ul>`;
    tomorrowEvents.forEach(e => {
      content += `<li><strong>${e.title}</strong> - ${e.type || 'Event'}</li>`;
    });
    content += `</ul>`;
  }

  if (majorCourses.length > 0 || minorCourses.length > 0) {
    content += `<h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 5px;">📚 Pending Reviews</h3>`;
    
    if (majorCourses.length > 0) {
      content += `<p><strong>Major Courses:</strong></p><ul>`;
      majorCourses.forEach(m => content += `<li>${m.title}</li>`);
      content += `</ul>`;
    }

    if (minorCourses.length > 0) {
      content += `<p><strong>Minor Courses:</strong></p><ul>`;
      minorCourses.forEach(m => content += `<li>${m.title}</li>`);
      content += `</ul>`;
    }
  }

  if (drafts > 0 || unfinishedSprints.length > 0) {
    content += `<h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 5px;">⚡ Unfinished Sprints & Quizzes</h3>`;
    content += `<p>You have ${drafts + unfinishedSprints.length} incomplete sessions. Resume them to maintain your streak!</p>`;
    if (unfinishedSprints.length > 0) {
      content += `<ul>`;
      unfinishedSprints.forEach(s => content += `<li>${s.title || 'Untitled Quiz'} (In Progress)</li>`);
      content += `</ul>`;
    }
  }

  content += `<p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
    Keep pushing, student-worker! Quality Education (SDG 4) starts with your consistency.
  </p></div>`;

  return {
    subject: `[Opusequ Alert] Daily Study Goal & Reminders`,
    body: header + content
  };
};

export const formatDiagnosticEmail = (
  userEmail: string,
  major: string,
  moduleTitle: string,
  category: string,
  score: string
) => {
  const header = `
    <div style="background-color: #000; color: #D4AF37; padding: 20px; text-align: center; font-family: sans-serif; border-bottom: 2px solid #D4AF37;">
      <h1 style="margin: 0; font-style: italic;">Opusequ</h1>
      <p style="margin: 5px 0 0; font-size: 10px; letter-spacing: 4px; font-weight: bold; text-transform: uppercase;">Diagnostic Complete | ${major}</p>
    </div>
  `;

  const content = `
    <div style="padding: 20px; font-family: sans-serif; color: #333; line-height: 1.6;">
      <p style="font-size: 16px;">Your new study module <strong>"${moduleTitle}"</strong> has been synchronized.</p>
      
      <div style="background-color: #f9f9f9; border: 1px solid #D4AF37; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h2 style="margin-top: 0; color: #000; font-size: 18px;">📊 Initial Diagnostic Result</h2>
        <p style="font-size: 24px; font-weight: bold; color: #D4AF37; margin: 10px 0;">Raw Score: ${score}</p>
        <p style="font-size: 12px; color: #666;">This summary represents the knowledge density identified in your ${category} track.</p>
      </div>

      <p>A 25-question Micro-Quiz has been cached for this module. You can start your first 5-minute sprint now to verify these concepts.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
        Sustainable Development Goal 4: Quality Education through high-density knowledge extraction.
      </p>
    </div>
  `;

  return {
    subject: `[Opusequ] Diagnostic Sync: ${moduleTitle} (${score})`,
    body: header + content
  };
};
