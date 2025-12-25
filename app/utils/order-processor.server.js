import { unauthenticated } from "../shopify.server";

export async function processOrderSwap(shop, payload) {
  try {
    const { admin } = await unauthenticated.admin(shop);
    console.log(`Processing swap for order: ${payload.name} on ${shop}`);

    const lineItems = payload.line_items || [];
    if (!lineItems.length) return true;

    for (const item of lineItems) {
      const blendProperty = item.properties?.find((p) => p.name === "Blend");

      if (!blendProperty?.value) continue;

      const blendTag = blendProperty.value;
      const targetVariantTitle = item.variant_title;

      try {
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
          { variables: { query: `tag:${blendTag}` } },
        );

        const productData = await productSearch.json();
        const product = productData.data?.products?.edges?.[0]?.node;

        if (!product) {
          console.log(`No product found with tag: ${blendTag}`);
          continue;
        }

        const matchingVariant = product.variants.edges.find(
          (v) => v.node.title === targetVariantTitle,
        );

        if (!matchingVariant) {
          console.log(
            `No variant matching title "${targetVariantTitle}" found for tag ${blendTag}`,
          );
          continue;
        }

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
        const calcOrder = beginData.data?.orderEditBegin?.calculatedOrder;

        if (!calcOrder) {
          console.error(
            "Failed to begin order edit:",
            beginData.data?.orderEditBegin?.userErrors,
          );
          return false;
        }

        const itemToRemove = calcOrder.lineItems.edges.find(
          (edge) =>
            edge.node.variant?.id === item.variant_id ||
            edge.node.variant?.id ===
              `gid://shopify/ProductVariant/${item.variant_id}`,
        );

        if (!itemToRemove) {
          console.error(
            "Could not find the original line item within the edit session.",
          );
          continue;
        }

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
        const editErrors = [
          ...(editData.data?.addVariant?.userErrors || []),
          ...(editData.data?.removeOld?.userErrors || []),
        ];

        if (editErrors.length) {
          console.error("ORDER EDIT ERRORS:", editErrors);
          continue;
        }

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

        if (commitData.data?.orderEditCommit?.userErrors?.length) {
          console.error(
            "COMMIT ERRORS:",
            commitData.data.orderEditCommit.userErrors,
          );
        } else {
          console.log(`✅ Successfully swapped item in order ${payload.name}`);
        }

        return true;
      } catch (err) {
        console.error(`Error processing item ${item.title}:`, err);
        throw err;
      }
    }

    return true;
  } catch (fatal) {
    console.error("Fatal worker error:", fatal);
    throw fatal;
  }
}
