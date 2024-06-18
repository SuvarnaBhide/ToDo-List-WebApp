require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const _ = require("lodash");
const date = require(path.join(__dirname, "/date.js"));
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3000;

// Middleware and Configuration
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
mongoose.set('strictQuery', false);

// Connect to MongoDB database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_CONNECT_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// Define Mongoose schemas and models
const itemsSchema = new mongoose.Schema({ name: String });
const Item = mongoose.model("Item", itemsSchema);
const defaultItems = [
  { name: "Welcome to your todolist!" },
  { name: "Hit the + button to add a new item." },
  { name: "<-- Hit this to delete an item." },
  {
    name: 'Create a custom list by adding the name to the URL.<br>(e.g., <a href="https://todo-list-webapp.onrender.com/SCHOOL" style="color: #895BB3; font-weight: 500;">https://todo-list-webapp.onrender.com/<span style="font-weight: bold;">SCHOOL</span></a>).',
  }  
];
const listSchema = new mongoose.Schema({ name: String, items: [itemsSchema] });
const List = mongoose.model("List", listSchema);

// Home Route
app.get("/", async function (req, res) {
  try {
    const foundItems = await Item.find({});
    if (foundItems.length === 0) {
      await Item.insertMany(defaultItems);
      console.log("Successfully saved default items to DB");
      res.redirect("/");
    } else {
      const day = date.getDate();
      res.render("list", { listTitle: day, newListItems: foundItems });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Custom List Route
app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);
  List.findOne({ name: customListName })
    .then((foundList) => {
      if (!foundList) {
        const list = new List({ name: customListName, items: defaultItems });
        list.save();
        res.redirect("/" + customListName);
      } else {
        res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Internal Server Error");
    });
});

// Create New Item
app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  const item = new Item({ name: itemName });
  if (listName === date.getDate()) {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName }).then((foundList) => {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

// Delete Item
app.post("/delete", async (req, res) => {
  try {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;
    if (listName === date.getDate()) {
      await Item.findByIdAndDelete(checkedItemId);
      console.log("Successfully deleted checked item.");
      res.redirect("/");
    } else {
      const foundList = await List.findOne({ name: listName });
      foundList.items.pull({ _id: checkedItemId });
      await foundList.save();
      res.redirect("/" + listName);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error")
  }
});

// About Route
app.get("/about", function (req, res) {
  res.render("about");
});

// Connect to MongoDB and start the server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});
