import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/layout/site-page';
import { env } from '@/lib/env';
import { FLEDGE_SUPPORT_EMAIL, POLICY_LAST_UPDATED } from '@/lib/public-info';

export const metadata: Metadata = {
  title: `Cancellation & Refunds — ${env.NEXT_PUBLIC_APP_NAME}`,
  description:
    'How cancellations, refunds, and duplicate or failed payments are handled for payments collected by Fledge.',
};

export default function RefundsPage() {
  return (
    <SitePage
      title="Cancellation & Refund Policy"
      description={`Effective ${POLICY_LAST_UPDATED}. This policy covers payments collected by Fledge through the Fledge website and app.`}
    >
      <div
        role="note"
        className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-foreground"
      >
        <p className="font-semibold">The short version</p>
        <p className="mt-1 text-muted-foreground">
          Donations are voluntary and normally non-refundable. If you were charged twice, charged the
          wrong amount, or a payment was not authorised, write to us within 7 days with the payment
          reference and we will refund it to the original payment method.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">1. What this policy covers</h2>
        <p>
          Payments that Fledge itself collects through this website and app — currently optional
          contributions on the{' '}
          <Link href="/donate" className="font-medium text-primary hover:underline">
            Donate
          </Link>{' '}
          page. Rent, deposits, tokens, and any brokerage or service fee you pay directly to a
          landlord, partner, or broker are between you and them; Fledge does not collect, hold, or
          escrow those amounts and cannot refund them.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">
          2. Donations are voluntary
        </h2>
        <p>
          A donation supports Fledge&apos;s running costs. It is not a purchase of a product or
          service, and it does not buy ranking, visibility, verification, moderation outcomes,
          priority support, or a better housing outcome. Treat a completed donation as final — except
          for the error cases below.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">
          3. Cancelling a monthly donation
        </h2>
        <p>
          A recurring donation can be cancelled at any time. Email{' '}
          <a
            href={`mailto:${FLEDGE_SUPPORT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {FLEDGE_SUPPORT_EMAIL}
          </a>{' '}
          with the subject “Cancel monthly donation” from your registered email, or cancel the
          Razorpay subscription&apos;s UPI Autopay / e-mandate approval in your bank or UPI app. We
          stop future charges as soon as the request is received. The charge already made is not
          reversed unless it falls under the error cases below.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">4. Refunds we process</h2>
        <p>
          We refund these cases after verification with Razorpay and the bank: a duplicate charge; an
          amount different from what was confirmed; a payment made without your authorisation; or a
          charge where checkout could not be confirmed as completed. Write to{' '}
          <a
            href={`mailto:${FLEDGE_SUPPORT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {FLEDGE_SUPPORT_EMAIL}
          </a>{' '}
          within 7 days of the charge with the Razorpay payment reference (or the date, amount, and
          last digits of the payment method) so we can trace it.
        </p>
        <p>
          Approved refunds are initiated through Razorpay to the original payment method. Please
          allow 5–7 working days for the credit to appear; bank and card timelines can vary.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">5. What we cannot refund</h2>
        <p>
          A completed voluntary donation outside the error cases above; a request that we cannot
          match to a traceable transaction; and a refund to a different card, account, or person than
          the one used for the payment. Where a refund is not possible under this policy we will say
          so clearly and explain why.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">
          6. Bank disputes and unauthorised payments
        </h2>
        <p>
          If you believe a payment was made without your authorisation, contact us and your bank or
          card issuer promptly. We cooperate with Razorpay and the bank&apos;s investigation and
          provide the transaction records needed for it.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">7. Contact and changes</h2>
        <p>
          Questions or requests can be sent to{' '}
          <a
            href={`mailto:${FLEDGE_SUPPORT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {FLEDGE_SUPPORT_EMAIL}
          </a>{' '}
          or through the{' '}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            contact page
          </Link>
          . We may update this policy when the product or legal requirements change; the effective
          date above identifies the current version.
        </p>
      </section>
    </SitePage>
  );
}
