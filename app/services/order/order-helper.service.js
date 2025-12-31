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
}
export default OrderHelper;
