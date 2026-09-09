export function exportBoardToWord(boardTitle, columns, cards) {
  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${boardTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #1e293b; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
        .column { margin-top: 24px; }
        .column-title { font-size: 18px; color: #1e3a8a; background-color: #f1f5f9; padding: 8px 12px; border-radius: 6px; }
        .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; background-color: #ffffff; }
        .card-title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 6px; }
        .card-description { font-size: 14px; color: #334155; line-height: 1.5; }
        .attachment-container { margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .attachment-title { font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
        .attachment-link { font-size: 13px; color: #2563eb; text-decoration: underline; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>📋 ${boardTitle}</h1>
  `;

  columns.forEach((col) => {
    const colCards = cards.filter((c) => String(c.column_id) === String(col.id));

    htmlContent += `
      <div class="column">
        <h2 class="column-title">${col.name} (${colCards.length})</h2>
    `;

    if (colCards.length === 0) {
      htmlContent += `<p style="font-style: italic; color: #94a3b8;">Nessuna scheda in questa colonna.</p>`;
    } else {
      colCards.forEach((card) => {
        const desc = card.description || card.details || '';

        htmlContent += `
          <div class="card">
            <div class="card-title">${card.title}</div>
            ${desc ? `<div class="card-description">${desc}</div>` : ''}
        `;

        // GENERAZIONE LINK IPERTESTUALI DIRETTI AGLI ALLEGATI
        if (card.attachments && card.attachments.length > 0) {
          htmlContent += `
            <div class="attachment-container">
              <div class="attachment-title">📎 Allegati:</div>
              <ul>
          `;

          card.attachments.forEach((att) => {
            htmlContent += `
              <li style="margin-bottom: 4px;">
                <a href="${att.file_url}" target="_blank" class="attachment-link">
                  📄 ${att.file_name}
                </a>
              </li>
            `;
          });

          htmlContent += `
              </ul>
            </div>
          `;
        }

        htmlContent += `</div>`;
      });
    }

    htmlContent += `</div>`;
  });

  htmlContent += `
    </body>
    </html>
  `;

  // Conversione in file .doc scaricabile
  const blob = new Blob(['\ufeff' + htmlContent], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${boardTitle.replace(/[^a-zA-Z0-9]/g, '_')}_DoceoKanban.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}