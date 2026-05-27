import React from 'react';

export type InvoiceTemplate = 'classic' | 'modern';
export type InvoiceStatus = 'draft' | 'unpaid' | 'paid' | 'partial';

export type InvoiceParty = {
  name: string;
  address?: string;
  phone?: string;
  pan?: string;
  email?: string;
};

export type InvoiceItem = {
  sn?: number;
  name: string;
  qty: number;
  rate: number;
  discount?: number;
  vat?: number;
  total?: number;
};

export type InvoiceData = {
  invoiceNo: string;
  billDate: string;
  dueDate?: string;
  title?: string;
  company: InvoiceParty & {
    logoUrl?: string;
    vatNo?: string;
    regNo?: string;
    qrCodeUrl?: string;
    barcodeValue?: string;
  };
  customer: InvoiceParty;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  vatAmount: number;
  grandTotal: number;
  inWords: string;
  paidAmount?: number;
  status?: InvoiceStatus;
  message?: string;
  watermark?: string;
};

export const demoInvoiceData: InvoiceData = {
  invoiceNo: 'SI-000026',
  billDate: '16/12/2024',
  dueDate: '01/09/2081',
  title: 'Estimate Bill',
  company: {
    name: 'B.S. International Pvt. Ltd.',
    address: 'Dhapakhel-23, Lalitpur',
    phone: '01-5275083 / 9851158989',
    pan: '606002732',
    vatNo: '163279/073/074',
    regNo: '163279/073/074',
    logoUrl: '',
    qrCodeUrl: '',
    barcodeValue: 'SI-000026',
    email: 'info@example.com',
  },
  customer: {
    name: 'Kasmi Silai Udyhog',
    address: 'Lalitpur',
    phone: '',
    pan: '608571461',
    email: '',
  },
  items: [
    { sn: 1, name: '#724 Full Track Set', qty: 428, rate: 300, discount: 0, vat: 13, total: 128400 },
    { sn: 2, name: '#724 Cut Pic Trouser Only', qty: 12, rate: 190, discount: 0, vat: 13, total: 2280 },
  ],
  subtotal: 130680,
  discount: 0,
  vatAmount: 0,
  grandTotal: 130680,
  inWords: 'One Lakh Thirty Thousand Six Hundred Eighty Only',
  paidAmount: 0,
  status: 'unpaid',
  message: '',
  watermark: 'DRAFT',
};

type Props = {
  data?: InvoiceData;
  template?: InvoiceTemplate;
  className?: string;
  style?: React.CSSProperties;
  showActions?: boolean;
  onPrint?: () => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default function InvoiceModern({
  data = demoInvoiceData,
  template = 'classic',
  className = '',
  style,
  showActions = false,
  onPrint,
}: Props) {
  const paid = data.paidAmount ?? 0;
  const balance = Math.max(0, data.grandTotal - paid);
  const isPaid = data.status === 'paid' || balance === 0;
  const badgeLabel = isPaid ? 'PAID' : data.status === 'partial' ? 'PARTIAL' : 'UNPAID';

  const templateClasses = template === 'classic'
    ? 'border border-slate-900 rounded-none shadow-none'
    : 'border border-slate-200 rounded-2xl shadow-invoice';

  return (
    <div className={`mx-auto w-full max-w-[210mm] bg-white text-slate-900 ${templateClasses} ${className}`} style={style}>
      <style>{`
        .invoice-watermark { transform: rotate(-22deg); }
        @media print {
          .invoice-watermark { opacity: .08 !important; }
        }
      `}</style>

      <div className="relative overflow-hidden bg-white px-4 py-4 md:px-8 md:py-6 print-shadow-none">
        {data.watermark ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="invoice-watermark text-[clamp(3rem,8vw,7rem)] font-black tracking-[0.35em] text-slate-200/40 select-none">
              {data.watermark}
            </div>
          </div>
        ) : null}

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3">
            <div className="text-xs leading-5 text-slate-700">
              <div className="font-semibold">PAN NO: {data.company.pan || '-'}</div>
              <div className="font-semibold">REG NO: {data.company.regNo || '-'}</div>
            </div>

            <div className="flex-1 text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-slate-50">
                {data.company.logoUrl ? (
                  <img src={data.company.logoUrl} alt="Company logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Logo</span>
                )}
              </div>
              <h1 className="text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold tracking-tight text-slate-900">
                {data.company.name}
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-700 md:text-base">{data.company.address || '-'}</p>
            </div>

            <div className="min-w-[160px] text-right text-xs leading-5 text-slate-700">
              <div className="font-semibold">{data.company.phone || '-'}</div>
              <div className="font-semibold">{data.company.email || '-'}</div>
            </div>
          </div>

          <div className="border-b-2 border-slate-900 py-4 text-center">
            <div className="text-[clamp(1.2rem,2.5vw,1.7rem)] font-extrabold tracking-wide text-slate-900">
              {data.title || 'TAX INVOICE'}
            </div>
          </div>

          <div className="grid gap-4 border-b-2 border-slate-900 py-4 md:grid-cols-2">
            <div className="space-y-1 text-sm md:text-[15px]">
              <Row label="Customer Name" value={data.customer.name} />
              <Row label="Address" value={data.customer.address || '-'} />
              <Row label="Phone" value={data.customer.phone || '-'} />
              <Row label="PAN Number" value={data.customer.pan || '-'} />
            </div>
            <div className="space-y-1 text-sm md:text-[15px] md:pl-6 md:border-l-2 md:border-slate-900">
              <Row label="Invoice No." value={data.invoiceNo} />
              <Row label="Bill Date" value={data.billDate} />
              <Row label="Due Date" value={data.dueDate || '-'} />
              <Row label="Payment Method" value={isPaid ? 'Paid' : 'Unpaid'} />
            </div>
          </div>

          <div className="overflow-hidden border-b-2 border-slate-900">
            <table className="w-full border-collapse text-[12px] md:text-sm">
              <thead className="bg-slate-100 text-slate-900">
                <tr>
                  <Th className="w-[6%] text-center">SN</Th>
                  <Th className="w-[38%]">Product Name</Th>
                  <Th className="w-[10%] text-right">Qty</Th>
                  <Th className="w-[12%] text-right">Rate</Th>
                  <Th className="w-[12%] text-right">Discount</Th>
                  <Th className="w-[10%] text-right">VAT</Th>
                  <Th className="w-[12%] text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => {
                  const sn = item.sn ?? idx + 1;
                  const discountValue = item.discount ?? 0;
                  const vatValue = item.vat ?? 13;
                  const totalValue = item.total ?? ((item.qty * item.rate) - discountValue);
                  return (
                    <tr key={`${item.name}-${sn}`} className="invoice-break-inside-avoid border-t border-slate-300 odd:bg-white even:bg-slate-50/70 hover:bg-slate-100/60 print:hover:bg-white">
                      <Td className="text-center font-medium">{sn}</Td>
                      <Td className="font-medium text-slate-900">{item.name}</Td>
                      <Td className="text-right tabular-nums">{item.qty}</Td>
                      <Td className="text-right tabular-nums">रू {formatMoney(item.rate)}</Td>
                      <Td className="text-right tabular-nums">रू {formatMoney(discountValue)}</Td>
                      <Td className="text-right tabular-nums">{vatValue}%</Td>
                      <Td className="text-right tabular-nums font-semibold">रू {formatMoney(totalValue)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 border-b-2 border-slate-900 py-4 md:grid-cols-[1.2fr_.8fr]">
            <div className="min-h-[110px] rounded border border-slate-900 p-3">
              <div className="text-sm font-semibold italic">In Words:</div>
              <div className="mt-2 text-sm font-semibold italic leading-6 text-slate-800">
                Rs. {data.inWords}
              </div>
              {data.message ? <p className="mt-3 text-sm text-slate-700">Message: {data.message}</p> : null}
            </div>

            <div className="rounded border border-slate-900 p-3">
              <SummaryRow label="Subtotal" value={`रू ${formatMoney(data.subtotal)}`} />
              <SummaryRow label="Discount" value={`रू ${formatMoney(data.discount)}`} />
              <SummaryRow label="VAT 13%" value={`रू ${formatMoney(data.vatAmount)}`} />
              <div className="mt-2 flex items-center justify-between border-t border-slate-900 pt-2 text-base font-extrabold md:text-lg">
                <span>Grand Total</span>
                <span>रू {formatMoney(data.grandTotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Paid</span>
                <span>रू {formatMoney(paid)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Balance</span>
                <span>रू {formatMoney(balance)}</span>
              </div>
              <div className="mt-3 inline-flex rounded-full border border-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
                {badgeLabel}
              </div>
            </div>
          </div>

          <div className="py-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Signature label="Prepared By" />
              <Signature label="Received By" />
              <Signature label="Authorized Signature" />
            </div>
          </div>

          {(data.company.qrCodeUrl || data.company.barcodeValue) ? (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-300 pt-4 text-sm text-slate-700 no-print">
              {data.company.qrCodeUrl ? (
                <div className="flex items-center gap-3">
                  <img src={data.company.qrCodeUrl} alt="QR code" className="h-20 w-20 rounded border border-slate-200 object-contain" />
                  <div>
                    <div className="font-semibold">Scan & Pay</div>
                    <div className="text-xs text-slate-500">QR code support enabled</div>
                  </div>
                </div>
              ) : null}
              {data.company.barcodeValue ? (
                <div className="min-w-[240px]">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Barcode</div>
                  <div className="h-14 rounded border border-slate-300 bg-[repeating-linear-gradient(90deg,#111_0_2px,transparent_2px_5px)]" />
                  <div className="mt-1 text-center text-xs font-medium tracking-[0.18em] text-slate-700">{data.company.barcodeValue}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {showActions && onPrint ? (
            <div className="no-print mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button onClick={onPrint} className="rounded border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-900 hover:text-white">
                Print Invoice
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 leading-6">
      <span className="min-w-[135px] font-semibold text-slate-700">{label}</span>
      <span className="font-medium text-slate-900">: {value}</span>
    </div>
  );
}

function Th({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <th className={`border border-slate-900 px-2 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <td className={`border border-slate-900 px-2 py-2 align-top ${className}`}>{children}</td>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-slate-300 py-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div className="text-center text-sm">
      <div className="mb-8 border-b border-dotted border-slate-400" />
      <div className="font-semibold text-slate-800">{label}</div>
    </div>
  );
}
