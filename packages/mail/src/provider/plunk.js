var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { logger } from "@repo/logs";
export const send = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, html, text }) {
    const response = yield fetch("https://api.useplunk.com/v1/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PLUNK_API_KEY}`,
        },
        body: JSON.stringify({
            to,
            subject,
            body: html,
            text,
        }),
    });
    if (!response.ok) {
        logger.error(yield response.json());
        throw new Error("Could not send email");
    }
});
