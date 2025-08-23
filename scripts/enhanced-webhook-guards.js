"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePaymentAmounts = validatePaymentAmounts;
exports.processPaymentWebhookWithValidation = processPaymentWebhookWithValidation;
var database_1 = require("@repo/database");
/**
 * Enhanced webhook payment validation with amount guardrails
 * This function should be called before marking any payment as COMPLETED
 */
function validatePaymentAmounts(paymentId_1, gatewayAmount_1, orderId_1) {
    return __awaiter(this, arguments, void 0, function (paymentId, gatewayAmount, orderId, currency) {
        var payment, linkedOrder, orderTotal, paymentAmount, gatewayAmountNormalized, orderPaymentDiff, orderGatewayDiff, paymentGatewayDiff, ratio, error_1;
        if (currency === void 0) { currency = 'NGN'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, database_1.db.payment.findUnique({
                            where: { id: paymentId },
                            include: {
                                order: {
                                    select: { id: true, total: true }
                                }
                            }
                        })];
                case 1:
                    payment = _a.sent();
                    if (!payment) {
                        return [2 /*return*/, { isValid: false, reason: 'Payment not found' }];
                    }
                    linkedOrder = payment.order;
                    if (!linkedOrder) {
                        // If no order linked, we can't validate
                        return [2 /*return*/, { isValid: true }];
                    }
                    orderTotal = parseFloat(linkedOrder.total.toString());
                    paymentAmount = parseFloat(payment.amount.toString());
                    gatewayAmountNormalized = normalizeAmount(gatewayAmount, currency);
                    orderPaymentDiff = Math.abs(orderTotal - paymentAmount);
                    orderGatewayDiff = Math.abs(orderTotal - gatewayAmountNormalized);
                    paymentGatewayDiff = Math.abs(paymentAmount - gatewayAmountNormalized);
                    console.log('Payment Amount Validation:', {
                        paymentId: paymentId,
                        paymentAmount: paymentAmount,
                        orderTotal: orderTotal,
                        gatewayAmountRaw: gatewayAmount,
                        gatewayAmountNormalized: gatewayAmountNormalized,
                        orderPaymentDiff: orderPaymentDiff,
                        orderGatewayDiff: orderGatewayDiff,
                        paymentGatewayDiff: paymentGatewayDiff
                    });
                    if (!(orderGatewayDiff >= 1.0)) return [3 /*break*/, 3];
                    ratio = orderTotal / gatewayAmountNormalized;
                    if (ratio >= 99 && ratio <= 101) {
                        console.warn('Detected 100x amount mismatch, using order total as correct amount');
                        return [2 /*return*/, {
                                isValid: true,
                                correctedAmount: orderTotal,
                                reason: "Auto-corrected 100x factor mismatch: gateway=".concat(gatewayAmountNormalized, ", order=").concat(orderTotal)
                            }];
                    }
                    // Log the mismatch for audit
                    return [4 /*yield*/, logAmountMismatch(paymentId, {
                            paymentAmount: paymentAmount,
                            orderTotal: orderTotal,
                            gatewayAmount: gatewayAmountNormalized,
                            reason: 'Gateway amount does not match order total'
                        })];
                case 2:
                    // Log the mismatch for audit
                    _a.sent();
                    return [2 /*return*/, {
                            isValid: false,
                            reason: "Amount mismatch: order total \u20A6".concat(orderTotal, " vs gateway \u20A6").concat(gatewayAmountNormalized)
                        }];
                case 3: return [2 /*return*/, { isValid: true }];
                case 4:
                    error_1 = _a.sent();
                    console.error('Payment validation error:', error_1);
                    return [2 /*return*/, { isValid: false, reason: 'Validation error occurred' }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Normalize amount from gateway (handles kobo/naira conversion)
 */
function normalizeAmount(amount, currency) {
    if (currency === 'NGN') {
        // If amount is in kobo (very large number), convert to naira
        if (amount > 100000) { // Assume amounts > 100k are in kobo
            return amount / 100;
        }
    }
    return amount;
}
/**
 * Log amount mismatches for audit trail
 */
function logAmountMismatch(paymentId, details) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.error('PAYMENT AMOUNT MISMATCH DETECTED:', __assign(__assign({ paymentId: paymentId }, details), { timestamp: new Date().toISOString() }));
                    // Also log to database via raw SQL for audit
                    return [4 /*yield*/, database_1.db.$executeRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      INSERT INTO public.payment_mismatch_audit \n      (payment_id, payment_amount, order_amount, mismatch_ratio, reason) \n      VALUES (\n        ", ", \n        ", ", \n        ", ", \n        ", ", \n        ", "\n      )\n    "], ["\n      INSERT INTO public.payment_mismatch_audit \n      (payment_id, payment_amount, order_amount, mismatch_ratio, reason) \n      VALUES (\n        ", ", \n        ", ", \n        ", ", \n        ", ", \n        ", "\n      )\n    "])), paymentId, details.paymentAmount, details.orderTotal, details.orderTotal / details.paymentAmount, details.reason)];
                case 1:
                    // Also log to database via raw SQL for audit
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('Failed to log amount mismatch:', error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Enhanced webhook handler wrapper that includes amount validation
 */
function processPaymentWebhookWithValidation(paymentId, gatewayData) {
    return __awaiter(this, void 0, void 0, function () {
        var validation, updateData, payment;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, validatePaymentAmounts(paymentId, gatewayData.amount, undefined, gatewayData.currency)];
                case 1:
                    validation = _a.sent();
                    if (!!validation.isValid) return [3 /*break*/, 3];
                    console.error('Payment webhook blocked due to amount mismatch:', validation.reason);
                    // Update payment with failure reason instead of marking as completed
                    return [4 /*yield*/, database_1.db.payment.update({
                            where: { id: paymentId },
                            data: {
                                status: 'FAILED',
                                failureReason: "Amount validation failed: ".concat(validation.reason),
                                updatedAt: new Date()
                            }
                        })];
                case 2:
                    // Update payment with failure reason instead of marking as completed
                    _a.sent();
                    return [2 /*return*/, { success: false, reason: validation.reason }];
                case 3:
                    updateData = {
                        status: 'COMPLETED',
                        completedAt: new Date(),
                        updatedAt: new Date(),
                        gatewayResponse: JSON.stringify(gatewayData)
                    };
                    if (validation.correctedAmount) {
                        updateData.amount = validation.correctedAmount;
                        updateData.failureReason = validation.reason; // Log the correction reason
                    }
                    return [4 /*yield*/, database_1.db.payment.update({
                            where: { id: paymentId },
                            data: updateData
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, database_1.db.payment.findUnique({
                            where: { id: paymentId },
                            select: { orderId: true }
                        })];
                case 5:
                    payment = _a.sent();
                    if (!(payment === null || payment === void 0 ? void 0 : payment.orderId)) return [3 /*break*/, 7];
                    return [4 /*yield*/, database_1.db.order.update({
                            where: { id: payment.orderId },
                            data: {
                                paymentStatus: 'COMPLETED',
                                status: 'PROCESSING',
                                updatedAt: new Date()
                            }
                        })];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [2 /*return*/, { success: true }];
            }
        });
    });
}
var templateObject_1;
