import db from "../../db.server";
import path from "path";
import fs from "fs/promises";
import { mailer } from "../../utils/mailer.server";
class InventoryHelper {
  async getNotificationRequests(productId, variantId) {
    const notificationRequests = await db.InventoryNotificationRequest.findMany(
      {
        where: {
          variantId,
          productId,
          status: "PENDING",
        },
      },
    );
    return notificationRequests;
  }

  async sendNotification(productId, variantId, data) {
    const notificationRequests = await this.getNotificationRequests(
      productId,
      variantId,
    );
    if (!notificationRequests.length) return;
    const ids = notificationRequests.map((nr) => nr.id);

    await this.sendMail(notificationRequests, data);

    await db.inventoryNotificationRequest.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        status: "COMPLETED",
      },
    });
  }

  async sendMail(notificationRequests, data) {
    const templatePath = path.join(
      process.cwd(),
      "app/templates/inventory.html",
    );
    const template = await fs.readFile(templatePath, "utf-8");

    await Promise.all(
      notificationRequests.map(async ({ name, email }) => {
        const replacements = {
          name: name,
          productName: data.productName,
          variantName: data.variantName,
          variantPrice: `${data.variantCurrency === "USD" ? "$" : "₹"} ${data.variantPrice}`,
          variantImageUrl: data.variantImageUrl,
          ctaUrl: data.ctaUrl,
          year: new Date().getFullYear(),
        };

        let html = template;
        for (const [key, value] of Object.entries(replacements)) {
          html = html.replaceAll(`{{${key}}}`, value ?? "");
        }

        await mailer.sendMail({
          from: `"Anand Max Store" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: `${data.productName} is back in stock 🚀`,
          html,
        });
        console.log(`MAIL SEND TO ${name} at ${email}`);
      }),
    );
  }
}
export default InventoryHelper;
