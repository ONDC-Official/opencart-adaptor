import axios from "axios";
import FormData from "form-data"; 

export default async function onTrackHandler(req, res) {
  console.log("onTrackHandler executed");

  try {
    const { context } = req.body;
    
    const trackingResponse = {
      response: {
        context: {
          ...context,
          action: "on_track",
          bpp_id: context?.bpp_id,
          bpp_uri: context?.bpp_uri,
        },
        message:   {
          "tracking":
          {
            "id":"F1",
            "location":
            {
              "gps":"12.974002,77.613458",
              "time":
              {
                "timestamp":"2023-06-02T06:20:00.000Z"
              },
              "updated_at":"2023-06-02T06:30:00.000Z"
            },
            "url":"https://sellerNP.com/ondc/tracking/F1",
            "status":"active",
            "tags":
            [
              {
                "code":"order",
                "list":
                [
                  {
                    "code":"id",
                    "value":"O1"
                  }
                ]
              },
              {
                "code":"config",
                "list":
                [
                  {
                    "code":"attr",
                    "value":"tracking.location.gps"
                  },
                  {
                    "code":"type",
                    "value":"live_poll"
                  }
                ]
              },
              {
                "code":"path",
                "list":
                [
                  {
                    "code":"lat_lng",
                    "value":"12.974002,77.613458"
                  },
                  {
                    "code":"sequence",
                    "value":"1"
                  }
                ]
              },
              {
                "code":"path",
                "list":
                [
                  {
                    "code":"lat_lng",
                    "value":"12.974077,77.613600"
                  },
                  {
                    "code":"sequence",
                    "value":"2"
                  }
                ]
              },
              {
                "code":"path",
                "list":
                [
                  {
                    "code":"lat_lng",
                    "value":"12.974098,77.613699"
                  },
                  {
                    "code":"sequence",
                    "value":"3"
                  }
                ]
              }
            ]
          }
        },
        error: {
          type: "AUTH_ERROR",
          code: "10002",
          message: "Tracking will not work till an extension is added to the Opencart",
        },
      },
    };

    const callbackUrl = req.body.context.bap_uri + "/on_track";
        console.log('callback url', callbackUrl);
        console.log("responsee:- ",trackingResponse);

        try {
            const callbackResponse = await axios.post(callbackUrl, trackingResponse, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log("Successfully sent /on_track callback:", callbackResponse.status);
            console.log("/on_track callback message:", callbackResponse.data.message);
            // log the callback response status
        } catch (error) {
            console.error("Error sending /on_track callback:", error.message, error.response?.data);
            // Handle errors during the callback (e.g., logging, retries)
        }
    
        
        return; 
  

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while processing the issue" });
  }
}
