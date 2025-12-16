import { Marquee } from "@/components/ui/marquee";
import { FaqSection } from "@marketing/home/components/FaqSection";
import { TestimonialsCarousel } from "@marketing/home/components/TestimonialsCarousel";
import { Features } from "@marketing/home/components/Features";
import { Hero } from "@marketing/home/components/Hero";
import { Newsletter } from "@marketing/home/components/Newsletter";
import { PricingSection } from "@marketing/home/components/PricingSection";
import { setRequestLocale } from "next-intl/server";

export default async function Home({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);

	return (

		<>
			<Hero />
			<Features />
			<TestimonialsCarousel />
			<PricingSection />
      <div className="w-full border-y-[6px] border-black bg-[#CCFF00] overflow-hidden">
        <Marquee direction="right" className="[--duration:20s] py-3 md:py-5" innerClassName="items-center">
           <span className="text-3xl font-black font-mono uppercase tracking-tighter text-black md:text-5xl px-4">Questions — FAQ — Help Center — Support</span>
           <span className="text-3xl font-black font-mono uppercase tracking-tighter text-black md:text-5xl px-4" aria-hidden="true">★</span>
           <span className="text-3xl font-black font-mono uppercase tracking-tighter text-black md:text-5xl px-4">Questions — FAQ — Help Center — Support</span>
           <span className="text-3xl font-black font-mono uppercase tracking-tighter text-black md:text-5xl px-4" aria-hidden="true">★</span>
        </Marquee>
      </div>
			<FaqSection />
			<Newsletter />
		</>
	);
}
