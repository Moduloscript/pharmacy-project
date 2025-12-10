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
import nodemailer from "nodemailer";
const { from } = config.mails;
export const send = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, text, html }) {
    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number.parseInt(process.env.MAIL_PORT, 10),
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });
    yield transporter.sendMail({
        to,
        from,
        subject,
        text,
        html,
    });
});
