const fs = require("fs");
const csv = require("csvtojson");
const { Parser } = require("json2csv");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

readline.question(
  "Please insert csv file name (ex: shoe.csv) from the same directory: ",
  async (fileName) => {
    fileName = fileName.trim();
    const test = /^.+(\.csv)$/.test(fileName);

    // handle non-csv file
    if (!test) {
      console.log("File is not csv compatible!");
      process.exit();
    }

    // handle non-existent file
    process.on("unhandledRejection", (err) => {
      console.error("File does not exist!");
      process.exit(1); // mandatory (as per the Node.js docs)
    });

    // Load items from csv file
    const items = await csv().fromFile(`${fileName}`);
    const totalOrders = items.length;
    console.log(`File Name: ${fileName} with total items: ${totalOrders}.`);

    // itemsOrder Map contains each item name and its total order
    // { 'name' => orders/totalOrders }
    let itemsOrder = new Map();
    // itemsBrand Map contains each item brand and its name & quantity as a value
    // { 'brand' => { name: '', quantity: 1 } }
    let itemsBrand = new Map();

    // iterate over each item to fill the maps
    for (let i = 0; i < totalOrders; i++) {
      const item = items[i];
      const itemQuantity = parseFloat(item.Quantity) / totalOrders;
      // fill itemsOrder
      if (itemsOrder.has(item.Name)) {
        let currentValue = parseFloat(itemsOrder.get(item.Name));
        itemsOrder.set(item.Name, currentValue + itemQuantity);
      } else {
        itemsOrder.set(item.Name, itemQuantity);
      }

      // fill itemsBrand
      if (itemsBrand.has(item.Brand)) {
        let currentValue = parseInt(itemsBrand.get(item.Brand).quantity);
        itemsBrand.set(item.Brand, {
          name: item.Name,
          quantity: currentValue + 1,
        });
      } else {
        itemsBrand.set(item.Brand, { name: item.Name, quantity: 1 });
      }
    }

    // convert itemsOrder from Map to an array to be accessible to Parser
    const orders = Array.from(itemsOrder, ([key, value]) => {
      return {
        Name: `${key}`,
        Orders: `${value}`,
      };
    });
    const ordersInCsv = new Parser({
      fields: ["Name", "Orders"],
    }).parse(orders);
    // create the output file
    fs.writeFileSync(`0_${fileName}`, ordersInCsv);

    // Remove least quantity from itemsBrand
    let pobularBrands = new Map(); // { 'name' => 'brand' }
    itemsBrand.forEach(function (value, key) {
      if (pobularBrands.get(value.name)) {
        if (
          itemsBrand.get(key).quantity >
          itemsBrand.get(pobularBrands.get(value.name)).quantity
        ) {
          pobularBrands.set(value.name, key);
        }
      } else {
        pobularBrands.set(value.name, key);
      }
    });
    // convert pobularBrands from map to an array to be accessible to Parser
    const brands = Array.from(pobularBrands, ([key, value]) => {
      return {
        Name: `${key}`,
        Brand: `${value}`,
      };
    });
    const brandsInCsv = new Parser({
      fields: ["Name", "Brand"],
    }).parse(brands);
    fs.writeFileSync(`1_${fileName}`, brandsInCsv);

    readline.close();
  }
);
