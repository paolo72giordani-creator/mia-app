const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY || '';

export const sendEmailNotification = async (recipientEmail, boardTitle, roleName, senderEmail) => {
  if (!BREVO_API_KEY) {
    console.warn('API Key Brevo non configurata.');
    return;
  }

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { 
          name: `Doceo Kanban`, 
          email: "paolo72.giordani@gmail.com" 
        },
        replyTo: { email: senderEmail },
        to: [{ email: recipientEmail }],
        subject: `Invito a collaborare su Doceo Kanban: "${boardTitle}"`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #2563eb; margin-top:0;">Doceo Kanban</h2>
            <p>Ciao,</p>
            <p>L'utente <strong>${senderEmail}</strong> ti ha invitato a collaborare sulla bacheca <strong>"${boardTitle}"</strong> con il ruolo di <strong>${roleName}</strong>.</p>
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Accedi all'app con la tua email per iniziare!</p>
          </div>
        `
      })
    });
  } catch (err) {
    console.error('Errore invio notifica Brevo:', err);
  }
};