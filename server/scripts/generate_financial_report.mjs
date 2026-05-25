import puppeteer from 'puppeteer';
import knex from '../db/knex.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

async function gatherData() {
  const sales = await knex('sales').select('*');
  const purchases = await knex('purchases').select('*');
  const productsArr = await knex('products').select('id','purchasePrice','sellingPrice','stock','nameEn');
  const products = Object.fromEntries(productsArr.map(p=>[p.id,p]));
  const transactions = await knex('transactions').select('*');

  let totalRevenue = 0;
  let totalVAT = 0;
  let totalDiscount = 0;
  let totalCost = 0; // COGS

  for (const s of sales) {
    totalRevenue += Number(s.total || 0);
    totalVAT += Number(s.tax || 0);
    totalDiscount += Number(s.discount || 0);
    let items = [];
    try { items = JSON.parse(s.items || '[]'); } catch(e) { items = []; }
    for (const it of items) {
      const qty = Number(it.qty || 1);
      const cost = Number(it.cost ?? (products[it.productId] ? products[it.productId].purchasePrice : 0));
      totalCost += cost * qty;
    }
  }

  // Inventory value
  let inventoryValue = 0;
  for (const p of productsArr) inventoryValue += Number(p.purchasePrice || 0) * Number(p.stock || 0);

  // Cash-like balance from transactions (credit - debit)
  let cashBalance = 0;
  for (const t of transactions) {
    cashBalance += Number(t.credit || 0) - Number(t.debit || 0);
  }

  const assets = Math.max(0, cashBalance + inventoryValue);
  const liabilities = Math.max(0, totalDiscount); // simple proxy
  const equity = assets - liabilities;

  return { sales, purchases, products: productsArr, transactions, totalRevenue, totalVAT, totalDiscount, totalCost, inventoryValue, cashBalance, assets, liabilities, equity };
}

function renderHtml(data) {
  const { totalRevenue, totalVAT, totalDiscount, totalCost, inventoryValue, cashBalance, assets, liabilities, equity } = data;
  const now = new Date().toLocaleString();
  return `<!doctype html><html><head><meta charset='utf-8'><title>Dhakal Traders — Financial Report</title><style>
  body{font-family: Arial, Helvetica, sans-serif;color:#111;margin:20px}
  .report-header{display:flex;justify-content:space-between;align-items:center}
  .title{font-size:20px;font-weight:700}
  .section{margin-top:18px;padding:12px;border:1px solid #e6e6e6;border-radius:6px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{padding:8px;border:1px solid #ddd;text-align:left;font-size:13px}
  .muted{color:#666;font-size:13px}
  .tot{font-weight:700}
  .small{font-size:12px;color:#666}
</style></head><body>
  <div class='report-header'>
    <div>
      <div class='title'>Dhakal Traders & Suppliers</div>
      <div class='small'>Financial Report — Generated: ${now}</div>
    </div>
    <div><img src='LOGO_PLACEHOLDER' style='height:56px' /></div>
  </div>

  <div class='section'>
    <h3>Profit & Loss</h3>
    <div class='grid'>
      <div>
        <h4>Income</h4>
        <div>Total Revenue: NRS ${Number(totalRevenue).toLocaleString()}</div>
        <div>VAT: NRS ${Number(totalVAT).toLocaleString()}</div>
      </div>
      <div>
        <h4>Expenses</h4>
        <div>COGS: NRS ${Number(totalCost).toLocaleString()}</div>
        <div>Discounts: NRS ${Number(totalDiscount).toLocaleString()}</div>
      </div>
    </div>
    <div style='margin-top:12px'><strong>Gross Profit: NRS ${Number(totalRevenue - totalCost).toLocaleString()}</strong></div>
  </div>

  <div class='section'>
    <h3>Balance Sheet</h3>
    <div class='grid'>
      <div>
        <h4>Assets</h4>
        <div>Cash & Equivalents: NRS ${Number(cashBalance).toLocaleString()}</div>
        <div>Inventory Value: NRS ${Number(inventoryValue).toLocaleString()}</div>
      </div>
      <div>
        <h4>Liabilities</h4>
        <div>Short-term Liabilities (proxy): NRS ${Number(liabilities).toLocaleString()}</div>
      </div>
    </div>
    <div style='margin-top:12px'><strong>Equity: NRS ${Number(equity).toLocaleString()}</strong></div>
  </div>

  <div class='section'>
    <h3>Recent Sales (last 20)</h3>
    <table>
      <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Subtotal</th><th>Tax</th><th>Total</th></tr></thead>
      <tbody>
        ${data.sales.slice(-20).reverse().map(s=>`<tr><td>${s.id}</td><td>${s.date}</td><td>${s.customerName||'Walk-in'}</td><td>${Number(s.subtotal).toLocaleString()}</td><td>${Number(s.tax).toLocaleString()}</td><td>${Number(s.total).toLocaleString()}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class='section'>
    <h3>Recent Purchases (last 20)</h3>
    <table>
      <thead><tr><th>Purchase</th><th>Date</th><th>Supplier</th><th>Total</th></tr></thead>
      <tbody>
        ${data.purchases.slice(-20).reverse().map(p=>`<tr><td>${p.id}</td><td>${p.date}</td><td>${p.supplier}</td><td>${Number(p.total).toLocaleString()}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class='section'>
    <h3>Notes</h3>
    <div class='muted'>This report is generated from local POS data. For formal accounting-grade reports, integrate with accounting ledger and chart of accounts.</div>
  </div>
</body></html>`;
}

async function main() {
  const outPath = process.argv[2] || 'E:/Dhakal Traders and Suppliers.pdf';
  const data = await gatherData();
  const html = renderHtml(data);

  // ensure output directory
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Replace logo placeholder with local client asset if available
  const logoPath = path.join(path.resolve('./'), '..', 'client', 'dist', 'assets', 'Dhakal Traders Logo -9__H0BzR.png');
  let logoUrl = '';
  if (fs.existsSync(logoPath)) logoUrl = pathToFileURL(logoPath).href;
  const finalHtml = html.replace('LOGO_PLACEHOLDER', logoUrl || '');

  await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
  // header/footer templates
  const headerTemplate = `<div style="font-size:10px;width:100%;text-align:center;border-bottom:1px solid #ddd;padding-bottom:6px"><span class='title'>Dhakal Traders & Suppliers</span></div>`;
  const footerTemplate = `<div style="font-size:10px;width:100%;text-align:center;border-top:1px solid #ddd;padding-top:6px"><span class='small'>Generated on ${new Date().toLocaleString()}</span> — Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`;

  await page.pdf({ path: outPath, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate, footerTemplate, margin: { top: '80px', bottom: '80px', left: '20px', right: '20px' } });
  await browser.close();
  console.log('PDF generated at', outPath);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
