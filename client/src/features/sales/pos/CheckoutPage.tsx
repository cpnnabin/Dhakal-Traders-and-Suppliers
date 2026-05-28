import React from 'react';
import CheckoutCustomerSection from './CheckoutCustomerSection';
import OrderSummary from './OrderSummary';

export type CheckoutPageProps = React.ComponentProps<typeof CheckoutCustomerSection> & {
	subtotal: number;
	discountAmt: number;
	tax: number;
	total: number;
	applyTax: boolean;
	cart: any[];
	amountPaid: string;
	setAmountPaid: (value: string) => void;
	amountPreset: 'exact' | 'round' | 'round5' | null;
	setAmountPreset: (value: 'exact' | 'round' | 'round5' | null) => void;
	paymentMode: string;
	setPaymentMode: (value: string) => void;
	PAYMENT_MODES: Array<{ id: string; labelNe: string; labelEn: string; icon: string }>;
	onContinueShopping: () => void;
	onComplete: () => void;
	onCompleteAndPrint: () => void;
	isSubmitting: boolean;
	canComplete: boolean;
	canCompleteAndPrint: boolean;
	t: (ne: string, en: string) => string;
};

export default function CheckoutPage(props: CheckoutPageProps) {
	const {
		subtotal, discountAmt, tax, total, applyTax, cart,
		amountPaid, setAmountPaid, amountPreset, setAmountPreset, paymentMode, setPaymentMode, PAYMENT_MODES,
		onContinueShopping, onComplete, onCompleteAndPrint,
		isSubmitting, canComplete, canCompleteAndPrint,
		...customerProps
	} = props;

	return (
		<div className="mw-row" style={{ alignItems: 'flex-start', gap: 24, display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(340px, 0.9fr)' }}>
			<div className="mw-col-main" style={{ minWidth: 0 }}>
				<CheckoutCustomerSection {...customerProps} />
			</div>

			<div className="mw-col-side" style={{ minWidth: 0 }}>
				<OrderSummary
					t={customerProps.t}
					subtotal={subtotal}
					discountAmt={discountAmt}
					tax={tax}
					total={total}
					applyTax={applyTax}
					cart={cart}
					amountPaid={amountPaid}
					setAmountPaid={setAmountPaid}
					amountPreset={amountPreset}
					setAmountPreset={setAmountPreset}
					paymentMode={paymentMode}
					setPaymentMode={setPaymentMode}
					PAYMENT_MODES={PAYMENT_MODES}
					onContinueShopping={onContinueShopping}
					onComplete={onComplete}
					onCompleteAndPrint={onCompleteAndPrint}
					isSubmitting={isSubmitting}
					canComplete={canComplete}
					canCompleteAndPrint={canCompleteAndPrint}
				/>
			</div>
		</div>
	);
}
