// Funzione per generare e scaricare un file HTML/Word formattato
export const exportBoardToWord = (boardTitle, columns, cards) => {
  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${boardTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12pt; color: #1e293b; margin: 20px; }
        h1 { color: #1e3a8a; font-size: 20pt; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
        .column { margin-top: 24px; margin-bottom: 16px; page-break-inside: avoid; }
        .column-title { font-size: 14pt; font-weight: bold; background-color: #f1f5f9; padding: 8px 12px; border-left: 5px solid #2563eb; }
        .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-top: 10px; background-color: #ffffff; }
        .card-title { font-size: 12pt; font-weight: bold; color: #0f172a; margin-bottom: 4px; }
        .card-desc { font-size: 10pt; color: #475569; margin-top: 4px; white-space: pre-wrap; }
        .attachments { font-size: 9pt; color: #2563eb; margin-top: 6px; font-style: italic; }
      </style>
    </head>
    <body>
      <h1>Bacheca: ${boardTitle}</h1>
      <p style="font-size: 10pt; color: #64748b;">Esportato da Doceo Kanban il ${new Date().toLocaleDateString('it-IT')}</p>
  `;

  columns.forEach((col) => {
    const colCards = cards.filter((c) => String(c.column_id) === String(col.id));

    htmlContent += `
      <div class="column">
        <div class="column-title">${col.name} (${colCards.length})</div>
    `;

    if (colCards.length === 0) {
      htmlContent += `<p style="font-size: 10pt; color: #94a3b8; font-style: italic; padding-left: 12px;">Nessuna scheda presente in questa colonna.</p>`;
    } else {
      colCards.forEach((card) => {
        const desc = card.description || card.details || '';
        htmlContent += `
          <div class="card">
            <div class="card-title">${card.title}</div>
            ${desc ? `<div class="card-desc">${desc}</div>` : ''}
            ${
              card.attachments && card.attachments.length > 0
                ? `<div class="attachments">📎 ${card.attachments.length} allegati associati</div>`
                : ''
            }
          </div>
        `;
      });
    }

    htmlContent += `</div>`;
  });

  htmlContent += `
    </body>
    </html>
  `;

  // Download del file leggibile da Word (.doc / .docx)
  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${boardTitle.replace(/[^a-zA-Z0-9]/g, '_')}_DoceoKanban.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};