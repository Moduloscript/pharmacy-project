import { Button } from "@react-email/components";
import React from "react";
export default function PrimaryButton({ href, children, }) {
    return (<Button href={href} className="rounded-full bg-primary px-4 py-2 text-lg text-primary-foreground">
			{children}
		</Button>);
}
