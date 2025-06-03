export default function on_IncrementalSearchMiddleware (req, res, next) {
    console.log("Middleware triggered for /incremental-catalog-refresh");

    req.processedAt = new Date(); // Adding a timestamp

    next(); // Call the next function (onSearch handler)
};

