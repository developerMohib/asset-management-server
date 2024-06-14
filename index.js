const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SK);
const app = express();
const port = process.env.PORT || 9000;

// middle-wares
app.use(cors());
app.use(express.json());

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
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const database = client.db("corporateManage");
    const usersCollection = database.collection("users");
    const productCollection = database.collection("products");
    const requProductCollec = database.collection("requ-product");

    //------------------------------------------- POST DATA ------------------------------------
    // employee or manager All user ------------------------------------------------------------
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // employee or manager get from database ---------------------------------------------------
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // employee or manager post in database ----------------------------------------------------
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //-------------------------------------- PRODUCT API --------------------------------------
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    // product post ---------------------------------------------------------------------------
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });
    
    // update the product quantity
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requProductCollec.deleteOne(query);
      res.send(result);
    });


    // ------------------------------------- Requested Product ---------------------------------
    app.get("/requ-product", async (req, res) => {
      const result = await requProductCollec.find().toArray();
      res.send(result);
    });
    app.get("/requ-product/:id", async (req, res) => {
      const id = req.params.id;
      // console.log("delete id", id);
      const query = { _id: new ObjectId(id) };
      const result = await requProductCollec.findOne(query);
      res.send(result);
    });

    app.post("/requ-product", async (req, res) => {
      const item = req.body;
      const result = await requProductCollec.insertOne(item);
      res.send(result);
    });

    app.delete("/requ-product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requProductCollec.deleteOne(query);
      res.send(result);
    });

    //----------------------------------------- PAYMENT DATA -----------------------------------
    //-------------------------------------- payment api ---------------------------------------
    app.post("/payment-intent", async (req, res) => {
      const { price } = req.body;
      console.log(price, "price", typeof price);
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
app.listen(port, () => {
  console.log(`Corporate Management Server Port is ${port}`);
});
