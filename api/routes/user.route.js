const express = require("express");
const { allUserGet } = require("../controllers/user.controller");
const router = express.Router();

router.get('/users', allUserGet);

module.exports = router;