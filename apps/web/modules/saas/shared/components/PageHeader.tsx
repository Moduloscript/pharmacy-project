"use client";

export function PageHeader({
	title,
	subtitle,
}: {
	title: string;
	subtitle?: string;
}) {
	return (
		<div className="mb-6 px-5 py-4 bg-[#E6E0FF] dark:bg-[#8B83F6]/20 border border-[#8B83F6]/30 rounded-sm">
			<p className="text-xs font-bold uppercase tracking-widest text-[#8B83F6] dark:text-[#8B83F6]">
				{subtitle}
			</p>
			<h1 className="font-bold text-2xl md:text-3xl text-black dark:text-white mt-1">
				{title}
			</h1>
		</div>
	);
}
