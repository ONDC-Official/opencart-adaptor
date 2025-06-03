import axios from "axios";
import { signRequest } from "../auth/cryptoUtils.js";

export default async function issueHandler(req, res) {
  console.log("issue handler executed");

  try {
    const { context } = req.body;
    const isValidRequest = req.isValidRequest;
    const isOrderValid = req.isOrderValid;

    console.log("isValidRequest", isValidRequest);
    console.log("isOrderValid", isOrderValid);

    // Basic validations
    if (!isValidRequest) {
      console.warn("NACK: Request failed middleware validation");
      return res.status(200).json({
        response: {
          context: {
            ...context,
            action: "on_issue",
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
    }
    console.log("ORDER ID:", req.body?.message?.issue?.order_details?.id);

    if (!isOrderValid) {
      console.warn("NACK: Invalid order ID");
      return res.status(200).json({
        response: {
          context: {
            ...context,
            action: "on_issue",
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
            code: "10003",
            message: "Invalid or missing order ID.",
          },
        },
      });
    }

    if (!context || !context.transaction_id || !context.message_id || !context.bap_id || !context.bap_uri) {
      console.log("NACK: Missing mandatory context parameters");
      return res.status(200).json({
        response: {
          context: {
            ...context,
            action: "on_issue",
            bpp_id: context?.bpp_id,
            bpp_uri: context?.bpp_uri,
          },
          message: {
            ack: {
              status: "NACK",
            },
          },
          error: {
            type: "REQUEST_ERROR",
            code: "10001",
            message: "Missing mandatory parameters in the /issue request context.",
          },
        },
      });
    }

    // Send initial ACK response
    const ackResponse = {
      response: {
        context: {
          ...context,
          action: "on_issue",
          bpp_id: context?.bpp_id,
          bpp_uri: context?.bpp_uri,
        },
        message: {
          ack: {
            status: "ACK",
          },
        },
      },
    };

    res.status(200).json(ackResponse);


    // Async processing
    setImmediate(async () => {
      try {
        const ondcRequest = req.body;
        console.log("\n\n\n request body ", ondcRequest, "-------------------------");

        const { signature, digest, authHeader } = signRequest(ondcRequest);

        if (!process.env.ADAPTOR_SITE) {
          console.error("ADAPTOR_SITE environment variable is not set");
          return;
        }

        const adapterUrl = `${process.env.ADAPTOR_SITE.replace(/\/$/, "")}/api/on_issue`;
        console.log("Sending request to adapter:", adapterUrl);

        const response = await axios.post(
          adapterUrl,
          ondcRequest,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
              Digest: digest,
              Signature: signature,
              "x-dev-mode": "true",
            },
          }
        ).catch(error => {
          if (error.code === 'ECONNREFUSED') {
            console.error(`Connection refused to ${adapterUrl}. Make sure the adapter server is running.`);
          } else {
            console.error("Error sending request to adapter:", error.message);
          }
          return null;
        });

        if (response) {
          console.log("Successfully sent /on_issue callback:", response.status);
          console.log("/on_issue callback message:", response.data);
          console.log("Response headers:", response.headers);
          console.log("Response response:", response.response);
        }

      } catch (error) {
        console.error("Error in async processing:", error);
      }
    });

  } catch (error) {
    console.error("Error in issue handler:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          type: "CORE-ERROR",
          code: "50000",
          message: "An error occurred while processing the issue request"
        }
      });
    }
  }
}
