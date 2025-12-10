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
export const send = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, text }) {
    let formattedOutput = `Sending email to ${to} with subject ${subject}\n\n`;
    formattedOutput += `Text: ${text}\n\n`;
    logger.log(formattedOutput);
});
