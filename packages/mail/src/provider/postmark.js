var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { config } from "@repo/config";
import { logger } from "@repo/logs";
const { from } = config.mails;
export const send = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, html }) {
    const response = yield fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": process.env
                .POSTMARK_SERVER_TOKEN,
        },
        body: JSON.stringify({
            From: from,
            To: to,
            Subject: subject,
            HtmlBody: html,
            MessageStream: "outbound",
        }),
    });
    if (!response.ok) {
        logger.error(yield response.json());
        throw new Error("Could not send email");
    }
});
