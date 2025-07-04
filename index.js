const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SK);
const app = express();
const port = process.env.PORT || 9000;
const userRoute = require("./api/routes/user.route")

// middle-wares
app.use(cors());
app.use(express.json());
app.use(cookieParser())
// mongo db connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ylmjbhk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// server link : https://asset-management-server-brown.vercel.app/
// http://localhost:9000

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const database = client.db("corporateManage");
    const usersCollection = database.collection("users");
    const productCollection = database.collection("products");
    const requProductCollec = database.collection("requ-product");
    const approvProductCollec = database.collection("approv-product");
    const teamCollection = database.collection("team");

    //------------------------------ employee or manager All user ------------------------------
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.use('/all',userRoute);

    // only employee geting
    app.get("/employees", async (req, res) => {
      const query = { status: "employee" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // employee or manager get from database -----------------------------------
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // employee or manager post in database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //------------------------------------ Make Team All user ---------------------------------
    app.get("/teams", async (req, res) => {
      const result = await teamCollection.find().toArray();
      res.send(result);
    });

    // get specific manager list
    app.get("/teams/:id", async (req, res) => {
      const id = req.params.id;
      const query = { managerId: id };
      const result = await teamCollection.find(query).toArray();
      res.send(result);
    });

    // Create a new team
    app.post("/teams", async (req, res) => {
      const { managerId, employee } = req.body;

      const query = { _id: new ObjectId(managerId) };
      const manager = await usersCollection.findOne(query);
      if (!manager) {
        return res.status(400).json({ error: "Invalid manager" });
      }

      // Check if the team already exists
      const managerQuery = { managerId: managerId };
      let team = await teamCollection.findOne(managerQuery);

      if (team) {
        // Team exists, check if employee is already in the team
        const employeeExists = team.employeesArray.some(
          (emp) => emp.employeeId === employee.employeeId
        );

        if (employeeExists) {
          return res
            .status(400)
            .json({ error: "Employee is already in the team" });
        }

        // Team exists, update the employeesArray
        if (!team.employeesArray.includes(employee)) {
          // add employee to employee array

          await teamCollection.updateOne(
            { managerId: managerId },
            {
              $push: { employeesArray: employee },
              $set: { name: manager.name },
            }
          );

          // Fetch the updated team document
          team = await teamCollection.findOne(managerQuery);
        } else {
          return res
            .status(400)
            .json({ error: "Employee is already in the team" });
        }
      }

      // Team doesn't exist, create a new team
      else {
        // Team doesn't exist, create a new team
        team = {
          managerId: managerId,
          name: manager.name,
          employeesArray: [employee],
        };
        await teamCollection.insertOne(team);
      }
      res.send(team);
    });

    // delete employee
    app.delete("/teams/:teamId/employees/:employeeId", async (req, res) => {
      const { teamId, employeeId } = req.params;
      const filter = { _id: new ObjectId(teamId) };
      const update = {
        $pull: {
          employeesArray: { employeeId: employeeId },
        },
      };

      // Perform the update operation
      const result = await teamCollection.updateOne(filter, update);
      res.send(result);
    });

    //-------------------------------------- PRODUCT API --------------------------------------
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    // product post
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    // search products--------------------------------------------------
    app.get("/search-products", async (req, res) => {
      const { name } = req.query;
      if (!name) {
        return res.status(400).send("Product name is required");
      }
      const query = { productName: new RegExp(name, "i") };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    // filter products by asset type
    app.get("/filter-products", async (req, res) => {
      const { productType } = req.query;
      if (!productType) {
        return res.status(400).json({ message: "Missing assetType or email" });
      }
      let filter = { productType };
      const result = await productCollection.find(filter).toArray();
      res.send(result);
    });

    // update the product quantity
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const { quantityChange } = req.body;
      const productQuantityChange = Number(quantityChange);

      const query = { _id: new ObjectId(id) };
      const product = await productCollection.findOne(query);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      // Convert the productQuantity from string to number
      const currentQuantity = Number(product.productQuantity);

      // Calculate the new quantity
      const newQuantity = currentQuantity + productQuantityChange;
      if (newQuantity < 0) {
        return res.status(400).json({ message: "Quantity cannot be negative" });
      }

      // Update the product quantity
      const updateDoc = {
        $set: {
          productQuantity: newQuantity.toString(),
        },
      };
      const result = await productCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // deleted product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    // ------------------------------------- Requested Product ---------------------------------
    app.get("/requ-product", async (req, res) => {
      const result = await requProductCollec.find().toArray();
      res.send(result);
    });

    // search products
    app.get("/search-user", async (req, res) => {
      const { query } = req.query;
      if (!query) {
        return res.status(400).send("Query parameter is required");
      }
      const userQuery = {
        $or: [
          { requesterName: { $regex: query, $options: "i" } },
          { requesterEmail: { $regex: query, $options: "i" } },
        ],
      };
      const result = await requProductCollec.find(userQuery).toArray();
      res.send(result);
    });

    app.get("/requ-product/:email", async (req, res) => {
      const email = req.params.email;
      const query = { requesterEmail: email };
      const result = await requProductCollec.find(query).toArray();
      res.send(result);
    });

    // search products
    app.get("/search", async (req, res) => {
      const { name } = req.query;
      if (!name) {
        return res.status(400).send("Product name is required");
      }
      const query = { assetName: new RegExp(name, "i") };
      const result = await requProductCollec.find(query).toArray();
      res.send(result);
    });

    // filter products by asset type
    app.get("/filter", async (req, res) => {
      const { assetType, requesterEmail } = req.query;
      if (!assetType || !requesterEmail) {
        return res.status(400).json({ message: "Missing assetType or email" });
      }
      let filter = { assetType, requesterEmail };
      const result = await requProductCollec.find(filter).toArray();
      res.send(result);
    });

    // filter products bu request status
    app.get("/filter-status", async (req, res) => {
      const { requestStatus, requesterEmail } = req.query;
      if (!requestStatus || !requesterEmail) {
        return res
          .status(400)
          .json({ message: "Missing requestStatus or email" });
      }
      let filter = { requestStatus, requesterEmail };
      const result = await requProductCollec.find(filter).toArray();
      res.send(result);
    });

    app.post("/requ-product", async (req, res) => {
      const item = req.body;
      const result = await requProductCollec.insertOne(item);
      res.send(result);
    });

    // for update product
    app.put("/requ-product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { approveDate } = req.body;
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          requestStatus: "approved",
          approveDate: approveDate,
        },
      };
      const result = await requProductCollec.updateOne(
        query,
        updateDoc,
        option
      );
      res.send(result);
    });

    // for rejected product
    app.patch("/requ-product/rejected/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          requestStatus: "rejected",
        },
      };
      const result = await requProductCollec.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete("/requ-product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requProductCollec.deleteOne(query);
      res.send(result);
    });

    // ------------------------------------- Approve Product ---------------------------------
    app.get("/requ-product", async (req, res) => {
      const result = await approvProductCollec.find().toArray();
      res.send(result);
    });

    app.post("/approve-product", async (req, res) => {
      const item = req.body;
      const result = await approvProductCollec.insertOne(item);
      res.send(result);
    });

    //----------------------------------------- PAYMENT DATA -----------------------------------
    app.post("/payment-intent", async (req, res) => {
      const { price } = req.body;
      if (price === 0) {
        return;
      }
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
    //-------------------------------------- payment api ---------------------------------------

    // Send a ping to confirm a successful connection
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

// server call
app.get("/", (req, res) => {
  res.send("Corporate Management Server is running BROH");
});
// Global error handler (optional)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});
app.listen(port, () => {
  console.log(`Corporate Management Server Port is ${port}`);
});
