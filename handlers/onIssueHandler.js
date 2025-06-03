import axios from "axios";
import FormData from "form-data"; 
import { v4 as uuidv4 } from 'uuid';  

export default async function onIssueHandler(req, res) {
  console.log("onIssueHandler executed");

  try {
    const issue = req.body?.message?.issue;
    const context = req.body?.context;
    const complainant = issue?.complainant_info;
    const orderDetails = issue?.order_details;
    const item = orderDetails?.items[0]; 
    const description = issue?.description?.short_desc;

    const firstname = complainant?.person?.name?.split(' ')[0] || "";
    const lastname = complainant?.person?.name?.split(' ')[1] || firstname;
    const email = complainant?.contact?.email || "";
    const telephone = complainant?.contact?.phone || "";
    const product = item?.id || "";
    const model = 1;
    const quantity = item?.quantity || 1;
    const return_reason_id = 1;
    const opened = issue?.status === "OPEN" ? 1 : 2;
    const comment = description || "";
    const return_action_id = 1; 
    const return_status_id = 1; 

    // Create a unique issue ID
    const issueId = uuidv4();

    const createdAt = new Date().toISOString();

    const formData = new FormData();
    formData.append("firstname", firstname);
    formData.append("lastname", lastname);
    formData.append("email", email);
    formData.append("telephone", telephone);
    formData.append("product", product);
    formData.append("model", model);
    formData.append("quantity", quantity);
    formData.append("return_reason_id", return_reason_id);
    formData.append("opened", opened);
    formData.append("comment", comment);
    formData.append("return_action_id", return_action_id);
    formData.append("return_status_id", return_status_id);

    const response = await axios.post(
      `${process.env.OPENCART_SITE}/index.php?route=api/allproducts/addReturn`,
      formData
    );

    console.log("Return Add Response:", response.data);

    const onIssueCallback = {
      context: {
        ...context,
        action: "on_issue",
        timestamp: new Date().toISOString(),
        bpp_id: context?.bpp_id,
        bpp_uri: context?.bpp_uri,
      },
      message: {
        issue: {
          id: issueId,
          category: issue.category || "return",
          sub_category: issue.sub_category || "damaged",
          issue_actions: issue.issue_actions || [],
          time: {
            created_at: createdAt
          },
          description: {
            short_desc: comment,
            long_desc: issue.description?.long_desc || ""
          },
          issue_source: issue.issue_source || "buyer-app",
          issue_type: issue.issue_type || "complaint",
          status: "OPEN",
          order_details: {
            id: orderDetails.id,
            state: orderDetails.state,
            items: orderDetails.items,
            fulfillments: orderDetails.fulfillments,
            provider: orderDetails.provider
          },
          resolutions: [
            {
              resolution_type: "refund",
              status: "pending",
              updated_at: createdAt
            }
          ],
          resolution_status: "pending",
          expected_response_time: {
            duration: "PT24H" // 24 hours
          },
          expected_resolution_time: {
            duration: "PT48H" // 48 hours
          }
        }
      }
    };

    const callbackUrl = `${context.bap_uri}/on_issue`;
    console.log("Sending full /on_issue response to:", callbackUrl);

    try {
      const callbackResponse = await axios.post(callbackUrl, onIssueCallback, {
        headers: { "Content-Type": "application/json" }
      });
      console.log("Successfully sent /on_issue callback:", callbackResponse.status);
    } catch (callbackErr) {
      console.error("Error sending /on_issue callback:", callbackErr.message, callbackErr.response?.data);
    }

    res.status(200).json({ success: true, issue_id: issueId });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while processing the issue" });
  }
}
