import { Logo } from "@shared/components/Logo";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function Footer() {
	return (
		<footer className="w-full text-black border-t border-black font-mono">
			<div className="flex flex-col lg:flex-row w-full min-h-[500px]">
				
				{/* LEFT COLUMN - Quote */}
				<div className="w-full lg:w-1/2 p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-black flex flex-col justify-center bg-[#F8FAFC]">
					<blockquote className="text-2xl md:text-3xl lg:text-4xl leading-tight font-serif tracking-tight">
						"Whether it's chronic medication, urgent prescriptions, or daily wellness needs, we've got you covered. We match our speed to your urgency, helping you prioritize your health without the hassle."
					</blockquote>
				</div>

				{/* RIGHT COLUMN - Links & Info */}
				<div className="w-full lg:w-1/2 flex flex-col justify-between bg-[#E8F5E9]">
					
					{/* Top Section of Right Column */}
					<div className="p-8 lg:p-16 pb-0">
						<div className="mb-12">
							<p className="text-xl mb-4 font-serif">
								"Questions, comments or want your recipe site to be featured? Email us at:
							</p>
							<a href="mailto:hello@benpharma.com" className="text-xl underline decoration-black decoration-1 underline-offset-4 hover:decoration-2">
								hello@benpharma.com
							</a>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div className="space-y-4">
								<Link href="/discover" className="block text-lg hover:italic transition-all">Discover</Link>
								<Link href="/plus" className="block text-lg hover:italic transition-all">BenPharma Plus</Link>
								<Link href="/about" className="block text-lg hover:italic transition-all">About</Link>
								<Link href="/press" className="block text-lg hover:italic transition-all">Press</Link>
							</div>
							<div className="space-y-4">
								<Link href="#" className="flex items-center gap-2 text-lg hover:italic transition-all">
									<ArrowUpRight className="w-4 h-4" /> Tiktok
								</Link>
								<Link href="#" className="flex items-center gap-2 text-lg hover:italic transition-all">
									<ArrowUpRight className="w-4 h-4" /> Instagram
								</Link>
								<Link href="#" className="flex items-center gap-2 text-lg hover:italic transition-all">
									<ArrowUpRight className="w-4 h-4" /> Discord
								</Link>
								<Link href="#" className="flex items-center gap-2 text-lg hover:italic transition-all">
									<ArrowUpRight className="w-4 h-4" /> Facebook
								</Link>
							</div>
						</div>
					</div>


				</div>
			</div>

			{/* BOTTOM STRIP */}
			<div className="w-full border-t border-black bg-black text-[#F2F0E9] p-4 flex flex-col md:flex-row justify-between items-center text-xs uppercase tracking-wider gap-4">
				<p>© {new Date().getFullYear()} BenPharma Limited. All rights reserved.</p>
				<div className="flex gap-8">
					<Link href="/legal/terms" className="hover:underline">Terms & Conditions</Link>
				</div>
			</div>
		</footer>
	);
}
