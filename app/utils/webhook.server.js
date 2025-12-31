// import { isSynced, setSynced, unauthenticated } from "../shopify.server";

// export async function syncWebhooksAndScopes({ request }) {
//   console.log("WEBHOOK SYNCED: ", isSynced());
//   if (isSynced()) return;
//   console.log("WEBHOOK REGISTER FUNCTION IN PROGRESS");

//   const url = new URL(request.url);
//   const appUrl = `https://${url.host}`;

//   const WEBHOOKS = [
//     { topic: "APP_UNINSTALLED", path: "/webhooks/app/uninstalled" },
//     { topic: "APP_SCOPES_UPDATE", path: "/webhooks/app/scopes_update" },
//     { topic: "ORDERS_CREATE", path: "/orders" },
//     { topic: "INVENTORY_LEVELS_UPDATE", path: "/inventory" },
//   ];

//   const shop = process.env.SHOPIFY_SHOP;

//   const { admin, session } = await unauthenticated.admin(shop);

//   const existingResponse = await admin.graphql(`
//     query {
//       webhookSubscriptions(first: 100) {
//         edges {
//           node {
//             id
//             topic
//           }
//         }
//       }
//     }
//   `);

//   const existingData = await existingResponse.json();
//   const existingHooks = existingData?.data?.webhookSubscriptions?.edges || [];

//   if (existingHooks?.length) {
//     for (const { node } of existingHooks) {
//       if (WEBHOOKS.some((w) => w.topic === node.topic)) {
//         await admin.graphql(`
//         mutation {
//           webhookSubscriptionDelete(id: "${node.id}") {
//             deletedWebhookSubscriptionId
//           }
//         }
//       `);
//         console.log(`✅ DELETED: ${node.topic}`);
//       }
//     }
//   }

//   for (const hook of WEBHOOKS) {
//     const registrationResponse = await admin.graphql(`
//       mutation {
//         webhookSubscriptionCreate(
//           topic: ${hook.topic}
//           webhookSubscription: {
//             callbackUrl: "${appUrl}${hook.path}"
//             format: JSON
//           }
//         ) {
//           webhookSubscription { id }
//           userErrors { field message }
//         }
//       }
//     `);

//     const regResult = await registrationResponse.json();

//     if (
//       regResult.errors ||
//       regResult.data?.webhookSubscriptionCreate?.userErrors?.length
//     ) {
//       console.error(
//         `❌ Failed ${hook.topic}:`,
//         JSON.stringify(
//           regResult.errors ||
//             regResult.data.webhookSubscriptionCreate.userErrors,
//         ),
//       );
//     } else {
//       console.log(`✅ Registered: ${hook.topic}`);
//     }
//   }

//   setSynced(true);
// }
