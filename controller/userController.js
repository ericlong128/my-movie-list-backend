const express = require("express");
const router = express.Router();
const userService = require('../service/userService');
const logger = require("../util/logger");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../util/jwt");
require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY;

router.post("/register", validateUserData, async (req, res) => {
    try {
        const data = await userService.createUser(req.body);
        res.status(201).json("Registration successful.");
    } catch (err) {
        logger.error(`Error registering user: ${err.message}`);
        res.status(400).json(err.message);
    }
});

router.post("/change-password", authenticateToken, async (req, res) => {
    try {
        if (!(req.body.password)) {
            throw new Error("Password is missing");
        }

        await userService.changePassword(req.body, req.user);
        res.status(200).json("Password successfully changed.")
    } catch (error) {
        logger.error(`Error changing password: ${error.message}`);
        res.status(400).json(error.message);
    }
})

router.delete("/me", authenticateToken, async (req, res) => {
    try {
        await userService.deleteUser(req.user);
        res.status(200).json("User successfully deleted.")
    } catch (error) {
        logger.error(`Error deleting account: ${error.message}`);
        res.status(400).json(error.message);
    }
})

function validateUserData(req, res, next) {
    const data = req.body;
    if(data.username && data.password && data.email) {
        next();
    } else {
        res.status(400).json("Username, email and password required");
    }
}

module.exports = router;