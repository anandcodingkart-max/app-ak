import path from "path";
import fs from "fs/promises";
import { mailer } from "../../utils/mailer.server";
class OrderHelper {
  async getProductByTag(admin, tag) {
    const productSearch = await admin.graphql(
      `#graphql
          query findProductByTag($query: String!) {
            products(first: 1, query: $query) {
              edges {
                node {
                  id
                  variants(first: 50) {
                    edges {
                      node {
                        id
                        title
                      }
                    }
                  }
                }
              }
            }
          }`,
      { variables: { query: `tag:${tag}` } },
    );

    const productData = await productSearch.json();
    return productData;
  }
  async beginOrderUpdate(admin, payload) {
    const beginResponse = await admin.graphql(
      `#graphql
          mutation beginEdit($id: ID!) {
            orderEditBegin(id: $id) {
              calculatedOrder {
                id
                lineItems(first: 50) {
                  edges {
                    node {
                      id
                      variant {
                        id
                      }
                    }
                  }
                }
              }
              userErrors {
                message
              }
            }
          }`,
      { variables: { id: payload.admin_graphql_api_id } },
    );
    const beginData = await beginResponse.json();
    return beginData;
  }
  async editOrder(admin, calcOrder, matchingVariant, item, itemToRemove) {
    const editResponse = await admin.graphql(
      `#graphql
          mutation swapItem(
            $orderEditId: ID!
            $variantId: ID!
            $qty: Int!
            $calcLineItemId: ID!
          ) {
            addVariant: orderEditAddVariant(
              id: $orderEditId
              variantId: $variantId
              quantity: $qty
            ) {
              userErrors { message }
            }

            removeOld: orderEditSetQuantity(
              id: $orderEditId
              lineItemId: $calcLineItemId
              quantity: 0
            ) {
              userErrors { message }
            }
          }`,
      {
        variables: {
          orderEditId: calcOrder.id,
          variantId: matchingVariant.node.id,
          qty: item.quantity,
          calcLineItemId: itemToRemove.node.id,
        },
      },
    );

    const editData = await editResponse.json();
    return editData;
  }
  async commitOrderUpdate(admin, calcOrder) {
    const commitResponse = await admin.graphql(
      `#graphql
          mutation commitEdit($id: ID!) {
            orderEditCommit(id: $id) {
              order { id }
              userErrors { message }
            }
          }`,
      { variables: { id: calcOrder.id } },
    );

    const commitData = await commitResponse.json();
    return commitData;
  }
  async createShopifyDiscount(admin, { couponCode, discountAmount }) {
    const query = `#graphql
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

    const variables = {
      basicCodeDiscount: {
        title: `Gift Discount ${couponCode}`,
        code: couponCode,
        startsAt: new Date().toISOString(),

        customerSelection: {
          all: true,
        },

        customerGets: {
          value: {
            discountAmount: {
              amount: String(discountAmount),
              appliesOnEachItem: false,
            },
          },
          items: {
            all: true,
          },
        },

        appliesOncePerCustomer: true,
        usageLimit: 1,
      },
    };

    const response = await admin.graphql(query, { variables });
    const result = await response.json();

    if (result.errors) {
      console.error("GraphQL Errors:", result.errors);
      throw new Error(result.errors[0].message);
    }

    const data = result.data?.discountCodeBasicCreate;

    if (!data) {
      throw new Error("No data returned from Shopify discount mutation");
    }

    if (data.userErrors?.length) {
      console.error("Shopify User Errors:", data.userErrors);
      throw new Error(data.userErrors[0].message);
    }

    return data.codeDiscountNode.id;
  }
  async sendGiftMail(email, data) {
    const templatePath = path.join(
      process.cwd(),
      "app/templates/gift-product.html",
    );
    const template = await fs.readFile(templatePath, "utf-8");

    const replacements = {
      recipientName: data.recipientName,
      giftMessage: data.giftMessage,
      ctaUrl: data.ctaUrl,
      couponCode: data.couponCode,
      expireDate: data.expireDate,
      year: new Date().getFullYear(),
    };

    let html = template;
    for (const [key, value] of Object.entries(replacements)) {
      html = html.replaceAll(`{{${key}}}`, value ?? "");
    }

    await mailer.sendMail({
      from: `"Anand Max Store" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `🎁 You've Received a Gift!`,
      html,
    });
    console.log(`MAIL SEND TO ${data.recipientName} at ${email}`);
  }
}
export default OrderHelper;
