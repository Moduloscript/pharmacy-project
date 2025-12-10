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
const { from } = config.mails;
// biome-ignore lint/correctness/noUnusedFunctionParameters: This is to understand the available parameters
export const send = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, text, html }) {
    // handle your custom email sending logic here
});
