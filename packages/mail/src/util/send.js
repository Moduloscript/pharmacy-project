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
import { send } from "../provider";
import { getTemplate } from "./templates";
export function sendEmail(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { to, locale = config.i18n.defaultLocale } = params;
        let html;
        let text;
        let subject;
        if ("templateId" in params) {
            const { templateId, context } = params;
            const template = yield getTemplate({
                templateId,
                context,
                locale,
            });
            subject = template.subject;
            text = template.text;
            html = template.html;
        }
        else {
            subject = params.subject;
            text = (_a = params.text) !== null && _a !== void 0 ? _a : "";
            html = (_b = params.html) !== null && _b !== void 0 ? _b : "";
        }
        try {
            yield send({
                to,
                subject,
                text,
                html,
            });
            return true;
        }
        catch (e) {
            // Ensure we pass a string to the logger
            logger.error(e instanceof Error ? e.message : String(e));
            return false;
        }
    });
}
