const express = require("express");
const router = express.Router();
const watchlistService = require('../service/watchlistService');
const { authenticateToken } = require("../util/jwt");
require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY;
const logger = require("../util/logger");

router.post("/", authenticateToken, async (req, res) => {
    
    if(!req.user.userId){
        return res.status(400).json({message: "invalid token data"});
    }
    const data = req.body;
    
    if(!data.listName){
        return res.status(400).json({message: "requires a listName"});
    }
    try {
        const result = await watchlistService.createWatchlist(req.user.userId, data.listName);
        res.status(201).json("watchlist creation successful.");
    } catch (err) {
        logger.error(`Error creating watchlist: ${err.message}`);
        res.status(400).json(err.message);
    }
});

//update list name and isPublic
router.put("/:listId", authenticateToken, async (req, res) => {
    try {
        const { listId } = req.params;
        const { isPublic, listName } = req.body;
        const userId = req.user.userId;

        const data = await watchlistService.updateWatchlist(userId, listId, { isPublic, listName });

        res.status(200).json(data);
    } catch (err) {
        logger.error(`Error updating  watchlist: ${err.message}`);

        // handle error message and status code
        if (err.message === "List name cannot be empty." || err.message === "isPublic must be a boolean.") {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === "WatchList not found") {
            return res.status(404).json({ error: err.message });
        }
        if (err.message === "Unauthorized: You can only update your own watchlist.") {
            return res.status(403).json({ error: err.message });
        }

        // server error
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;