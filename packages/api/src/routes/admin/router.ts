import { Hono } from "hono";
import { organizationRouter } from "./organizations";
import { userRouter } from "./users";
import { dashboardRouter } from "./dashboard";
import { ordersRouter } from "./orders";
import { customersRouter } from "./customers";
import { inventoryRouter } from "./inventory";
import { productsRouter } from "./products";

export const adminRouter = new Hono()
	.basePath("/admin")
	.route("/", organizationRouter)
	.route("/", userRouter)
	.route("/dashboard", dashboardRouter)
	.route("/orders", ordersRouter)
	.route("/customers", customersRouter)
	.route("/inventory", inventoryRouter)
	.route("/products", productsRouter);
