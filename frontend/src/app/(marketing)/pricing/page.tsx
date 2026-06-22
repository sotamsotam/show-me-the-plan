import type { Metadata } from 'next';

import MarketingCtaButton from '@/components/marketing/MarketingCtaButton';

import { MarketingSection } from '@/components/marketing/MarketingSection';

import FaqSection from '@/components/marketing/sections/FaqSection';

import Link from 'next/link';

import { PRICING_FAQ, PRICING_PLAN } from '@/content/marketing/pricing';



export const metadata: Metadata = {

  title: PRICING_PLAN.seo.title,

  description: PRICING_PLAN.seo.description,

};



export default function PricingPage() {

  return (

    <>

      <section className="mkt-hero-bg px-4 py-16 sm:px-6 sm:py-20">

        <div className="mx-auto max-w-3xl text-center">

          <p className="mkt-eyebrow mb-2">요금 안내</p>

          <h1 className="mkt-h1">{PRICING_PLAN.headline}</h1>

          <p className="mkt-lead mt-4">{PRICING_PLAN.subcopy}</p>

        </div>

      </section>



      <MarketingSection variant="accent-tint">

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">

          <div className="mkt-card-elevated relative overflow-hidden p-8 ring-2 ring-mkt-accent">

            <p className="text-sm font-bold text-mkt-accent">학생 구독</p>

            <p className="mt-2 text-4xl font-bold text-mkt-text">

              {PRICING_PLAN.studentPlan.priceLabel}

            </p>

            <p className="mt-1 text-sm text-mkt-text-subtle">

              {PRICING_PLAN.studentPlan.priceNote}

            </p>

            <ul className="mt-6 space-y-3 text-sm text-mkt-text-muted">

              {PRICING_PLAN.studentPlan.features.map((feature) => (

                <li key={feature} className="flex gap-2">

                  <span className="font-bold text-mkt-accent">✓</span>

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



          <div className="mkt-card-primary p-8">

            <p className="text-sm font-bold text-mkt-text-muted">매니저 (학부모·선생님)</p>

            <p className="mt-2 text-4xl font-bold text-mkt-text">

              {PRICING_PLAN.managerPlan.priceLabel}

            </p>

            <p className="mt-1 text-sm text-mkt-text-subtle">

              {PRICING_PLAN.managerPlan.priceNote}

            </p>

            <ul className="mt-6 space-y-3 text-sm text-mkt-text-muted">

              {PRICING_PLAN.managerPlan.features.map((feature) => (

                <li key={feature} className="flex gap-2">

                  <span className="font-bold text-mkt-primary">✓</span>

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

      </MarketingSection>



      <FaqSection

        title="자주 묻는 질문"

        items={[...PRICING_FAQ]}

        variant="default"

        footnote={

          <>

            결제·환불·해지에 관한 자세한 내용은{' '}

            <Link href="/legal/paid-service" className="font-semibold text-mkt-accent hover:underline">

              유료서비스 이용약관

            </Link>

            을 확인해 주세요.

          </>

        }

      />

    </>

  );

}

