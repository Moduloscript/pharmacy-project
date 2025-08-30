import { z } from 'zod';
import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.DbNull;
  if (v === 'JsonNull') return Prisma.JsonNull;
  return v;
};

export const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
);

export type JsonValueType = z.infer<typeof JsonValueSchema>;

export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ toJSON: z.function(z.tuple([]), z.any()) }),
    z.record(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
);

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;

// DECIMAL
//------------------------------------------------------

export const DecimalJsLikeSchema: z.ZodType<Prisma.DecimalJsLike> = z.object({
  d: z.array(z.number()),
  e: z.number(),
  s: z.number(),
  toFixed: z.function(z.tuple([]), z.string()),
})

export const DECIMAL_STRING_REGEX = /^(?:-?Infinity|NaN|-?(?:0[bB][01]+(?:\.[01]+)?(?:[pP][-+]?\d+)?|0[oO][0-7]+(?:\.[0-7]+)?(?:[pP][-+]?\d+)?|0[xX][\da-fA-F]+(?:\.[\da-fA-F]+)?(?:[pP][-+]?\d+)?|(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?))$/;

export const isValidDecimalInput =
  (v?: null | string | number | Prisma.DecimalJsLike): v is string | number | Prisma.DecimalJsLike => {
    if (v === undefined || v === null) return false;
    return (
      (typeof v === 'object' && 'd' in v && 'e' in v && 's' in v && 'toFixed' in v) ||
      (typeof v === 'string' && DECIMAL_STRING_REGEX.test(v)) ||
      typeof v === 'number'
    )
  };

/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const UserScalarFieldEnumSchema = z.enum(['id','name','email','emailVerified','image','createdAt','updatedAt','username','password','role','banned','banReason','banExpires','onboardingComplete','paymentsCustomerId','locale']);

export const SessionScalarFieldEnumSchema = z.enum(['id','expiresAt','ipAddress','userAgent','userId','impersonatedBy','activeOrganizationId','token','createdAt','updatedAt']);

export const AccountScalarFieldEnumSchema = z.enum(['id','accountId','providerId','userId','accessToken','refreshToken','idToken','expiresAt','password','accessTokenExpiresAt','refreshTokenExpiresAt','scope','createdAt','updatedAt']);

export const VerificationScalarFieldEnumSchema = z.enum(['id','identifier','value','expiresAt','createdAt','updatedAt']);

export const PasskeyScalarFieldEnumSchema = z.enum(['id','name','publicKey','userId','credentialID','counter','deviceType','backedUp','transports','createdAt']);

export const OrganizationScalarFieldEnumSchema = z.enum(['id','name','slug','logo','createdAt','metadata','paymentsCustomerId']);

export const MemberScalarFieldEnumSchema = z.enum(['id','organizationId','userId','role','createdAt']);

export const InvitationScalarFieldEnumSchema = z.enum(['id','organizationId','email','role','status','expiresAt','inviterId']);

export const PurchaseScalarFieldEnumSchema = z.enum(['id','organizationId','userId','type','customerId','subscriptionId','productId','status','createdAt','updatedAt']);

export const AiChatScalarFieldEnumSchema = z.enum(['id','organizationId','userId','title','messages','createdAt','updatedAt']);

export const CustomerScalarFieldEnumSchema = z.enum(['id','userId','customerType','phone','address','city','state','lga','country','businessName','businessAddress','pharmacyLicense','taxId','businessPhone','businessEmail','verificationStatus','verificationDocuments','creditLimit','creditTermDays','createdAt','updatedAt']);

export const ProductScalarFieldEnumSchema = z.enum(['id','name','description','category','genericName','brandName','manufacturer','ndcNumber','nafdacNumber','strength','dosageForm','activeIngredient','retailPrice','wholesalePrice','cost','sku','barcode','stockQuantity','minStockLevel','maxStockLevel','packSize','unit','weight','dimensions','isActive','isPrescriptionRequired','isRefrigerated','isControlled','slug','images','imageUrl','tags','hasExpiry','shelfLifeMonths','minOrderQuantity','bulkPricing','createdAt','updatedAt']);

export const CartItemScalarFieldEnumSchema = z.enum(['id','customerId','productId','quantity','unitPrice','createdAt','updatedAt']);

export const OrderScalarFieldEnumSchema = z.enum(['id','orderNumber','customerId','status','deliveryMethod','deliveryAddress','deliveryCity','deliveryState','deliveryLGA','deliveryPhone','deliveryNotes','subtotal','deliveryFee','discount','tax','total','paymentStatus','paymentMethod','paymentReference','purchaseOrderNumber','creditTerms','estimatedDelivery','actualDelivery','internalNotes','createdAt','updatedAt']);

export const OrderItemScalarFieldEnumSchema = z.enum(['id','orderId','productId','quantity','unitPrice','subtotal','productName','productSKU','productDescription','createdAt']);

export const OrderTrackingScalarFieldEnumSchema = z.enum(['id','orderId','status','notes','timestamp','updatedBy']);

export const PaymentScalarFieldEnumSchema = z.enum(['id','customerId','orderId','amount','currency','method','status','gatewayReference','transactionId','gatewayResponse','gatewayFee','appFee','paymentUrl','webhookData','failureReason','retryCount','createdAt','updatedAt','completedAt']);

export const PaymentRetryConfigScalarFieldEnumSchema = z.enum(['id','payment_method','max_retries','retry_delays','enabled','created_at','updated_at']);

export const InventoryMovementScalarFieldEnumSchema = z.enum(['id','productId','type','quantity','reason','reference','previousStock','newStock','batchNumber','expiryDate','userId','notes','createdAt']);

export const NotificationScalarFieldEnumSchema = z.enum(['id','customerId','orderId','type','channel','recipient','subject','message','status','gatewayResponse','retryCount','maxRetries','createdAt','sentAt','deliveredAt']);

export const DocumentScalarFieldEnumSchema = z.enum(['id','userId','organizationId','name','key','mimeType','size','bucket','createdAt']);

export const NigerianLocationScalarFieldEnumSchema = z.enum(['id','state','lga','zone','created_at']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const NullableJsonNullValueInputSchema = z.enum(['DbNull','JsonNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value);

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.JsonNull : value === 'AnyNull' ? Prisma.AnyNull : value);

export const PurchaseTypeSchema = z.enum(['SUBSCRIPTION','ONE_TIME']);

export type PurchaseTypeType = `${z.infer<typeof PurchaseTypeSchema>}`

export const CustomerTypeSchema = z.enum(['RETAIL','WHOLESALE','ADMIN']);

export type CustomerTypeType = `${z.infer<typeof CustomerTypeSchema>}`

export const ProductCategorySchema = z.enum(['PAIN_RELIEF','ANTIBIOTICS','VITAMINS','SUPPLEMENTS','BABY_CARE','FIRST_AID','DIABETES_CARE','HEART_HEALTH','RESPIRATORY','DIGESTIVE','SKIN_CARE','EYE_CARE','CONTRACEPTIVES','PRESCRIPTION','OTHER']);

export type ProductCategoryType = `${z.infer<typeof ProductCategorySchema>}`

export const OrderStatusSchema = z.enum(['RECEIVED','PROCESSING','READY','DISPATCHED','DELIVERED','CANCELLED','REFUNDED']);

export type OrderStatusType = `${z.infer<typeof OrderStatusSchema>}`

export const PaymentStatusSchema = z.enum(['PENDING','PROCESSING','COMPLETED','FAILED','REFUNDED','CANCELLED']);

export type PaymentStatusType = `${z.infer<typeof PaymentStatusSchema>}`

export const PaymentMethodSchema = z.enum(['FLUTTERWAVE','OPAY','PAYSTACK','CASH_ON_DELIVERY','BANK_TRANSFER']);

export type PaymentMethodType = `${z.infer<typeof PaymentMethodSchema>}`

export const DeliveryMethodSchema = z.enum(['STANDARD','EXPRESS','PICKUP']);

export type DeliveryMethodType = `${z.infer<typeof DeliveryMethodSchema>}`

export const BusinessVerificationStatusSchema = z.enum(['PENDING','VERIFIED','REJECTED','EXPIRED']);

export type BusinessVerificationStatusType = `${z.infer<typeof BusinessVerificationStatusSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  username: z.string().nullable(),
  password: z.string().nullable(),
  role: z.string().nullable(),
  banned: z.boolean().nullable(),
  banReason: z.string().nullable(),
  banExpires: z.coerce.date().nullable(),
  onboardingComplete: z.boolean(),
  paymentsCustomerId: z.string().nullable(),
  locale: z.string().nullable(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const SessionSchema = z.object({
  id: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  userId: z.string(),
  impersonatedBy: z.string().nullable(),
  activeOrganizationId: z.string().nullable(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Session = z.infer<typeof SessionSchema>

/////////////////////////////////////////
// ACCOUNT SCHEMA
/////////////////////////////////////////

export const AccountSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  userId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  idToken: z.string().nullable(),
  expiresAt: z.coerce.date().nullable(),
  password: z.string().nullable(),
  accessTokenExpiresAt: z.coerce.date().nullable(),
  refreshTokenExpiresAt: z.coerce.date().nullable(),
  scope: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Account = z.infer<typeof AccountSchema>

/////////////////////////////////////////
// VERIFICATION SCHEMA
/////////////////////////////////////////

export const VerificationSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type Verification = z.infer<typeof VerificationSchema>

/////////////////////////////////////////
// PASSKEY SCHEMA
/////////////////////////////////////////

export const PasskeySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  publicKey: z.string(),
  userId: z.string(),
  credentialID: z.string(),
  counter: z.number().int(),
  deviceType: z.string(),
  backedUp: z.boolean(),
  transports: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
})

export type Passkey = z.infer<typeof PasskeySchema>

/////////////////////////////////////////
// ORGANIZATION SCHEMA
/////////////////////////////////////////

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  logo: z.string().nullable(),
  createdAt: z.coerce.date(),
  metadata: z.string().nullable(),
  paymentsCustomerId: z.string().nullable(),
})

export type Organization = z.infer<typeof OrganizationSchema>

/////////////////////////////////////////
// MEMBER SCHEMA
/////////////////////////////////////////

export const MemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: z.string(),
  createdAt: z.coerce.date(),
})

export type Member = z.infer<typeof MemberSchema>

/////////////////////////////////////////
// INVITATION SCHEMA
/////////////////////////////////////////

export const InvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  status: z.string(),
  expiresAt: z.coerce.date(),
  inviterId: z.string(),
})

export type Invitation = z.infer<typeof InvitationSchema>

/////////////////////////////////////////
// PURCHASE SCHEMA
/////////////////////////////////////////

export const PurchaseSchema = z.object({
  type: PurchaseTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string().nullable(),
  userId: z.string().nullable(),
  customerId: z.string(),
  subscriptionId: z.string().nullable(),
  productId: z.string(),
  status: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Purchase = z.infer<typeof PurchaseSchema>

/////////////////////////////////////////
// AI CHAT SCHEMA
/////////////////////////////////////////

export const AiChatSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().nullable(),
  userId: z.string().nullable(),
  title: z.string().nullable(),
  /**
   * [AIChatMessages]
   */
  messages: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type AiChat = z.infer<typeof AiChatSchema>

/////////////////////////////////////////
// CUSTOMER SCHEMA
/////////////////////////////////////////

export const CustomerSchema = z.object({
  customerType: CustomerTypeSchema,
  verificationStatus: BusinessVerificationStatusSchema,
  id: z.string().cuid(),
  userId: z.string(),
  phone: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  lga: z.string().nullable(),
  country: z.string(),
  businessName: z.string().nullable(),
  businessAddress: z.string().nullable(),
  pharmacyLicense: z.string().nullable(),
  taxId: z.string().nullable(),
  businessPhone: z.string().nullable(),
  businessEmail: z.string().nullable(),
  verificationDocuments: z.string().nullable(),
  creditLimit: z.instanceof(Prisma.Decimal, { message: "Field 'creditLimit' must be a Decimal. Location: ['Models', 'Customer']"}).nullable(),
  creditTermDays: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Customer = z.infer<typeof CustomerSchema>

/////////////////////////////////////////
// PRODUCT SCHEMA
/////////////////////////////////////////

export const ProductSchema = z.object({
  category: ProductCategorySchema,
  id: z.string().cuid(),
  name: z.string(),
  description: z.string().nullable(),
  genericName: z.string().nullable(),
  brandName: z.string().nullable(),
  manufacturer: z.string().nullable(),
  ndcNumber: z.string().nullable(),
  nafdacNumber: z.string().nullable(),
  strength: z.string().nullable(),
  dosageForm: z.string().nullable(),
  activeIngredient: z.string().nullable(),
  retailPrice: z.instanceof(Prisma.Decimal, { message: "Field 'retailPrice' must be a Decimal. Location: ['Models', 'Product']"}),
  wholesalePrice: z.instanceof(Prisma.Decimal, { message: "Field 'wholesalePrice' must be a Decimal. Location: ['Models', 'Product']"}).nullable(),
  cost: z.instanceof(Prisma.Decimal, { message: "Field 'cost' must be a Decimal. Location: ['Models', 'Product']"}).nullable(),
  sku: z.string(),
  barcode: z.string().nullable(),
  stockQuantity: z.number().int(),
  minStockLevel: z.number().int(),
  maxStockLevel: z.number().int().nullable(),
  packSize: z.string().nullable(),
  unit: z.string(),
  weight: z.instanceof(Prisma.Decimal, { message: "Field 'weight' must be a Decimal. Location: ['Models', 'Product']"}).nullable(),
  dimensions: z.string().nullable(),
  isActive: z.boolean(),
  isPrescriptionRequired: z.boolean(),
  isRefrigerated: z.boolean(),
  isControlled: z.boolean(),
  slug: z.string(),
  images: JsonValueSchema.nullable(),
  imageUrl: z.string().nullable(),
  tags: z.string().nullable(),
  hasExpiry: z.boolean(),
  shelfLifeMonths: z.number().int().nullable(),
  minOrderQuantity: z.number().int(),
  bulkPricing: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Product = z.infer<typeof ProductSchema>

/////////////////////////////////////////
// CART ITEM SCHEMA
/////////////////////////////////////////

export const CartItemSchema = z.object({
  id: z.string().cuid(),
  customerId: z.string(),
  productId: z.string(),
  quantity: z.number().int(),
  unitPrice: z.instanceof(Prisma.Decimal, { message: "Field 'unitPrice' must be a Decimal. Location: ['Models', 'CartItem']"}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CartItem = z.infer<typeof CartItemSchema>

/////////////////////////////////////////
// ORDER SCHEMA
/////////////////////////////////////////

export const OrderSchema = z.object({
  status: OrderStatusSchema,
  deliveryMethod: DeliveryMethodSchema,
  paymentStatus: PaymentStatusSchema,
  paymentMethod: PaymentMethodSchema.nullable(),
  id: z.string().cuid(),
  orderNumber: z.string(),
  customerId: z.string(),
  deliveryAddress: z.string(),
  deliveryCity: z.string(),
  deliveryState: z.string(),
  deliveryLGA: z.string().nullable(),
  deliveryPhone: z.string(),
  deliveryNotes: z.string().nullable(),
  subtotal: z.instanceof(Prisma.Decimal, { message: "Field 'subtotal' must be a Decimal. Location: ['Models', 'Order']"}),
  deliveryFee: z.instanceof(Prisma.Decimal, { message: "Field 'deliveryFee' must be a Decimal. Location: ['Models', 'Order']"}),
  discount: z.instanceof(Prisma.Decimal, { message: "Field 'discount' must be a Decimal. Location: ['Models', 'Order']"}),
  tax: z.instanceof(Prisma.Decimal, { message: "Field 'tax' must be a Decimal. Location: ['Models', 'Order']"}),
  total: z.instanceof(Prisma.Decimal, { message: "Field 'total' must be a Decimal. Location: ['Models', 'Order']"}),
  paymentReference: z.string().nullable(),
  purchaseOrderNumber: z.string().nullable(),
  creditTerms: z.boolean(),
  estimatedDelivery: z.coerce.date().nullable(),
  actualDelivery: z.coerce.date().nullable(),
  internalNotes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Order = z.infer<typeof OrderSchema>

/////////////////////////////////////////
// ORDER ITEM SCHEMA
/////////////////////////////////////////

export const OrderItemSchema = z.object({
  id: z.string().cuid(),
  orderId: z.string(),
  productId: z.string(),
  quantity: z.number().int(),
  unitPrice: z.instanceof(Prisma.Decimal, { message: "Field 'unitPrice' must be a Decimal. Location: ['Models', 'OrderItem']"}),
  subtotal: z.instanceof(Prisma.Decimal, { message: "Field 'subtotal' must be a Decimal. Location: ['Models', 'OrderItem']"}),
  productName: z.string(),
  productSKU: z.string(),
  productDescription: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type OrderItem = z.infer<typeof OrderItemSchema>

/////////////////////////////////////////
// ORDER TRACKING SCHEMA
/////////////////////////////////////////

export const OrderTrackingSchema = z.object({
  status: OrderStatusSchema,
  id: z.string().cuid(),
  orderId: z.string(),
  notes: z.string().nullable(),
  timestamp: z.coerce.date(),
  updatedBy: z.string().nullable(),
})

export type OrderTracking = z.infer<typeof OrderTrackingSchema>

/////////////////////////////////////////
// PAYMENT SCHEMA
/////////////////////////////////////////

export const PaymentSchema = z.object({
  method: PaymentMethodSchema,
  status: PaymentStatusSchema,
  id: z.string().cuid(),
  customerId: z.string(),
  orderId: z.string().nullable(),
  amount: z.instanceof(Prisma.Decimal, { message: "Field 'amount' must be a Decimal. Location: ['Models', 'Payment']"}),
  currency: z.string(),
  gatewayReference: z.string().nullable(),
  transactionId: z.string().nullable(),
  gatewayResponse: z.string().nullable(),
  gatewayFee: z.instanceof(Prisma.Decimal, { message: "Field 'gatewayFee' must be a Decimal. Location: ['Models', 'Payment']"}).nullable(),
  appFee: z.instanceof(Prisma.Decimal, { message: "Field 'appFee' must be a Decimal. Location: ['Models', 'Payment']"}).nullable(),
  paymentUrl: z.string().nullable(),
  webhookData: z.string().nullable(),
  failureReason: z.string().nullable(),
  retryCount: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
})

export type Payment = z.infer<typeof PaymentSchema>

/////////////////////////////////////////
// PAYMENT RETRY CONFIG SCHEMA
/////////////////////////////////////////

/**
 * Mirrors existing table `payment_retry_config` in the remote DB to avoid destructive drops
 */
export const PaymentRetryConfigSchema = z.object({
  id: z.number().int(),
  payment_method: z.string(),
  max_retries: z.number().int(),
  retry_delays: z.number().int().array(),
  enabled: z.boolean().nullable(),
  created_at: z.coerce.date().nullable(),
  updated_at: z.coerce.date().nullable(),
})

export type PaymentRetryConfig = z.infer<typeof PaymentRetryConfigSchema>

/////////////////////////////////////////
// INVENTORY MOVEMENT SCHEMA
/////////////////////////////////////////

export const InventoryMovementSchema = z.object({
  id: z.string().cuid(),
  productId: z.string(),
  type: z.string(),
  quantity: z.number().int(),
  reason: z.string().nullable(),
  reference: z.string().nullable(),
  previousStock: z.number().int(),
  newStock: z.number().int(),
  batchNumber: z.string().nullable(),
  expiryDate: z.coerce.date().nullable(),
  userId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type InventoryMovement = z.infer<typeof InventoryMovementSchema>

/////////////////////////////////////////
// NOTIFICATION SCHEMA
/////////////////////////////////////////

export const NotificationSchema = z.object({
  id: z.string().cuid(),
  customerId: z.string().nullable(),
  orderId: z.string().nullable(),
  type: z.string(),
  channel: z.string(),
  recipient: z.string(),
  subject: z.string().nullable(),
  message: z.string(),
  status: z.string(),
  gatewayResponse: z.string().nullable(),
  retryCount: z.number().int(),
  maxRetries: z.number().int(),
  createdAt: z.coerce.date(),
  sentAt: z.coerce.date().nullable(),
  deliveredAt: z.coerce.date().nullable(),
})

export type Notification = z.infer<typeof NotificationSchema>

/////////////////////////////////////////
// DOCUMENT SCHEMA
/////////////////////////////////////////

export const DocumentSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().nullable(),
  organizationId: z.string().nullable(),
  name: z.string(),
  key: z.string(),
  mimeType: z.string().nullable(),
  size: z.number().int(),
  bucket: z.string(),
  createdAt: z.coerce.date(),
})

export type Document = z.infer<typeof DocumentSchema>

/////////////////////////////////////////
// NIGERIAN LOCATION SCHEMA
/////////////////////////////////////////

export const NigerianLocationSchema = z.object({
  id: z.string(),
  state: z.string(),
  lga: z.string(),
  zone: z.string().nullable(),
  created_at: z.coerce.date().nullable(),
})

export type NigerianLocation = z.infer<typeof NigerianLocationSchema>
