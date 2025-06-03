export default function onTrackMiddleware (req, res, next) {
    console.log("Middleware triggered for /on_track");
    // -----------------------------------------------------------------------------------------------------
    // ----------------------          ACK/NACK GOES HERE           ----------------------------------------
    // -----------------------------------------------------------------------------------------------------
    // Example: Check if request body contains required data
    // if (!req.body || !req.body.someRequiredField) {
    //     return res.status(400).json({ error: "Missing required field" });
    // }

    // Modify request (if needed)
    req.processedAt = new Date(); // Adding a timestamp

    next(); // Call the next function (onInit handler)
};

