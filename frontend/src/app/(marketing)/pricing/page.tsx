import type { Metadata } from 'next';
import MarketingCtaButton from '@/components/marketing/MarketingCtaButton';
import Link from 'next/link';
import { PRICING_FAQ, PRICING_PLAN } from '@/content/marketing/pricing';

export const metadata: Metadata = {
  title: PRICING_PLAN.seo.title,
  description: PRICING_PLAN.seo.description,
};

export default function PricingPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            요금 안내
          </p>
          <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            {PRICING_PLAN.headline}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            {PRICING_PLAN.subcopy}
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border-2 border-blue-600 bg-white p-8 shadow-lg">
            <p className="text-sm font-semibold text-blue-600">학생 구독</p>
            <p className="mt-2 text-4xl font-bold text-gray-900">
              {PRICING_PLAN.studentPlan.priceLabel}
            </p>
            <p className="mt-1 text-sm text-gray-500">{PRICING_PLAN.studentPlan.priceNote}</p>
            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              {PRICING_PLAN.studentPlan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <MarketingCtaButton
                label={PRICING_PLAN.studentPlan.ctaLabel}
                href="/signup"
                variant="primary"
                size="lg"
                className="w-full justify-center"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
            <p className="text-sm font-semibold text-gray-700">매니저 (학부모·선생님)</p>
            <p className="mt-2 text-4xl font-bold text-gray-900">
              {PRICING_PLAN.managerPlan.priceLabel}
            </p>
            <p className="mt-1 text-sm text-gray-500">{PRICING_PLAN.managerPlan.priceNote}</p>
            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              {PRICING_PLAN.managerPlan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <MarketingCtaButton
                label={PRICING_PLAN.managerPlan.ctaLabel}
                href="/signup"
                variant="secondary"
                size="lg"
                className="w-full justify-center"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900">자주 묻는 질문</h2>
          <dl className="mt-8 space-y-6">
            {PRICING_FAQ.map((item) => (
              <div key={item.question}>
                <dt className="font-semibold text-gray-900">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-gray-600">{item.answer}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-sm text-gray-500">
            결제·환불·해지에 관한 자세한 내용은{' '}
            <Link href="/legal/paid-service" className="text-blue-600 hover:underline">
              유료서비스 이용약관
            </Link>
            을 확인해 주세요.
          </p>
        </div>
      </section>
    </>
  );
}
