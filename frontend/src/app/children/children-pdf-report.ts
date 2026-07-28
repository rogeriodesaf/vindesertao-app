import { ChildRecord, ChildrenSummary } from '../core/models';
import { formatDateTime } from '../core/date-format';

export function renderChildrenPdf(
  printWindow: Window,
  records: ChildRecord[],
  summary: ChildrenSummary,
  period: string,
  appOrigin: string
): void {
  const appUrl = `${appOrigin}/children`;
  const appUrlScript = JSON.stringify(appUrl).replace(/</g, '\\u003c');
  const metric = (label: string, value: string | number) =>
    `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
  const rows = records.map(record => `
    <tr>
      <td>${escapeHtml(record.childName)}</td>
      <td>${escapeHtml(record.age === undefined ? '-' : String(record.age))}</td>
      <td>${escapeHtml(record.guardianName || '-')}</td>
      <td>${escapeHtml(formatPhone(record.guardianPhone) || '-')}</td>
      <td>${escapeHtml(record.activityName || '-')}</td>
      <td>${escapeHtml(record.neighborhood || '-')}</td>
      <td>${escapeHtml(formatDateTime(record.createdAt))}</td>
    </tr>`).join('');

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Infantil - Vinde Sertão</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      * { box-sizing: border-box; } body { margin: 0; color: #17252b; font: 12px Arial, sans-serif; }
      .print-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 8px;
        padding: 10px 12px; border-bottom: 1px solid #d7e0e4; background: #fff; }
      .print-toolbar button { min-height: 42px; padding: 8px 16px; border: 0; border-radius: 10px;
        background: #1e4d5c; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
      header { display: flex; align-items: center; gap: 14px; padding-bottom: 12px; border-bottom: 3px solid #1e4d5c; }
      header img { width: 54px; height: 54px; object-fit: contain; } h1 { margin: 0 0 4px; color: #1e4d5c; font-size: 22px; }
      header p, footer { margin: 0; color: #5c6b73; } .metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin: 14px 0; }
      .metric { padding: 9px; border: 1px solid #d7e0e4; border-radius: 8px; background: #f5f7f8; }
      .metric span { display: block; min-height: 28px; color: #5c6b73; } .metric strong { color: #1e4d5c; font-size: 19px; }
      table { width: 100%; border-collapse: collapse; } th { background: #1e4d5c; color: white; }
      th, td { padding: 7px; border: 1px solid #d7e0e4; text-align: left; vertical-align: top; }
      tbody tr:nth-child(even) { background: #f5f7f8; } footer { margin-top: 12px; text-align: right; }
      @media print { .print-toolbar { display: none !important; } }
    </style></head><body>
    <nav class="print-toolbar" aria-label="Ações do relatório">
      <button type="button" onclick="returnToApp()">Voltar ao aplicativo</button>
    </nav>
    <header><img src="${appOrigin}/assets/logo-vinde-sertao.webp" alt=""><div><h1>Vinde Sertão · Departamento Infantil</h1>
    <p>Período: ${escapeHtml(period)} · Emitido em ${escapeHtml(new Date().toLocaleString('pt-BR'))}</p></div></header>
    <section class="metrics">
      ${metric('Crianças', summary.totalChildren)}
      ${metric('Meninos', summary.boys)}
      ${metric('Meninas', summary.girls)}
      ${metric('Média de idade', formatAverage(summary.averageAge))}
      ${metric('Responsáveis', summary.distinctGuardians)}
      ${metric('Bairros/comunidades', summary.distinctNeighborhoods)}
    </section>
    <table><thead><tr><th>Nome</th><th>Idade</th><th>Responsável</th><th>Telefone</th><th>Atividade</th><th>Bairro/comunidade</th><th>Cadastro</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7">Nenhum cadastro no período.</td></tr>'}</tbody></table>
    <footer>Vinde Sertão · Relatório emitido pelo sistema</footer>
    <script>
      const appUrl = ${appUrlScript};
      function returnToApp() {
        if (window.opener && !window.opener.closed) {
          window.opener.focus();
          window.close();
          return;
        }
        window.location.href = appUrl;
      }
      addEventListener('afterprint', () => setTimeout(returnToApp, 100));
      addEventListener('load', () => setTimeout(() => { focus(); print(); }, 300));
    <\/script>
    </body></html>`);
  printWindow.document.close();
}

function formatPhone(value?: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatAverage(value: number): string {
  return value ? value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character] || character);
}
