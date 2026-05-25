// ─── POS Page: Accounting Ledger & Journal ───────────────────────────────────
import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../LanguageContext';
import { usePOS } from './POSContext';
import {
  ACCOUNTS,
  buildCashBook,
  buildJournalLines,
  buildTrialBalance,
  downloadCashBookExport,
  downloadJournalExport,
  LedgerView,
  summarizeLedger,
  // types
  JournalLine,
  CashBookRow,
  AccountDef,
} from './ledgerUtils.ts';

export default function LedgerPage() {
  const { sales, purchases, setReceiptData, t } = usePOS();
  const { lang } = useLanguage();

  const [view, setView] = useState<LedgerView>('cashbook');
  const [filter, setFilter] = useState<'all' | 'sale' | 'purchase'>('all');
  const [search, setSearch] = useState('');

  const summary = useMemo(() => summarizeLedger(sales, purchases), [sales, purchases]);
  const journalAll = useMemo(() => buildJournalLines(sales, purchases), [sales, purchases]);
  const cashBookAll = useMemo(() => buildCashBook(sales, purchases), [sales, purchases]);
  const trialBalance = useMemo(() => buildTrialBalance(journalAll), [journalAll]);

  const q = search.trim().toLowerCase();

  const journalFiltered = useMemo(() => {
    return journalAll.filter((line: JournalLine) => {
      if (filter !== 'all' && line.voucherType !== filter) return false;
      if (!q) return true;
      return (
        line.voucherId.toLowerCase().includes(q) ||
        line.partyName.toLowerCase().includes(q) ||
        line.particulars.toLowerCase().includes(q) ||
        line.accountCode.toLowerCase().includes(q)
      );
    });
  }, [journalAll, filter, q]);

  const cashBookFiltered = useMemo(() => {
    const filtered = cashBookAll.filter((row: CashBookRow) => {
      if (filter !== 'all' && row.type !== filter) return false;
      if (!q) return true;
      return (
        row.ref.toLowerCase().includes(q) ||
        row.partyName.toLowerCase().includes(q) ||
        row.particulars.toLowerCase().includes(q)
      );
    });
    let balance = 0;
    const chronological = [...filtered].reverse();
    return chronological.map((row: CashBookRow) => {
      balance += row.receipt - row.payment;
      return { ...row, balance };
    }).reverse();
  }, [cashBookAll, filter, q]);

  const accountLabel = (code: string) => {
    const acc = ACCOUNTS[code];
    if (!acc) return code;
    return lang === 'ne' ? acc.nameNe : acc.nameEn;
  };

  const exportCurrent = () => {
    if (view === 'journal') downloadJournalExport(journalFiltered, lang);
    else downloadCashBookExport(cashBookFiltered, lang);
  };

  function printLedger() {
    const w = window.open('', '_blank');
    if (!w) return alert('Popup blocked — allow popups to print');
    const now = new Date();
    const generated = now.toLocaleString();

    let heading = '';
    let rowsHtml = '';
    if (view === 'journal') {
      heading = lang === 'ne' ? 'जर्नल खाता (डेबिट / क्रेडिट)' : 'General Journal (Debit / Credit)';
      rowsHtml = journalFiltered.map(line => (
        `<tr>
          <td>${line.date}</td>
          <td>${line.voucherId}</td>
          <td>${line.partyName}</td>
          <td>${line.paymentMode || 'Cash'}</td>
          <td>${line.accountCode}</td>
          <td>${(line.particulars || '').replace(/</g,'&lt;')}</td>
          <td style="text-align:right">${line.debit > 0 ? 'NRS ' + line.debit.toLocaleString() : '—'}</td>
          <td style="text-align:right">${line.credit > 0 ? 'NRS ' + line.credit.toLocaleString() : '—'}</td>
        </tr>`
      )).join('');
    } else {
      heading = lang === 'ne' ? 'नगद खाता — आम्दानी / खर्च' : 'Cash Book — Receipts & Payments';
      rowsHtml = cashBookFiltered.map(row => (
        `<tr>
          <td>${row.date}</td>
          <td>${row.ref}</td>
          <td>${row.partyName}</td>
          <td>${row.paymentMode || 'Cash'}</td>
          <td>${(row.particulars || '').replace(/</g,'&lt;')}</td>
          <td style="text-align:right">${row.receipt > 0 ? 'NRS ' + row.receipt.toLocaleString() : '--'}</td>
          <td style="text-align:right">${row.payment > 0 ? 'NRS ' + row.payment.toLocaleString() : '--'}</td>
          <td style="text-align:right">NRS ${row.balance.toLocaleString()}</td>
        </tr>`
      )).join('');
    }

    const html = `
      <html>
      <head>
        <title>Ledger Report</title>
        <style>
          body{font-family: Arial, Helvetica, sans-serif;padding:20px;color:#111}
          .head{display:flex;justify-content:space-between;align-items:center}
          .company{font-weight:700;font-size:18px}
          .meta{font-size:12px;text-align:right}
          table{width:100%;border-collapse:collapse;margin-top:16px}
          th,td{padding:8px;border:1px solid #ddd;text-align:left;font-size:12px}
          th{background:#f6f6f6}
          .num{text-align:right}
        </style>
      </head>
      <body>
        <div class="head">
          <div>
            <div class="company">Dhakal Traders & Suppliers</div>
            <div>Phone: 986... · Dhapakhel Lalitpur</div>
            <div>Reg No: 606002732</div>
          </div>
          <div class="meta">
            <div>${heading}</div>
            <div>Report Generated on: ${generated}</div>
          </div>
        </div>
        <div style="margin-top:12px;font-size:13px;">
          <table>
            <thead>
              ${view === 'journal' ? '<tr><th>Date</th><th>Voucher</th><th>Party</th><th>Mode</th><th>Account</th><th>Particulars</th><th>Debit</th><th>Credit</th></tr>' : '<tr><th>Date</th><th>Ref</th><th>Party</th><th>Mode</th><th>Particulars</th><th>Receipt</th><th>Payment</th><th>Running Balance</th></tr>'}
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    w.document.write(html);
    w.document.close();
    try {
      const doPrint = () => {
        try {
          if (w.closed) return;
          w.focus();
          w.print();
        } catch (e) {
          // ignore
        }
      };

      // If the document is already complete, print immediately
      const doc = w.document;
      if (doc && doc.readyState === 'complete') {
        doPrint();
        return;
      }

      // Listen for DOMContentLoaded
      try {
        doc.addEventListener && doc.addEventListener('DOMContentLoaded', () => doPrint(), { once: true });
      } catch (e) {
        // ignore
      }

      // Listen for window load as well
      try {
        w.addEventListener && w.addEventListener('load', () => doPrint(), { once: true });
      } catch (e) {
        // ignore
      }

      // Final fallback after 1s
      setTimeout(() => doPrint(), 1000);
    } catch (err) {
      setTimeout(() => { try { if (!w.closed) { w.focus(); w.print(); } } catch (_) {} }, 1200);
    }
  }

  const openVoucher = (voucherId: string, type: 'sale' | 'purchase') => {
    if (type === 'sale') {
      const sale = sales.find((s) => s.id === voucherId);
      if (sale) setReceiptData(sale);
    } else {
      const purchase = purchases.find((p) => p.id === voucherId);
      // POS currently uses setReceiptData for showing vouchers; cast to any for purchases
      if (purchase) setReceiptData(purchase as any);
    }
  };

  return (
    <div className="pos-ledger-page">
      <div className="pos-metrics-grid" style={{ marginBottom: 20 }}>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('कुल आम्दानी (बिक्री)', 'Total Receipts (Sales)')}</h4>
            <span className="pos-metric-val" style={{ color: 'var(--pos-success)' }}>
              NRS {summary.totalReceipts.toLocaleString()}
            </span>
          </div>
          <div className="pos-metric-icon green"><i className="ri-arrow-down-circle-line" /></div>
        </div>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('कुल खर्च (खरिद)', 'Total Payments (Purchase)')}</h4>
            <span className="pos-metric-val" style={{ color: 'var(--pos-danger)' }}>
              NRS {summary.totalPayments.toLocaleString()}
            </span>
          </div>
          <div className="pos-metric-icon red"><i className="ri-arrow-up-circle-line" /></div>
        </div>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('नगद बाँकी', 'Cash Balance')}</h4>
            <span className="pos-metric-val">NRS {summary.closingBalance.toLocaleString()}</span>
          </div>
          <div className="pos-metric-icon blue"><i className="ri-wallet-3-line" /></div>
        </div>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('जर्नल लाइन', 'Journal Lines')}</h4>
            <span className="pos-metric-val">{summary.journalLines}</span>
            <span style={{ fontSize: 11, color: 'var(--pos-text-muted)', display: 'block', marginTop: 4 }}>
              {summary.salesCount} {t('बिक्री', 'sales')} · {summary.purchaseCount} {t('खरिद', 'purchases')}
            </span>
          </div>
          <div className="pos-metric-icon yellow"><i className="ri-book-open-line" /></div>
        </div>
      </div>
      {/* Summary Section */}
      <div className="pos-metrics-grid" style={{ marginBottom: 20 }}>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('स्थिति', 'Status')}</h4>
            <span className="pos-metric-val">{summary.closingBalance === 0 ? t('समाप्त', 'Settled') : t('चलिरहेको', 'Pending')}</span>
          </div>
          <div className="pos-metric-icon gray"><i className="ri-checkbox-circle-line" /></div>
        </div>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('लेनदेन', 'Transactions')}</h4>
            <span className="pos-metric-val">{summary.salesCount + summary.purchaseCount}</span>
          </div>
          <div className="pos-metric-icon gray"><i className="ri-list-check-2" /></div>
        </div>
        <div className="pos-metric-card" style={{ alignSelf: 'center' }}>
          <button type="button" className="pos-form-submit" onClick={exportCurrent}>
            <i className="ri-file-list-line" /> {t('विवरण', 'Statement')}
          </button>
        </div>
      </div>

      <div className="pos-ledger-toolbar">
        <div className="pos-ledger-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'cashbook'}
            className={`pos-ledger-tab${view === 'cashbook' ? ' active' : ''}`}
            onClick={() => setView('cashbook')}
          >
            <i className="ri-wallet-line" />
            {t('नगद खाता (बही)', 'Cash Book')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'journal'}
            className={`pos-ledger-tab${view === 'journal' ? ' active' : ''}`}
            onClick={() => setView('journal')}
          >
            <i className="ri-book-2-line" />
            {t('जर्नल वाउचर', 'Journal Voucher')}
          </button>
        </div>

        <div className="pos-ledger-filters">
          <select
            className="pos-form-select pos-ledger-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            aria-label={t('फिल्टर', 'Filter')}
          >
            <option value="all">{t('सबै', 'All')}</option>
            <option value="sale">{t('बिक्री मात्र', 'Sales only')}</option>
            <option value="purchase">{t('खरिद मात्र', 'Purchase only')}</option>
          </select>
          <input
            type="search"
            className="pos-form-input pos-ledger-search"
            placeholder={t('खोज्नुहोस्...', 'Search ref, name...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="pos-form-submit" onClick={exportCurrent}>
            <i className="ri-download-2-line" /> {t('CSV', 'CSV')}
          </button>
          <button type="button" className="pos-sec-btn" onClick={() => printLedger()} style={{ marginLeft: 8 }}>
            <i className="ri-printer-line" /> {t('Print', 'Print')}
          </button>
        </div>
      </div>

      {/* Print helper - open printable window with ledger/table */}
      

      {view === 'cashbook' && (
        <div className="pos-panel">
          <div className="pos-panel-header">
            <h3 className="pos-panel-title">
              <i className="ri-file-list-3-line" />
              {t('नगद खाता — आम्दानी / खर्च', 'Cash Book — Receipts & Payments')}
            </h3>
          </div>
          <div className="pos-table-wrap">
            <table className="pos-table pos-ledger-table">
              <thead>
                <tr>
                  <th>{t('मिति', 'Date')}</th>
                  <th>{t('सन्दर्भ', 'Ref')}</th>
                  <th>{t('पार्टी', 'Party')}</th>
                  <th>{t('मोड', 'Mode')}</th>
                  <th>{t('विवरण', 'Particulars')}</th>
                  <th className="pos-col-num">{t('आम्दानी (Dr)', 'Receipt (In)')}</th>
                  <th className="pos-col-num">{t('खर्च (Cr)', 'Payment (Out)')}</th>
                  <th className="pos-col-num">{t('बाँकी', 'Balance')}</th>
                </tr>
              </thead>
              <tbody>
                {cashBookFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="pos-ledger-empty">
                      {t('कुनै लेनदेन छैन।', 'No transactions yet.')}
                    </td>
                  </tr>
                ) : (
                  cashBookFiltered.map((row: CashBookRow) => (
                    <tr key={row.id} className={row.type === 'sale' ? 'pos-ledger-row--in' : 'pos-ledger-row--out'}>
                      <td>{row.date}</td>
                      <td>
                          {row.type === 'sale' ? (
                          <button type="button" className="pos-ledger-ref-btn" onClick={() => openVoucher(row.ref, 'sale')}>
                            {row.ref}
                          </button>
                        ) : (
                          <span className="pos-ledger-ref">{row.ref}</span>
                        )}
                      </td>
                      <td>{row.partyName}</td>
                      <td>{row.paymentMode || 'Cash'}</td>
                      <td>{row.particulars}</td>
                      <td className="pos-col-num pos-ledger-in">
                        {row.receipt > 0 ? `NRS ${row.receipt.toLocaleString()}` : '—'}
                      </td>
                      <td className="pos-col-num pos-ledger-out">
                        {row.payment > 0 ? `NRS ${row.payment.toLocaleString()}` : '—'}
                      </td>
                      <td className="pos-col-num pos-ledger-balance">NRS {row.balance.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'journal' && (
        <>
          <div className="pos-panel" style={{ marginBottom: 20 }}>
            <div className="pos-panel-header">
              <h3 className="pos-panel-title">
                <i className="ri-scales-3-line" />
                {t('ट्रायल ब्यालेन्स', 'Trial Balance')}
              </h3>
            </div>
            <div className="pos-table-wrap">
              <table className="pos-table pos-ledger-table pos-ledger-table--compact">
                <thead>
                  <tr>
                    <th>{t('खाता कोड', 'Account')}</th>
                    <th>{t('खाता नाम', 'Account Name')}</th>
                    <th className="pos-col-num">{t('डेबिट', 'Debit')}</th>
                    <th className="pos-col-num">{t('क्रेडिट', 'Credit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.map((row: { account: AccountDef; debit: number; credit: number }) => (
                    <tr key={row.account.code}>
                      <td><code className="pos-ledger-code">{row.account.code}</code></td>
                      <td>{lang === 'ne' ? row.account.nameNe : row.account.nameEn}</td>
                      <td className="pos-col-num">{row.debit > 0 ? `NRS ${row.debit.toLocaleString()}` : '—'}</td>
                      <td className="pos-col-num">{row.credit > 0 ? `NRS ${row.credit.toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="pos-ledger-tfoot">
                    <td colSpan={2}>{t('जम्मा', 'Total')}</td>
                    <td className="pos-col-num">
                      NRS {trialBalance.reduce((a: number, r: { account: AccountDef; debit: number; credit: number }) => a + r.debit, 0).toLocaleString()}
                    </td>
                    <td className="pos-col-num">
                      NRS {trialBalance.reduce((a: number, r: { account: AccountDef; debit: number; credit: number }) => a + r.credit, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="pos-panel">
            <div className="pos-panel-header">
              <h3 className="pos-panel-title">
                <i className="ri-book-open-line" />
                {t('जर्नल खाता (डेबिट / क्रेडिट)', 'General Journal (Debit / Credit)')}
              </h3>
            </div>
            <div className="pos-table-wrap">
              <table className="pos-table pos-ledger-table">
                <thead>
                  <tr>
                    <th>{t('मिति', 'Date')}</th>
                    <th>{t('भौचर', 'Voucher')}</th>
                    <th>{t('पार्टी', 'Party')}</th>
                    <th>{t('मोड', 'Mode')}</th>
                    <th>{t('खाता', 'Account')}</th>
                    <th>{t('विवरण', 'Particulars')}</th>
                    <th className="pos-col-num">{t('डेबिट', 'Debit')}</th>
                    <th className="pos-col-num">{t('क्रेडिट', 'Credit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {journalFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="pos-ledger-empty">
                        {t('कुनै जर्नल प्रविष्टि छैन।', 'No journal entries.')}
                      </td>
                    </tr>
                  ) : (
                    journalFiltered.map((line: JournalLine) => (
                      <tr
                        key={line.lineId}
                        className={line.voucherType === 'sale' ? 'pos-ledger-row--in' : 'pos-ledger-row--out'}
                      >
                        <td>{line.date}</td>
                        <td>
                          {line.voucherType === 'sale' ? (
                            <button type="button" className="pos-ledger-ref-btn" onClick={() => openVoucher(line.voucherId, 'sale')}>
                              {line.voucherId}
                            </button>
                          ) : (
                            <span className="pos-ledger-ref">{line.voucherId}</span>
                          )}
                          <span className={`pos-ledger-type pos-ledger-type--${line.voucherType}`}>
                            {line.voucherType === 'sale' ? t('बिक्री', 'Sale') : t('खरिद', 'Purchase')}
                          </span>
                        </td>
                        <td>{line.partyName}</td>
                        <td>{line.paymentMode || 'Cash'}</td>
                        <td>
                          <code className="pos-ledger-code">{line.accountCode}</code>
                          <span className="pos-ledger-acc-name">{accountLabel(line.accountCode)}</span>
                        </td>
                        <td className="pos-ledger-particulars">{line.particulars}</td>
                        <td className="pos-col-num">{line.debit > 0 ? `NRS ${line.debit.toLocaleString()}` : '—'}</td>
                        <td className="pos-col-num">{line.credit > 0 ? `NRS ${line.credit.toLocaleString()}` : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p className="pos-ledger-note">
        {t(
          'बिक्री र किसान खरिदबाट स्वचालित जर्नल। नगद खाता = आम्दानी − खर्च। जर्नल = लेखा प्रणाली अनुसार डेबिट/क्रेडिट।',
          'Auto-generated from sales and farmer purchases. Cash book = receipts − payments. Journal follows debit/credit accounting.'
        )}
      </p>
    </div>
  );
}
