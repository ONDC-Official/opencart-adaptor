export default function onSelectMiddleware (req, res, next) {
    console.log("Middleware triggered for /on_select");
    

    next(); // Call the next function (onSelect handler)
};

