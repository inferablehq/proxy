import { z } from "zod";
import { inferable } from "../inferable";

const inventory = [
  {
    id: "1",
    name: "Sonic Screwdriver",
    description: "The Doctor's trusty tool",
    price: 100,
    qty: 10,
  },
  {
    id: "2",
    name: "Towel",
    description: "Don't panic!",
    price: 42,
    qty: 5,
  },
  {
    id: "3",
    name: "Lightsaber",
    description: "An elegant weapon for a more civilized age",
    price: 200,
    qty: 3,
  },
  {
    id: "4",
    name: "Ring of Power",
    description: "One ring to rule them all",
    price: 1000,
    qty: 1,
  },
  {
    id: "5",
    name: "Hoverboard",
    description: "Great Scott!",
    price: 500,
    qty: 2,
  },
];

const orders: Array<{
  itemId: string;
  qty: number;
  at: Date;
}> = [];

function searchInventory({ search }: { search: string }) {
  return inventory.filter((item) => {
    return (
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
    );
  });
}

function getInventoryItem({ id }: { id: string }) {
  return inventory.find((item) => item.id === id);
}

function makeOrder({ items }: { items: { id: string; qty: number }[] }) {
  const order = items.map((item) => {
    const inventoryItem = inventory.find((i) => i.id === item.id);

    if (!inventoryItem) {
      throw new Error(`Item with id ${item.id} not found`);
    }

    if (inventoryItem.qty && inventoryItem.qty < item.qty) {
      throw new Error(
        `Not enough stock for item ${inventoryItem.name}. Only ${inventoryItem.qty} left`
      );
    }

    return {
      itemId: item.id,
      qty: item.qty,
      at: new Date(),
    };
  });

  items.forEach((item) => {
    const inventoryItem = inventory.find((i) => i.id === item.id);
    inventoryItem!.qty -= item.qty;
  });

  orders.push(...order);

  return {
    order,
  };
}

function listOrders() {
  return orders;
}

function totalOrderValue() {
  return orders.reduce((total, order) => {
    const item = inventory.find((i) => i.id === order.itemId);

    if (!item) {
      throw new Error(`Item with id ${order.itemId} not found`);
    }

    return total + item.price * order.qty;
  }, 0);
}

const exampleService = inferable.service({
  name: "example",
});

exampleService.register({
  name: "searchInventory",
  func: searchInventory,
  description: "Searches the inventory",
  schema: {
    input: z.object({
      search: z.string().describe("Could match name or description"),
    }),
  },
});

exampleService.register({
  name: "getInventoryItem",
  func: getInventoryItem,
  description: "Gets an inventory item",
  schema: {
    input: z.object({
      id: z.string(),
    }),
  },
});

exampleService.register({
  name: "makeOrder",
  func: makeOrder,
  description: "Makes an order",
  config: {
    requiresApproval: true,
  },
  schema: {
    input: z.object({
      items: z.array(
        z.object({
          id: z.string().describe("Item ID"),
          qty: z.number().int().positive().describe("Quantity to order"),
        })
      ),
    }),
  },
});

exampleService.register({
  name: "listOrders",
  func: listOrders,
  description: "Lists all orders",
  schema: {
    input: z.object({}),
  },
});

exampleService.register({
  name: "totalOrderValue",
  func: totalOrderValue,
  description: "Calculates the total value of all orders",
  schema: {
    input: z.object({}),
  },
});

export { exampleService };
