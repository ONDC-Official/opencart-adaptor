import axios from "axios";

export default async function issueStatusHandler(req, res) {
  console.log("issue Status handler executed");

  try {
    const { context } = req.body;
    const isValidRequest = req.isValidRequest;
    console.log('isValidRequest',isValidRequest);
    const isReturnValid = req.isReturnValid;
    console.log('isReturnValid',isReturnValid);

    if (!isValidRequest) {
      // Case 1: Request failed middleware validation
      console.warn("NACK: Request failed middleware validation");
      return res.status(200).json({
        response: {
          context: {
            ...context,
            action: "on_issue_status",
            bpp_id: context?.bpp_id,
            bpp_uri: context?.bpp_uri,
          },
          message: {
            ack: {
              status: "NACK",
            },
          },
          error: {
            type: "AUTH_ERROR",
            code: "10002",
            message: "Authentication failed or missing OpenCart API token/environment variables.",
          },
        },
      });
    } else if (!isReturnValid) {
        // Case 2: Request failed middleware validation
        console.warn("NACK: Request failed middleware validation due to order ID");
        return res.status(200).json({
          response: {
            context: {
              ...context,
              action: "on_issue_status",
              bpp_id: context?.bpp_id,
              bpp_uri: context?.bpp_uri,
            },
            message: {
              ack: {
                status: "NACK",
              },
            },
            error: {
              type: "AUTH_ERROR",
              code: "10002",
              message: "Authentication failed as issue ID is not valid.",
            },
          },
        });
      } else if (
      !context ||
      !context.transaction_id ||
      !context.message_id ||
      !context.bap_id ||
      !context.bap_uri
    ) {
      console.log("NACK: Missing mandatory context parameters");
      return res.status(200).json({
        response: {
          context: {
            ...context,
            action: "on_issue_status",
            bpp_id: req.body?.context?.bpp_id,
            bpp_uri: req.body?.context?.bpp_uri,
          },
          message: {
            ack: {
              status: "NACK",
            },
          },
          error: {
            type: "REQUEST_ERROR",
            code: "10001",
            message:
              "Missing mandatory parameters in the /search request context.",
          },
        },
      });
    }

    // 2. Add more validation checks as needed

    // If all initial checks pass, send an ACK
    if (isValidRequest && isReturnValid) {
    console.log("ACK: Request seems valid, proceeding to handler");
    res.status(200).json({
      // res.write({
      response: {
        context: {
          ...context,
          action: "on_issue_status",
          bpp_id: req.body?.context?.bpp_id,
          bpp_uri: req.body?.context?.bpp_uri,
        },
        message: {
          ack: {
            status: "ACK",
          },
        },
      },
    });
  }

    const ondcRequest = req.body;
    console.log(
      "\n\n\n request body ",
      ondcRequest,
      "-------------------------"
    );
    await axios.post(
      `${process.env.ADAPTOR_SITE}/on_issue_status`,
      ondcRequest,
      {headers: { 'Content-Type': 'application/json',
        'x-dev-mode': 'true'
     }}
    );
    
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the search request" });
  }

}
