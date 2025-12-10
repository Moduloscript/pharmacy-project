var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { render } from "@react-email/render";
import { getMessagesForLocale } from "@repo/i18n";
import { mailTemplates } from "../../emails";
export function getTemplate(_a) {
    return __awaiter(this, arguments, void 0, function* ({ templateId, context, locale, }) {
        const template = mailTemplates[templateId];
        const translations = yield getMessagesForLocale(locale);
        const email = template(Object.assign(Object.assign({}, context), { locale,
            translations }));
        const subject = "subject" in translations.mail[templateId]
            ? translations.mail[templateId].subject
            : "";
        const html = yield render(email);
        const text = yield render(email, { plainText: true });
        return { html, text, subject };
    });
}
