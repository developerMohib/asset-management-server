const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 9000 ;

// middle-wares
app.use(cors());
app.use(express.json())


// server call
app.get('/', (req, res) => {
    res.send('Corporate Management Server is running BROH');
})
app.listen(port, ()=>{
    console.log(`Corporate Management Server Port is ${port}`);
})