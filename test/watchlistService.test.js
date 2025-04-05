const watchlistService = require("../service/watchlistService");
const watchlistDao = require("../repository/watchlistDAO");
const userDao = require("../repository/userDAO");
const uuid = require('uuid');

jest.mock("../repository/watchlistDAO");
jest.mock("../repository/userDAO");
jest.mock('uuid');

describe("updateWatchlist", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should update the watchlist successfully", async () => {
        const userId = "user123";
        const listId = "list123";
        const data = { listName: "Updated List", isPublic: true };

        watchlistDao.getWatchlistByListId.mockResolvedValue({ userId }); //mock the userId in the existing list
        watchlistDao.updateWatchlist.mockResolvedValue({ listId, ...data });

        const result = await watchlistService.updateWatchlist(userId, listId, data);

        expect(result).toEqual({
            message: "Watchlist updated successfully",
            watchlist: { listId, ...data },
        });
    });

    test("should not throw an error if the watchlist with the same name is the one being updated", async () => {
        const userId = "user123";
        const listId = "list123";
        const listName = "my list";
        watchlistDao.getWatchlistByUserIdAndListName.mockResolvedValue([{ listId, listName }]);

        watchlistDao.getWatchlistByListId.mockResolvedValue({ userId, listId, listName });
        watchlistDao.updateWatchlist.mockResolvedValue({ listId, listName, isPublic: true });

        const result = await watchlistService.updateWatchlist(userId, listId, { listName, isPublic: true });

        expect(result).toHaveProperty("message", "Watchlist updated successfully");
    });

    test("should throw an error if list name is empty", async () => {
        await expect(watchlistService.updateWatchlist("user123", "list123", { listName: " ", isPublic: true }))
            .rejects.toThrow("List name cannot be empty.");
    });

    test("should throw an error if user is not authorized", async () => {
        watchlistDao.getWatchlistByListId.mockResolvedValue({ userId: "anotherUser" });

        await expect(watchlistService.updateWatchlist("user123", "list123", { listName: "Updated", isPublic: true }))
            .rejects.toThrow("Unauthorized: You can only update your own watchlist.");
    });

    test("should throw an error if watchlist is not found", async () => {
        watchlistDao.getWatchlistByListId.mockResolvedValue(null);

        await expect(watchlistService.updateWatchlist("user123", "list123", { listName: "Updated", isPublic: true }))
            .rejects.toThrow("WatchList not found");
    });

    test("should throw an error if the name already exists", async () => {
        watchlistDao.getWatchlistByUserIdAndListName.mockResolvedValue([{listId: "list123", listName: "Updated"}])
        watchlistDao.getWatchlistByListId.mockResolvedValue({listId: "list345", userId: "user123"})
        await expect(watchlistService.updateWatchlist("user123", "list345", { listName: "Updated", isPublic: true }))
            .rejects.toThrow("A watchlist with that name already exists!");
    });
});

describe("commentOnWatchList", () => {
    const userId = "user-123";
    const username = "user123";
    const anotherUserId = "user-456";
    const listId = "list-456";
    const comment = "This is a test comment";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should add a comment successfully to a public watchlist", async () => {

        const existingWatchList = {
            listId,
            isPublic: true,
            userId: anotherUserId,
            collaborators: [],
            comments: []
        };

        const mockComment = {
            commentId: "mock-comment-id-123",
            userId: userId,
            username: username,
            comment: comment,
            datePosted: new Date().toISOString()
        };
        uuid.v4.mockReturnValue("mock-comment-id-123");
        watchlistDao.getWatchlistByListId.mockResolvedValue(existingWatchList);
        watchlistDao.updateWatchlist.mockResolvedValue({ ...existingWatchList, comments: [mockComment] });

        const result = await watchlistService.commentOnWatchList({ userId, username, listId, comment });

        expect(result.message).toBe("Comment added successfully");
        expect(result.comment.commentId).toBeDefined();
        expect(result.comment.comment).toBe(comment);
    });

    test("should add a comment successfully if the user is the owner of a private list", async () => {

        const existingWatchList = { listId, isPublic: false, userId, collaborators: [], comments: [] };

        const mockComment = {
            commentId: "mock-comment-id-123",
            userId: userId,
            username: username,
            comment: comment,
            datePosted: new Date().toISOString()
        };

        watchlistDao.getWatchlistByListId.mockResolvedValue(existingWatchList);
        watchlistDao.updateWatchlist.mockResolvedValue({ ...existingWatchList, comments: [mockComment] });

        const result = await watchlistService.commentOnWatchList({ userId, username, listId, comment });

        expect(result).toHaveProperty("message", "Comment added successfully");
    });

    test("should add a comment successfully if the user is a collaborator on a private list", async () => {
       
        const existingWatchList = { listId, isPublic: false, userId: anotherUserId, collaborators: [userId], comments: [] };

        const mockComment = {
            commentId: "mock-comment-id-123",
            userId: userId,
            username: username,
            comment: comment,
            datePosted: new Date().toISOString()
        };

        watchlistDao.getWatchlistByListId.mockResolvedValue(existingWatchList);
        watchlistDao.updateWatchlist.mockResolvedValue({ ...existingWatchList, comments: [mockComment] });

        const result = await watchlistService.commentOnWatchList({ userId, username, listId, comment });

        expect(result).toHaveProperty("message", "Comment added successfully");
    });

    test("should throw an error if the user is not allowed to comment on a private list", async () => {

        const existingWatchList = { listId, isPublic: false, userId: anotherUserId, collaborators: []};

        watchlistDao.getWatchlistByListId.mockResolvedValue(existingWatchList);

        await expect(watchlistService.commentOnWatchList({ userId, username, listId, comment }))
            .rejects.toThrow("Unauthorized: You cannot comment on this watchlist.");
    });

    test("should throw an error if the watchlist does not exist", async () => {
        watchlistDao.getWatchlistByListId.mockResolvedValue(null);

        await expect(watchlistService.commentOnWatchList({ userId, username, listId, comment }))
            .rejects.toThrow("WatchList not found");
    });

    test("should throw an error if the comment is empty", async () => {
        await expect(watchlistService.commentOnWatchList({ userId, username, listId, comment:"" }))
            .rejects.toThrow("Comment cannot be empty.");
    });
});

describe("deleteCommentOnWatchList", () => {
    const listId = "list-123";
    const commentId = "comment-456";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should delete a comment successfully", async () => {
        const existingWatchList = {
            listId,
            comments: [
                { commentId: "comment-123", comment: "First comment" },
                { commentId, comment: "Second comment" }
            ]
        };

        watchlistDao.getWatchlistByListId.mockResolvedValue(existingWatchList);
        watchlistDao.updateWatchlist.mockResolvedValue({
            ...existingWatchList,
            comments: [{ commentId: "comment-123", comment: "First comment" }]
        });

        const result = await watchlistService.deleteCommentOnWatchList(listId, commentId);

        expect(result.message).toBe("Comment deleted successfully");
        expect(result.watchlist.comments.length).toBe(1);
    });

    test("should throw an error if Comment is not found", async () => {
        const existingWatchList = {
            listId,
            comments: []
        };

        watchlistDao.getWatchlistByListId.mockResolvedValue(existingWatchList);

        await expect(watchlistService.deleteCommentOnWatchList(listId, commentId))
            .rejects.toThrow("Comment not found");
        
    });

    test("should throw an error if watchlist is not found", async () => {
        watchlistDao.getWatchlistByListId.mockResolvedValue(null);

        await expect(watchlistService.deleteCommentOnWatchList(listId, commentId))
            .rejects.toThrow("WatchList not found");
    });

});

describe("Like Watchlist", () => {
    let mockUserId = '123';
    let mockListId = '456';

    beforeEach(() => jest.clearAllMocks());

    it("Throws if user cannot be found", async () => {
        userDao.getUserByUserId.mockResolvedValue(null);
        watchlistDao.getWatchlistByListId(null);

        await expect(watchlistService.likeWatchlist(mockUserId, mockListId)).rejects.toThrow("User could not be found");

        expect(userDao.getUserByUserId).toHaveBeenCalledWith(mockUserId);
    })

    it("Throws if watchlist cannot be found", async () => {
        userDao.getUserByUserId.mockResolvedValue({userId: mockUserId, likedLists: []});
        watchlistDao.getWatchlistByListId.mockResolvedValue(null);

        await expect(watchlistService.likeWatchlist(mockUserId, mockListId)).rejects.toThrow("Watchlist could not be found");

        expect(userDao.getUserByUserId).toHaveBeenCalledWith(mockUserId);
        expect(watchlistDao.getWatchlistByListId).toHaveBeenCalledWith(mockListId);
    })

    it("Likes watchlist successfully", async () => {
        userDao.getUserByUserId.mockResolvedValue({userId: mockUserId, likedLists: []});
        watchlistDao.getWatchlistByListId.mockResolvedValue({listId: mockListId, likes:[]});

        await expect(watchlistService.likeWatchlist(mockUserId, mockListId)).resolves.not.toThrow();

        expect(userDao.getUserByUserId).toHaveBeenCalledWith(mockUserId);
        expect(watchlistDao.getWatchlistByListId).toHaveBeenCalledWith(mockListId);
    })

    it("Unlikes already liked watchlist successfully", async () => {
        userDao.getUserByUserId.mockResolvedValue({userId: mockUserId, likedLists: [mockListId]});
        watchlistDao.getWatchlistByListId.mockResolvedValue({listId: mockListId, likes:[mockUserId]});

        await expect(watchlistService.likeWatchlist(mockUserId, mockListId)).resolves.not.toThrow();

        expect(userDao.getUserByUserId).toHaveBeenCalledWith(mockUserId);
        expect(watchlistDao.getWatchlistByListId).toHaveBeenCalledWith(mockListId);
    })
})