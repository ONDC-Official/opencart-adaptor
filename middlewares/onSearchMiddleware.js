export default function onSearchMiddleware (req, res, next) {
    console.log("Middleware triggered for /on_search");

    // const { context } = req.body;

    

    // Continue processing asynchronously without calling next()
    process.nextTick(() => {
        next();
    });
};
