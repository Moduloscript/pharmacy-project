"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useNewsletterSignupMutation } from "@marketing/home/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { CheckCircleIcon, KeyIcon } from "lucide-react";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
	email: z.string().email(),
});
type FormValues = z.infer<typeof formSchema>;

export function Newsletter() {
	const t = useTranslations();
	const newsletterSignupMutation = useNewsletterSignupMutation();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
	});

	const onSubmit = form.handleSubmit(async ({ email }) => {
		try {
			await newsletterSignupMutation.mutateAsync({ email });
		} catch {
			form.setError("email", {
				message: t("newsletter.hints.error.message"),
			});
		}
	});

	return (
		<section className="py-24 bg-black text-white border-y-[6px] border-black">
			<div className="container">
				<div className="mb-12 text-center">
					<KeyIcon className="mx-auto mb-6 size-10 text-[#4A90E2]" />
					<h1 className="font-black text-4xl lg:text-6xl tracking-tighter uppercase mb-4">
						UNLOCK BETTER HEALTH
					</h1>
					<p className="text-xl text-white/70 max-w-2xl mx-auto font-mono">
						Join BenPharma Plus for exclusive wellness tips, early access to new supplements, and expert pharmacy insights delivered to your inbox.
					</p>
				</div>

				<div className="mx-auto max-w-xl">
					{form.formState.isSubmitSuccessful ? (
						<Alert variant="success" className="bg-[#CCFF00] text-black border-black border-2">
							<CheckCircleIcon className="size-6" />
							<AlertTitle className="font-bold">
								Success!
							</AlertTitle>
							<AlertDescription>
								You've been added to the list.
							</AlertDescription>
						</Alert>
					) : (
						<form onSubmit={onSubmit} className="relative">
							<div className="flex flex-col sm:flex-row gap-4">
								<Input
									type="email"
									required
									placeholder="Enter your email address"
									{...form.register("email")}
									className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-14 text-lg font-mono focus-visible:ring-[#CCFF00] focus-visible:border-[#CCFF00]"
								/>

								<Button
									type="submit"
									size="lg"
									className="h-14 bg-[#CCFF00] text-black hover:bg-[#bbe000] font-black uppercase tracking-wider text-base px-8 border-2 border-transparent hover:border-white transition-all min-w-[140px]"
									loading={form.formState.isSubmitting}
								>
									JOIN NOW
								</Button>
							</div>
							{form.formState.errors.email && (
								<p className="mt-2 text-red-500 text-sm font-mono flex items-center gap-2">
                                    <span className="inline-block size-2 bg-red-500 rounded-full" />
									{form.formState.errors.email.message}
								</p>
							)}
						</form>
					)}
				</div>
			</div>
		</section>
	);
}
